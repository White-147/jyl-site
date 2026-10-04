import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import docsData from '../data/docs.json'
import projectsData from '../data/projects.json'
import type { DocsManifest, DocPage, DocAction } from '../data/types'
import { DOCS_FETCH_BASE, docsHref } from '../data/docs'
import Lightbox from './Lightbox'

const manifest = docsData as DocsManifest
const SECTIONS = manifest.sections
const PAGES = manifest.pages

/**
 * 锚点落点与顶栏之间再留的呼吸间隙（px）。
 * 手机端 = 顶栏 64 + 文档区吸顶条 53 + 16 = 133；桌面端 = 顶栏 64 + 横栏 48 + 16 = 128。
 * 两个值都由 `--docs-anchor-offset` 表达，见下面 syncAnchorOffset 的注释。
 */
const ANCHOR_GAP = 16

/* ============================ 左栏导航树 ============================ */

/**
 * 左栏导航节点。
 *
 * ⚠️ **两种节点都能有 `children`、也都能"有内容"**（2026-09 用户定向的统一交互）：
 *   · `group`：本身**不是页**（源里的中间层标题，如 `2.创建蓝图`）；
 *   · `page`：本身**是一个页**（如 `各父类讲解`、`3. 主工具栏`）。
 *
 * 而"**既是页、下面又挂着子节**"的标题（`各父类讲解` 下面挂着 `Actor`）统一成
 * **一个带 `self` 的 `group` 节点** —— 左栏里只出现一次（早先是页/分组各建一个 → 重复条目）。
 *
 * 交互（用户口径）：
 *   · 点左边三角 → 展开 / 收起；
 *   · 点标题文字 → 有内容（`self`）进自己那一页，没有就进**最近的有内容的下属页**（`firstPage`）。
 */
type NavNode = {
  kind: 'page' | 'group'
  key: string
  title: string
  /** 标题文字点进去的目标页（分组没内容时 = 最近的有内容的下属页） */
  firstPage: DocPage
  children: NavNode[]
  /** 这一节**自己**也是一个页时放这里（带 `self` 的 group = 既是页又是分组） */
  self?: DocPage
  /** 兼容旧字段：等价于 `Boolean(self)` 或 `kind === 'page'` */
  linkable?: boolean
  page?: DocPage
}

/**
 * 把平铺的页列表还原成「源 → 分组 → 页」的树。
 *
 * 分组来自每页的 `ancestors`（构建期记下的祖先标题链）。这样左栏看到的是**文档自己的目录结构**，
 * 而不是"按篇幅切出来的页" —— 后者单看标题会觉得乱（用户原话）。
 *
 * 两条规则：
 *   1. **单子页分组拍平**：分组下只有一个页、且没有子分组时，把这一页提上来单独成行
 *      （「2.创建蓝图」这种只挂一节的分组，多一层缩进只会让左栏更长更碎）。
 *   2. 分组本身可点，指向它的第一页 —— 分组的引言段就在那一页的正文里。
 */
/** 取一棵导航树里的**第一个有内容的页**（一级目录项点击时跳它） */
function firstPageOf(nodes: NavNode[]): DocPage | undefined {
  for (const n of nodes) {
    if (n.self) return n.self
    const hit = firstPageOf(n.children)
    if (hit) return hit
  }
  return undefined
}

/** 数一棵导航树里有多少个"页"（一级目录列表的页数用它） */
function countPages(nodes: NavNode[]): number {
  return nodes.reduce((n, x) => n + (x.self ? 1 : 0) + countPages(x.children), 0)
}

function buildNav(pages: DocPage[], chapter: string): NavNode[] {
  const root: NavNode[] = []

  /**
   * ⚠️⚠️ **一个标题只能有一个节点**（用户实测报出的"重复条目"根因）。
   *
   * 早先的写法有两条路各建一个节点：
   *   · 轮到某页自己 → push 一个 `page` 节点；
   *   · 别的页的 `ancestors` 里出现它 → 又建一个 `group` 节点。
   * 于是 `各父类讲解`、`3. 主工具栏`、`5.大纲视图`、`内容侧滑菜单` 这些
   * **既是页、又是别的页的祖先**的标题，在左栏里**出现两遍**
   * （一遍 `<a>` 13.5px medium，一遍 `<button>` 13px semibold）—— 用户直接贴了两段 DOM 佐证。
   *
   * 现在改成"**查找或创建**，并在创建页节点时**把已有的同名分组认领过来**"：
   * `各父类讲解` 先（由 `Actor` 的 ancestors）建成 group，等它自己那一页轮到时就
   * 把 page 放进**同一个** group 节点里 → 只剩一个条目。
   */
  const findChild = (bucket: NavNode[], title: string): NavNode | undefined =>
    bucket.find((n) => n.title === title)

  /** 把 group 节点升级为"页节点"（它自己也有内容）：补上 page / linkable / self */
  const attachPage = (g: NavNode, page: DocPage) => {
    g.firstPage = page
    g.self = page
  }

  /** 取"最近的有内容的下属页"：分组本身没内容时，点标题跳这里 */
  const firstPageIn = (nodes: NavNode[]): DocPage | undefined => {
    for (const n of nodes) {
      if (n.self) return n.self
      if (n.kind === 'page') return n.page
      const hit = firstPageIn(n.children)
      if (hit) return hit
    }
    return undefined
  }

  for (const page of pages) {
    let bucket = root
    for (const anc of page.ancestors) {
      let n = findChild(bucket, anc)
      if (!n) {
        n = { kind: 'group', key: `g:${chapter} / ${anc}`, title: anc, firstPage: page, children: [] }
        bucket.push(n)
      }
      bucket = n.children
    }
    /** 自己也是一个页：若这一层已因"当祖先用"建了分组，就把它**升级**成页节点（只留一个条目） */
    const mine = findChild(bucket, page.title)
    if (mine && mine.kind === 'group') {
      attachPage(mine, page)
    } else if (!mine) {
      bucket.push({
        kind: 'page',
        key: `${page.section}/${page.id}`,
        title: page.title,
        firstPage: page,
        page,
        self: page,
        children: [],
      })
    }
  }

  /* 兜底：给所有"节点自己没内容"的分组补一个跳转目标（最近的有内容的下属页） */
  const fillTargets = (nodes: NavNode[]) => {
    for (const n of nodes) {
      fillTargets(n.children)
      if (n.kind === 'group' && !n.self) {
        n.firstPage = firstPageIn(n.children) ?? n.firstPage
      }
    }
  }
  fillTargets(root)

  const flatten = (nodes: NavNode[]): NavNode[] => {
    const out: NavNode[] = []
    for (const n of nodes) {
      n.children = flatten(n.children)
      out.push(n)
    }
    return out
  }
  return flatten(root)
}

/**
 * 分区首页的封面与补充文案（用户 2026-09 定向提供的素材）。
 *
 * ⚠️ 只在"**URL 没有页 id**"时显示（刚点分区 / 点了返回行），**不进左栏**：
 *    用户口径「默认页不用在左栏体现…不需要单独的导航点」。
 * 封面文件在 `public/docs/covers/`，由桌面素材裁切转 webp 得到：
 *   · `ue-theory.webp`  ← header-image.png（1920×335 官方横幅，转 webp 1600 宽，11KB）
 *   · `ue-combat.webp`  ← 闯关游戏封面.png（1334×877，裁成 16:9 横幅，104KB）
 */
const SECTION_LANDING: Record<string, { cover: string; variant: 'banner' | 'emblem'; extra?: string }> = {
  thesis: {
    cover: 'docs/covers/thesis-emblem.webp',
    /* 论文这张是**校徽**（183×180 方形），铺满整列会糊 → 走 emblem 版式：居中、限宽、白底圆角 */
    variant: 'emblem',
    extra:
      '摘要、绪论、系统需求分析、总体架构与数据库设计、推荐算法与前后端实现、系统测试 —— 完整一篇，按章节顺序读即可。',
  },
  theory: {
    cover: 'docs/covers/ue-theory.webp',
    variant: 'banner',
    extra:
      '环境准备、菜单与视口、蓝图类与父类体系、增强输入与角色移动 …… 按顺序读下来，就能把引擎最常用的那部分走一遍。',
  },
  combat: {
    /* ⚠️ 用户定向：UE 实战封面**与 UE 理论保持一致** → 直接用同一张 UE5 官方横幅 */
    cover: 'docs/covers/ue-combat.webp',
    variant: 'banner',
    extra: '从新建项目、导入素材，到角色移动、跳跃与动画 —— 一个能跑起来的闯关小游戏。',
  },
}

/** 折叠状态存 localStorage：刷新后还保持收起的样子 */
const COLLAPSE_KEY = 'docs.nav.collapsed'
const PRELOAD_COUNT = 3
/** 给运行时 preload 插的 link 打个标记，换页时好清掉（避免越积越多） */
const PRELOAD_ATTR = 'data-doc-img-preload'

/**
 * 把文档页前几张配图提前 **preload** 出去（2026-10 第二十轮）。
 *
 * 为什么需要：文档正文是**运行时 fetch** 的，图要等「bundle → fetch HTML → React 注入」
 * 之后才被浏览器发现并开始下载 —— 这段时间是**串行**的。主站首图则在 `index.html` 里
 * 就有 `<link rel="preload" as="image">`，与正文**并行**下载。用户在限速下的体感差异
 * （"主图比文档区先出来"）主要来自这里。
 *
 * 做法：从刚取回的 HTML 里解析出前 N 张 `data-doc-image` 的 `src`，插入 preload link。
 * 调用点在 `setHtml` **之前**，让下载与 React 渲染重叠，而不是排在渲染之后。
 *
 * ⚠️ 只 preload 前几张：文档页最多 11 张图，全 preload 会跟正文/字体抢带宽，反而更慢。
 * ⚠️ `src` 是页面内的**相对路径**（`docs/ue5/images/…`），页面地址是 `/…/#/docs/…`，
 *    所以相对路径直接可用 —— 与 `<img src>` 的解析口径一致，不要另外拼 base，否则会双重前缀
 *    （这个坑在配图那轮踩过：拼成 `docs/ue5/images/../../../../public/…` 全线 404）。
 */
function preloadDocImages(html: string, count: number) {
  if (typeof document === 'undefined') return
  // 换页时先清掉上一页插的，避免 <head> 里越积越多
  for (const el of document.querySelectorAll(`link[${PRELOAD_ATTR}]`)) el.remove()
  const srcs: string[] = []
  const re = /<img\b[^>]*\bdata-doc-image\b[^>]*\bsrc="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && srcs.length < count) srcs.push(m[1])
  for (const src of srcs) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    link.setAttribute(PRELOAD_ATTR, '')
    document.head.appendChild(link)
  }
}

function loadCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}
function saveCollapsed(next: Set<string>) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]))
  } catch {
    /* 隐私模式下写不了，忽略 */
  }
}

/** 折叠箭头 */
const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

/** 悬停提示：把「本页实际装了哪几节」说清楚（装箱会把相邻小节并成一页） */
function pageTip(p: DocPage): string {
  const head = p.ancestors.length ? `${p.ancestors.join(' › ')} › ${p.title}` : p.title
  const rest = p.labels.slice(1)
  return rest.length ? `${head}\n还包含：${rest.join('、')}` : head
}

interface Props {
  section?: string
  pageId?: string
  anchor?: string
}

export default function Docs({ section: routeSection, pageId, anchor }: Props) {
  const section = SECTIONS.find((s) => s.id === routeSection) ?? SECTIONS[0]

  /**
   * 本分区的页。
   *
   * ⚠️ **不要按 `order` 重排。** `order` 是「页在**源内**的序号」，跨源比较没有意义 ——
   *    按它排会把 5 个源的"第 01 页"排到一起，左栏于是变成
   *    `蓝图编程基础01 / 蓝图基础01 / 虚幻引擎总览01 …` 这样的乱序（实测踩过）。
   *    清单本身就是按「源顺序 → 源内页序」产出的，直接沿用。
   */
  const pages = useMemo(() => PAGES.filter((p) => p.section === section.id), [section.id])

  /** 左栏树。分区里只有一个源时不显示源分组头（毕业论文就是一整篇，书名当分组头只是重复）。 */
  const navForest = useMemo(() => {
    const bySource: { chapter: string; items: DocPage[] }[] = []
    for (const p of pages) {
      const last = bySource[bySource.length - 1]
      if (last && last.chapter === p.chapter) last.items.push(p)
      else bySource.push({ chapter: p.chapter, items: [p] })
    }
    return bySource.map((s) => ({
      chapter: s.chapter,
      key: `src:${s.chapter}`,
      nodes: buildNav(s.items, s.chapter),
    }))
  }, [pages])

  /**
   * 当前页。⚠️ **没有页 id 时就是"没有当前页"**（`undefined`），**不再回落到第一页**。
   *
   * 用户 2026-09 定向：「去掉 current 逻辑，仅在中间正文区去显示图片和文本」。
   * 早先是 `?? pages[0]` —— 没选文档时**偷偷选中第一篇**，于是：
   *   · 刚点分区 / 点了「返回 UE 理论」时，中间那列直接显示某篇文章，而不是分区封面；
   *   · 左栏也没法停在"一级文档列表"（因为总有 current）。
   * 去掉回落之后，"没有当前页"成为一个**真实状态**：
   *   左栏自然退回一级（`navDepth` 初值本就是 `pageId ? 2 : 1`），正文区显示分区封面 + 文本。
   */
  const current = pages.find((p) => p.id === pageId)

  /**
   * 折叠状态。**默认全部展开**（用户明确要求），折叠只是一个可选动作。
   *
   * ⚠️ 这里**没有**"当前页所在分组强制展开"的渲染期守卫（2026-09 改）：
   *    加过一版 `isOpen = activeKeys.has(key) || !collapsed.has(key)`，后果是
   *    **当前页所在的那个源/分组点了没反应** —— 15 个折叠按钮里有 1 个是死的，
   *    用户直接反馈"有的折叠生效，有的不生效"。守卫本身要解决的问题（收起后当前页在左栏消失）
   *    改由下面那个 effect 解决：**路由切进被收起的分组时自动把它展开**。
   *    这样点击必定生效，切页也一定能看到自己在哪。
   */
  /** 左栏当前停在哪一级（1 = 文档列表，2 = 某篇的目录）。单篇分区恒为 2（不建一级） */
  /**
   * 左栏层级：1 = 文档列表，2 = 该篇目录。
   *
   * ⚠️ 初值按**当前是否在某一页上**决定：直接打开某个页的链接（深链、刷新、从别处跳进来）时
   *    应该直接显示**该篇目录**，而不是挡在"文档列表"上（否则用户看到 URL 是某一页、
   *    左栏却是一级列表，还得再点一次才知道自己在哪）。
   */
  const [navDepth, setNavDepth] = useState<1 | 2>(pageId ? 2 : 1)

  /**
   * ⚠️ **切分区时把左栏退回一级**（2026-09 修，用户截图暴露的问题）。
   *
   * `navDepth` 早先只在挂载时算一次初值，之后一直保持 —— 于是从一篇点进二级后，
   * 再点左上角的分区（UE 理论 / UE 实战 / 毕业论文），左栏**仍然显示上一篇的目录**，
   * 与实际分区对不上（看起来像"内容串了/重复了"）。
   */
  const sectionRef = useRef(section.id)
  useEffect(() => {
    if (sectionRef.current === section.id) return
    sectionRef.current = section.id
    setNavDepth(pageId ? 2 : 1)
  }, [section.id, pageId])
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)
  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      saveCollapsed(next)
      return next
    })
  }, [])

  /**
   * 当前页所在的每一级祖先 key。
   *
   * ⚠️⚠️ **祖先 key 必须带 `g:` 前缀** —— 这是 `buildNav` 里建分组节点时的口径
   *    （`g:${chapter} / ${ancestors.join(' / ')}`，见本文件 `buildNav`）。
   *
   * 踩过的坑（2026-09 用户反馈"跳过去了却找不到自己在哪"）：这里原来写成
   *    `` `${current.chapter} / ${...}` ``（**没有 `g:`**），于是 localStorage 里存的是
   *    `g:蓝图编程基础 / 一、新建游戏模板基础和角色`，而这里算出来的是
   *    `蓝图编程基础 / 一、新建游戏模板基础和角色` —— 两者永不相等，
   *    下面那个"跳转时自动展开"的 effect **彻底失效**（实测：深链进入被收起的分组，
   *    祖先仍 `aria-expanded=false`、左栏也没有当前页高亮）。
   */
  const currentKeys = useMemo(() => {
    if (!current) return [] as string[]
    const keys = [`src:${current.chapter}`]
    current.ancestors.forEach((_, i) => {
      keys.push(`g:${current.chapter} / ${current.ancestors.slice(0, i + 1).join(' / ')}`)
    })
    return keys
  }, [current])

  /**
   * 切页时把当前页路径上的收起状态清掉 —— 跳过去了就一定要看得见自己在哪。
   *
   * ⚠️⚠️ **依赖必须带上页 id，不能只用 `revealKey`**（2026-09 用户实测："跳过去了却找不到自己在哪"）。
   *
   * 为什么：`revealKey` 只随**路径**变化，而"同一路径"有两种到达方式 ——
   *   ① 点进某一篇（路径从空变成该页路径）：那一刻 `collapsed` 往往是空的，早退无所谓；
   *   ② **先把这一组收起来、再跳到该路径上的某一页**：此时 `revealKey` 与①**完全相同** →
   *      effect 不重跑 → 收起状态永远清不掉，祖先一直收着、当前页也不高亮。
   *   实测证据：`currentKeys` = `["src:蓝图编程基础","g:蓝图编程基础 / 一、新建游戏模板基础和角色"]`
   *   与 localStorage 里的 key 完全一致，但 `collapsed` 就是没被清
   *   （`anc0Expanded=false`、左栏 `[aria-current]` 数量为 0）。
   */
  const revealKey = currentKeys.join('|')
  useEffect(() => {
    if (!currentKeys.length) return
    setCollapsed((prev) => {
      if (!currentKeys.some((k) => prev.has(k))) return prev
      const next = new Set(prev)
      for (const k of currentKeys) next.delete(k)
      saveCollapsed(next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, current?.id])

  /**
   * 渲染期兜底：**当前页所在路径一律视为展开**。
   *
   * ⚠️ 与上面那个 effect 是**两道保险**，不是重复：effect 负责"切页时清状态"，
   *    这里保证"无论 state 怎样，当前页路径都可见"，覆盖 effect 还来不及跑的那一帧。
   * ⚠️ 这不违反当年那条教训（"不要写成 `activeKeys.has(key) || !collapsed.has(key)`"）：
   *    那条的问题是让**所有**未收起的分组都算 active，导致当前页所在分组点不动；
   *    这里只对 `currentKeys`（当前页路径上的那几级）强制展开，点其它分组一切正常。
   */
  const forcedOpen = useMemo(() => new Set(currentKeys), [currentKeys])
  const isOpen = (key: string) => forcedOpen.has(key) || !collapsed.has(key)

  /* ⚠️ 面包屑**不再走 `current.crumbs`**：它是 `pack` 的 trail 产物，而按序号切页
     （`splitByNumberedHeading`）走的是另一条路径 —— 实测所有页 `crumbs` 都是空数组。
     现在用 `current.ancestors`（构建期写好的完整祖先链）在页头那段渲染里拼。 */

  /**
   * 配套项目（论文 ↔ BookRecommendation）。
   *
   * 关系写在 `build-docs.mjs` 的 SECTIONS 里（`relatedProject`），**项目名从 `projects.json` 取** ——
   * 不在组件里写死名字，改名时只改数据。
   */
  const relatedProject = useMemo(() => {
    const id = section.relatedProject
    return id ? (projectsData.projects.find((p) => p.id === id) ?? null) : null
  }, [section.relatedProject])

  /**
   * 页头「动作行」的内容 —— **每个区恒一个动作**（用户 2026-10 定向，见 `DocAction` 的注释）。
   *
   * | 区 | 动作 | 来源 |
   * | --- | --- | --- |
   * | 毕业论文 | 「配套项目 →」 | `SECTIONS[].relatedProject`（构建期声明，双向互链的另一半在 `projects.docs_url`） |
   * | UE 理论 | 「原件下载 PDF」 | `SOURCES[].download`（**只给已定稿的四篇**；`unreal5-notes` 后续还要更新，不配） |
   * | UE 实战 | 「配套项目 →」 | 同上，将来接 Demo 预览 |
   *
   * ⚠️ 优先级写死在这里、**不在数据里判断 id**：原件下载 > 配套项目 > 前置。
   *    之所以"整区只有一个"是数据事实（`relatedProject` 只配在 thesis/combat，`download` 只配在 theory 四篇），
   *    不是靠这里的顺序凑出来的 —— 万一将来同区两样都配了，顺序决定谁在前面，不会叠成两行。
   */
  const pageActions = useMemo<DocAction[]>(() => {
    const out: DocAction[] = []
    if (current?.download) {
      const { href, mb } = current.download
      out.push({
        key: 'download',
        label: '原件下载 PDF',
        /* ⚠️⚠️ 必须补上 `DOCS_FETCH_BASE`（= `docs`）这一段。
               manifest 里的 `href` 是**相对 public/** 的（`theory/source/pdf/x.pdf`），
               PDF 落在 `public/docs/...` 下 —— 只拼 `BASE_URL` 会请求
               `/theory/source/pdf/x.pdf`，被静态服务器的 index.html 兜底成 HTML，
               表现是"点了下载得到一张网页"（实测踩过：返回 200 + text/html）。
               与正文 HTML 的取法同源（那边是 `docs/` + manifest 的 `html` 字段）。 */
        href: `${import.meta.env.BASE_URL}${DOCS_FETCH_BASE}/${href}`,
        /* ⚠️ 体积与完整名都放 title，不进可见文案（用户 2026-10 定向）：
              "原件下载 PDF" 本身 111px，再加 "· 8.2 MB" 会挤到动作行放不下第二项。 */
        title: `${current.docName ?? current.chapter} · PDF 原件 · 约 ${mb} MB · 点击下载`,
        external: false,
        download: true,
      })
    }
    if (relatedProject) {
      out.push({
        key: 'project',
        label: '配套项目 →',
        href: `#project-${relatedProject.id}`,
        /* ⚠️ 项目名（BookRecommendation）只进 title：实测这一个链接宽 186.5px，
              占 390px 行宽的一半，会把面包屑那一行挤爆（用户 2026-10 定向收进 title）。 */
        title: `${relatedProject.name}：项目简介、技术栈与演示入口`,
        external: false,
      })
    }
    return out
  }, [current, relatedProject])

  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [activeAnchor, setActiveAnchor] = useState('')
  // 手机端的目录抽屉。它必须**吸顶**：之前那个「目录」按钮放在文档区顶部，
  // 实测滚到 1200px 后按钮 top = -1112（完全出视口），展开的目录块又是 overflow: visible，
  // 于是下滑之后再也没有任何跳转手段。现在入口吸顶在顶栏下方、抽屉自带滚动。
  const [navOpen, setNavOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  /** 手机端吸顶条与桌面端横栏：锚点落点要按它们的**实际高度**让位（见 syncAnchorOffset） */
  const stickyBarRef = useRef<HTMLDivElement>(null)
  const subBarRef = useRef<HTMLDivElement>(null)
  // ⚠️ 文档区的滚动容器（md 及以上）。**不是 window** ——
  // 布局是「固定外壳 + 内部滚动」：左栏与右栏钉在视口里不动，只有中间正文列滚动。
  const scrollRef = useRef<HTMLDivElement>(null)
  const railPanelRef = useRef<HTMLDivElement>(null)

  /**
   * 左栏「一级 ⇄ 二级」的**丝滑平移**（用户第十五轮的原始诉求："还可以做一个丝滑平移特效"）。
   *
   * 一级（文档列表）与二级（某篇目录）是**两块交替挂载**的面板，所以这里不做"两块同时在位、
   * 整体平移"的轨道式动画（那需要把两级塞进同一个 grid、代价大且没必要），而是让**新出现的那块**
   * 从**它来的方向**滑进来：
   *   · 进二级（点进一篇）→ 新面板从**右侧**滑入（前进）
   *   · 回一级（点「返回 UE 理论」）→ 新面板从**左侧**滑入（后退）
   * 这样方向感与"下钻 / 返回"一致，观感上就是一次平移。
   *
   * ⚠️ 用 WAAPI 而不是 CSS 过渡：React 同一次提交里挂载新面板时，CSS 过渡拿不到"旧值快照"，
   *    位置会**一帧到位**（当年踩过，注释在 index.css 的 `.docs-rail-panel` 上）。
   * ⚠️ 依赖里必须带 `section.id`：**切分区**时 `navDepth` 可能不变（都是 1），
   *    但面板内容整块换了，也该滑一次。
   * ⚠️ `prefers-reduced-motion` 下**完全不做**（不是缩短）：与全站口径一致。
   */
  useEffect(() => {
    const el = railPanelRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dir = navDepth === 2 ? 1 : -1
    el.animate(
      [
        { transform: `translateX(${dir * 22}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
  }, [navDepth, section.id])

  /**
   * 锚点落点的**唯一来源**。
   *
   * 量「顶栏 + 文档区横栏 + 手机端吸顶条 + 间隙」写进 `--docs-anchor-offset`，三处一起消费：
   *   1. 本文件 scrollToAnchor 的落点计算
   *   2. index.css 里 `.doc-h* { scroll-margin-top }`（原生锚点跳转用）
   *   3. 本文件大纲高亮的判定线
   *
   * ⚠️ 为什么必须合并成一处（2026-09 修）：以前这三个数是各写各的 ——
   *    JS 落点 96、CSS `scroll-margin-top` 96、高亮线 `HEADER_OFFSET 88+8=96`。
   *    而手机端顶栏下面还压着一条 53px 的「目录与大纲」吸顶条（占 64..117），
   *    96 的落点正好藏在它**后面** —— 用户反馈"点了目录跳不准"，实际是标题被那条横条盖住了。
   * ⚠️ 横栏在手机端是 `hidden`、吸顶条在桌面端是 `hidden`，两者的 offsetHeight 自然为 0，
   *    所以**同一个公式两端都对**，不需要分支。
   */
  const syncAnchorOffset = useCallback(() => {
    const headerH = document.querySelector('header.site-bar')?.getBoundingClientRect().height ?? 64
    const subH = subBarRef.current?.offsetHeight ?? 0
    const stickyH = stickyBarRef.current?.offsetHeight ?? 0
    document.documentElement.style.setProperty(
      '--docs-anchor-offset',
      `${Math.round(headerH + subH + stickyH + ANCHOR_GAP)}px`,
    )
  }, [])

  useLayoutEffect(() => {
    syncAnchorOffset()
    const ro = new ResizeObserver(syncAnchorOffset)
    if (stickyBarRef.current) ro.observe(stickyBarRef.current)
    if (subBarRef.current) ro.observe(subBarRef.current)
    window.addEventListener('resize', syncAnchorOffset)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncAnchorOffset)
      document.documentElement.style.removeProperty('--docs-anchor-offset')
    }
  }, [syncAnchorOffset])

  /** 手机端口径：顶栏 + 吸顶条 + 间隙 */
  const anchorOffset = () =>
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--docs-anchor-offset')) || 96

  /**
   * 大纲高亮的判定线（视口坐标）。
   * 桌面端是「正文滚动容器的顶边 + 它的 scroll-padding-top」，手机端是上面那个变量 ——
   * 直接量，不手算，改布局不会再漂。
   */
  const anchorLineTop = useCallback(() => {
    const scroller = scrollRef.current
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
      const pad = Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0
      return scroller.getBoundingClientRect().top + pad
    }
    return anchorOffset()
  }, [])

  // 拉取文档 HTML（构建产物，静态资源；失败时给出明确回退而不是空白页）
  useEffect(() => {
    if (!current || current.status !== 'ready' || !current.html) {
      setHtml('')
      setLoading(false)
      setFailed(false)
      return
    }
    let alive = true
    setLoading(true)
    setFailed(false)
    fetch(`${DOCS_FETCH_BASE}/${current.html}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      })
      .then((t) => {
        if (!alive) return
        /**
         * ⚠️ **拿到 HTML 就立刻 preload 首屏那几张配图**（2026-10 第二十轮）。
         *
         * 为什么需要：文档正文是**运行时 fetch** 的，图片要等
         * 「bundle → fetch HTML → React 注入」之后才由浏览器发现并开始下载 ——
         * 也就是这段时间是**串行**的。主站首图则在 `index.html` 里就有
         * `<link rel="preload" as="image">`，与正文**并行**下载。
         * 用户在限速下的体感差异（"主站更快"）主要来自这里。
         *
         * 做法：解析出正文里前几张 `data-doc-image` 的 `src`，插 `<link rel=preload as=image>`。
         * 放在 `setHtml` **之前**，让下载与 React 的渲染重叠起来，而不是排在后面。
         * 只 preload 前 `PRELOAD_COUNT` 张：再多就会与正文/字体抢带宽（文档页最多 11 张图）。
         */
        preloadDocImages(t, PRELOAD_COUNT)
        setHtml(t)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [current?.id, current?.status, current?.html])

  /**
   * 首屏加载页（`index.html` 的 `#boot`）的信号 —— 文档区版本。
   *
   * ⚠️ 不能像主站那样在挂载后就发：文档正文是**运行时 fetch** 的（上面那个 effect），
   *    挂载完只意味着外壳在了。这里等加载态结束（`loading` 落回 false）再发，
   *    于是"加载页撤走"与"正文出现"是同一时刻。
   * ⚠️ 放两帧，保证发信号那一刻正文**已经画出来**。
   * ⚠️ 失败态也发 —— 出错时更要让用户看见错误，而不是被加载页挡着。
   */
  useEffect(() => {
    if (loading) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [loading])

  // 切页 / 切分区：回到顶部（否则会把上一篇的滚动位置带过来）。
  // ⚠️ 桌面端要滚的是**正文列容器**（scrollRef），手机端才是页面 —— 两处都归零最省心。
  // ⚠️ 用 'instant'：`behavior:'auto'` 会套用 html 上的 `scroll-behavior: smooth`，
  //    切页时看得到"旧页面自己滚回顶部"的动画。
  // ⚠️ 必须是 **useLayoutEffect**（2026-09 第八轮从 useEffect 改过来）：
  //    useEffect 跑在浏览器绘制之后，切分区时会先画出一帧"旧滚动位置的新页面"
  //    （窗口与容器都还停在上一篇的位置），随后才跳回顶部。在 Safari 上那一帧里
  //    横栏正好压在顶栏下面，看起来就像"横栏被吞了"。改到绘制前调用即可消除这个中间态。
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setNavOpen(false)
    setActiveAnchor('')
  }, [current?.id])

  // 手机端抽屉：锁背景滚动 + ESC 关闭 + 打开时焦点移入（与 Lightbox 同一套无障碍口径）
  useEffect(() => {
    if (!navOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    drawerRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  /**
   * 滚到某个标题。
   *
   * ⚠️ 三条实测教训，改这里之前先读完：
   *
   * 1. **不要用 `scrollIntoView()`。** 它会滚动**所有可滚祖先，包括窗口** ——
   *    而 `html.docs-shell { overflow: clip }` 只挡用户滚动，**挡不住程序化滚动**。
   *    实测后果（1672×930）：窗口 scrollY 被滚到 77、滚动容器顶从 64 变成 −13、
   *    左栏跟着上移 77px，容器上下各 77px 钻到视口外，那段内容既看不到也点不到。
   *
   * 2. **不要手算 `getBoundingClientRect()` 找容器内位置。** 正文里有 `sticky` 小节标题，测值会失真。
   *
   * 3. **不要用裸 `offsetTop`。** 它只给"相对 offsetParent"的偏移。
   *    正解：让滚动容器与正文列 `position: relative`，使 offsetParent 链收敛到容器，
   *    再沿链把 `offsetTop` 累加。实测 8 个采样点偏差全部 ≤0.5px，窗口 scrollY 保持 0。
   */
  const scrollToAnchor = useCallback((id: string) => {
    // 只有页首锚点才回落到 doc-top：别的 id 找不到就什么都不做。
    // ⚠️ 以前是「任何 id 找不到都滚到 doc-top」，于是跨文档路由链接被误当成锚点时，
    //    表现是"原地滚到页首"—— 既不换页也不报错，把 bug 藏了很久。
    const el = document.getElementById(id) ?? (id === 'doc-top' ? document.getElementById('doc-top') : null)
    if (!el) return
    const scroller = scrollRef.current
    const canScroll = scroller && scroller.scrollHeight > scroller.clientHeight + 1

    if (canScroll && scroller) {
      let y = 0
      let node: HTMLElement | null = el
      while (node && node !== scroller) {
        y += node.offsetTop || 0
        node = node.offsetParent as HTMLElement | null
      }
      // 链没收敛到容器（将来有人去掉 relative 就会这样）：退回 rect 差值，至少不算错得太离谱
      if (node !== scroller) {
        y = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
      }
      const pad = Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0
      const max = scroller.scrollHeight - scroller.clientHeight
      scroller.scrollTop = Math.max(0, Math.min(y - pad, max))
      return
    }
    // 手机端：页面在滚。落点留白由 --docs-anchor-offset 给（顶栏 + 吸顶条 + 间隙）
    //
    // ⚠️ 必须是 `'instant'`，不能写 `'auto'`。
    //    `scroll-behavior` 不是继承属性，它写在 `html` 上（index.css，为主站的平滑锚点），
    //    而 `behavior: 'auto'` 的语义是"用计算出来的 scroll-behavior" —— 于是**手机端这条路径
    //    一直在做平滑动画**，桌面端却因为滚的是 `#docs-scroll` 容器而是瞬时的。
    //    实测表现：点最远的那个大纲项，450ms 后还没滚完，落点差 7–11px 且每次不一样。
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - anchorOffset(),
      behavior: 'instant' as ScrollBehavior,
    })
  }, [])

  /** 大纲 / 目录点击：滚到标题 + 写回地址栏（左右两栏与正文锚点共用一套行为） */
  const goToAnchor = useCallback(
    (id: string) => {
      if (!current) return
      history.replaceState(null, '', docsHref(current.section, current.id, id))
      setActiveAnchor(id)
      scrollToAnchor(id)
    },
    [current, scrollToAnchor],
  )

  /**
   * 抽屉里的点击：**先解锁背景滚动、下一帧再滚**。
   *
   * ⚠️ 抽屉打开时 `body.style.overflow = 'hidden'`，而它是在 effect 的清理函数里恢复的 ——
   *    以前直接在 onClick 里 `goToAnchor()`，那一刻 body 还锁着，`window.scrollTo` 可能被夹住，
   *    表现就是"在抽屉里点目录，跳过去位置不对/没动"。现在同步解锁 + 等一帧再滚。
   */
  const goToAnchorFromDrawer = useCallback(
    (id: string) => {
      document.body.style.overflow = ''
      setNavOpen(false)
      requestAnimationFrame(() => goToAnchor(id))
    },
    [goToAnchor],
  )

  // 大纲高亮（rAF 节流，读的是 h2/h3 的视口位置）
  useEffect(() => {
    if (loading || !html) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const line = anchorLineTop()
        const headings = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id]') ?? [])
        let best = ''
        for (const el of headings) {
          if (el.getBoundingClientRect().top <= line + 6) best = el.id
          else break
        }
        setActiveAnchor(best)
      })
    }
    update()
    // 两个滚动源都要听：桌面端是正文列容器（scrollRef），手机端是页面（window）
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      scroller?.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update)
    }
  }, [loading, html, current?.id, anchorLineTop])

  // 深链：`?s=<heading id>` → 滚到该标题。放在 scrollToAnchor 定义**之后**（否则 TS2448）。
  useEffect(() => {
    if (!anchor || loading || !html) return
    const t = window.setTimeout(() => scrollToAnchor(anchor), 60)
    return () => window.clearTimeout(t)
  }, [anchor, loading, html, scrollToAnchor])

  /**
   * 内容区点击委托：图片开灯箱、**纯页内锚点**走滚动 + 写回 hash。
   *
   * ⚠️ 选择器必须排除 `#/…`。以前写的是 `a[href^="#"]`，把所有井号链接都接管了 ——
   *    而正文里的文档互链是 `#/docs/<分区>/<页>` 这种**路由链接**，
   *    于是被当成页内锚点、`preventDefault` 掉，再拿 `/docs/theory/…` 去 `getElementById`，
   *    找不到就回落到 `doc-top`：**既不换页也不报错，只是原地滚了一下**。
   *    实测全站 9 条跨文档互链全部失效（用户反馈"文档内部跳转还是有问题"）。
   *    `#/…` 交给浏览器即可 —— 它改 hash，useDocsRoute 的 hashchange 会接上。
   */
  const onContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      const img = target.closest<HTMLImageElement>('img[data-doc-image]')
      if (img) {
        setLightbox({ src: img.getAttribute('src') ?? '', alt: img.alt || '文档配图' })
        return
      }
      const link = target.closest<HTMLAnchorElement>('a[href^="#"]:not([href^="#/"])')
      if (!link) return
      e.preventDefault()
      goToAnchor(decodeURIComponent(link.getAttribute('href')!.slice(1)))
    },
    [goToAnchor],
  )

  /** 分区切换（切到目标分区的第一篇） */
  const openSection = useCallback((id: string) => {
    window.location.hash = docsHref(id)
    setNavOpen(false)
  }, [])

  /** 分区切换：手机抽屉（竖排）与桌面横栏（横排）共用同一套数据与行为 */
  const sectionList = (
    <div role="tablist" aria-label="文档分区" className="flex flex-col gap-0.5">
      {SECTIONS.map((s) => {
        const active = s.id === section.id
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => openSection(s.id)}
            /* ⚠️ `data-scroll-lit="off"`：左栏分区列表排除在触屏的「滚动照亮」之外
               （2026-09 第十五轮，理由见下面页树那条：同一栏、同一个滚动容器、同一套选中语义）。 */
            data-scroll-lit="off"
            /* 选中态 = 主站筛选胶囊那一套（`glass-lit-on` 出光 + `glass-chip-on` 出底与字色）。
               2026-09 第九轮用户要求：「文档区不管是顶部分区还是左侧选中，都对齐主站的玻璃样式」。
               **不要再退回 `bg-brand-700 text-white`** —— 那是实底块，与全站玻璃语言相悖。 */
            className={`flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
              active
                ? 'glass-lit glass-lit-on glass-chip-on font-semibold'
                : 'glass-lit text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-200'
            }`}
          >
            <span className="min-w-0 truncate">{s.label}</span>
            <span className={`font-mono text-[10px] tabular-nums ${active ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>
              {s.ready || '—'}
            </span>
          </button>
        )
      })}
    </div>
  )

  const sectionTabs = (
    <div role="tablist" aria-label="文档分区" className="flex items-center gap-1">
      {SECTIONS.map((s) => {
        const active = s.id === section.id
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => openSection(s.id)}
            /* ⚠️ `data-scroll-lit="off"`：顶部分区 tab 排除在触屏的「滚动照亮」之外
               （2026-09 第十五轮）。它是"当前分区"的指示器，与左栏那两处同一套语义；
               被照亮时带出的琥珀描边会被读成"切到这个分区了"。 */
            data-scroll-lit="off"
            /* 同上：顶部分区 tab 的选中态走主站那套玻璃（见 `sectionList` 的注释）。
               ⚠️ 未选中**只留 `.glass-lit`**（交互层，悬停才出光），不要挂 `.glass-chip` ——
                  那是"静置材质"（半透明底 + 发丝边），挂上就等于给每一项默认铺一块玻璃，
                  用户 2026-09 明确否掉了那种做法（"默认不需要每个都有玻璃样式，只要悬停有就可以了"），
                  而且那圈 1px 发丝边在左栏里还会与相邻行贴边、看起来像被裁掉。 */
            className={`inline-flex items-baseline gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'glass-lit glass-lit-on glass-chip-on font-semibold'
                : 'glass-lit text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-200'
            }`}
          >
            {s.label}
            <span className={`font-mono text-[10px] tabular-nums ${active ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>
              {s.ready || '—'}
            </span>
          </button>
        )
      })}
    </div>
  )

  /**
   * 横栏左端的返回入口（桌面横栏 + 手机顶部共用）。
   *
   * 用户 2026-09 定稿：「二级目录的时候，把横栏的返回作品集换成返回 UE 理论或者 UE 实战，
   * 这样更符合逻辑，因为现在这一版的（左栏）返回 UE 理论不好看也不好改，
   * 直接改横栏的方便又快捷」。
   *
   *   · **一级（文档列表）**：`返回作品集` → `#top`（作品集首页）
   *   · **二级（某篇目录）**：`返回 UE 理论 / UE 实战` → `#/docs/<分区>`（分区封面页，
   *     同时左栏退回一级 —— 因为清掉页 id 后 `current` 为 undefined，`navDepth` 回到 1）
   *
   * ⚠️ 左栏里那条「返回 UE 理论」已随之删除（用户：「不好看也不好改」）。
   */
  const subLevel = navForest.length > 1 && navDepth === 2
  const backLink = (
    <a
      href={subLevel ? docsHref(section.id) : '#top'}
      onClick={
        subLevel
          ? (e) => {
              /**
               * ⚠️⚠️ **必须 `preventDefault()`**（用户实测：「点一次返回UE理论，直接连续执行了
               * 返回UE理论和返回作品集，每次一点就回到主站了」）。
               *
               * 原因：这个 `<a>` 同时有 `href="#top"` 和下面的 onClick，两者目标不同 ——
               * 一次点击会跑**两个导航**：onClick 先把 hash 设成 `#/docs/<分区>`，
               * 而**同一个位置的元素随即变成一级的「返回作品集」链接**（`href="#top"`），
               * 浏览器接着又按 `#top` 跳了一次 → 直接回主站。
               * 拦掉默认跳转、只走 onClick，导航就只发生一次（与左栏文档项同一做法）。
               */
              e.preventDefault()
              window.location.hash = docsHref(section.id)
              setNavDepth(1)
            }
          : undefined
      }
      title={subLevel ? `返回${section.label}` : '返回作品集'}
      aria-label={subLevel ? `返回${section.label}` : '返回作品集'}
      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {subLevel ? `返回${section.label}` : '返回作品集'}
    </a>
  )

  /**
   * 导航树的渲染（源 → 分组 → 页 → 当前页的小节）。左栏与手机抽屉共用同一段 JSX。
   *
   * ⚠️ **三级的主次是刻意倒过来的**（用户 2026-09 反馈「文件内的标题比文件本身还显眼」）：
   *      源（文件名） 13px semibold 深色 + 上分隔线   ← 最显眼，它是**分隔符**
   *      页（分割块） 13.5px medium 中灰             ← 可点的主体
   *      分组（文档内标题）12px regular 浅灰          ← 最弱，只用来定位
   *    以前的顺序正好相反（源 11px 浅灰、分组 14px medium），于是文档内标题压过了文件名。
   *
   * ⚠️ 页不再带 `01 / 02` 序号：那是「页在源内的序号」，和标题自带的章节号
   *    （`03 2.新建项目和项目模板`）是两套编号，叠在一起很乱。顺序由分组和上下位置表达。
   */
  /**
   * 左栏树渲染（**统一交互**，2026-09 用户定向）。
   *
   * 每个节点都是同一套结构：`[三角?] 标题文字`。
   *   · **三角**（只有带子节点的才有）→ 点击 = **展开 / 收起**；
   *   · **标题文字** → 有内容（`n.self`）进**自己那一页**，没有就进**最近的有内容的下属页**
   *     （`n.firstPage`，构建期已经兜底填好）。
   *
   * 样式分成三档（用户要求"一眼能分清是哪一层"）：
   *   · 分组头（本身不是页，如 `2.创建蓝图`）：`13px semibold` 深色 —— 最重，它是**分隔符**；
   *   · 既是页又有下级的（如 `各父类讲解`、`3. 主工具栏`）：`13.5px semibold` + 三角 —— 中间档；
   *   · 普通页：`13.5px medium` + 选中胶囊 —— 可点的主体。
   *
   * ⚠️ 早先"分组头"和"有正文的页"都渲染成 `13px semibold`，用户反馈
   *    「没有 H3 下属文本的 H2 标签，走的和 H3 同类文本，不容易区分」—— 所以拆成三档。
   */
  const renderNodes = (nodes: NavNode[], depth: number) =>
    nodes.map((n) => {
      const open = isOpen(n.key)
      const ready = (n.self ?? n.firstPage).status === 'ready'
      const target = n.self ?? n.firstPage
      const isCurrent = n.self != null && n.self.id === current?.id
      /**
       * **只保留两档字重**（用户 2026-09 定向：长文档里层次要一眼分得清，但不能破坏整体性）。
       *
       *   · **可展开的**（H2 分组头 + 有下级的页）→ `13.5px semibold` 深色；
       *   · **叶子页** → `13.5px medium` 中灰。
       *
       * ⚠️ 早先是**四档**混用（`13px semibold` / `13.5px semibold` / `13.5px medium`），
       *    在「界面基础操作」这种 31 个 H3 的长文档里，`13.5 semibold` 与 `13.5 medium`
       *    只差一个字重、缩进又参差 → 用户反馈"结构层次不清晰"。
       *    现在**层级只靠缩进 + 左侧引导线**表达（见 `renderNodes` 的嵌套 `<ul>`），
       *    字重只区分"能不能展开"这一件事，全篇只有两种字号。
       */
      const label = n.children.length
        ? 'text-[13.5px] font-semibold text-slate-700 dark:text-slate-100'
        : 'text-[13.5px] font-medium text-slate-500 dark:text-slate-400'
      return (
        /* ⚠️ `list-none` + 内联 `listStyle`：左栏树用 `<ul>/<li>` 承载，而浏览器默认会给 `<li>` 画**圆点**
           （实测某些环境下第一个 `<li>` 的计算值是 `list-style-type: disc`，圆点就出现在最左侧、
           看起来像"额外的层级标记"，用户反馈"破坏了整体性"）。双保险锁死。 */
        <li key={n.key} className="list-none" style={{ listStyle: 'none' }}>
          <div className="flex items-start gap-0.5" style={{ paddingLeft: `${depth * 8 + 2}px` }}>
            {/* 三角位**恒定宽度**：叶子行也占同样的位置 → 所有标题左对齐（不再出现"有的行有标记、
                有的没有"的参差，用户反馈过"看起来像额外层级"）。 */}
            {n.children.length > 0 ? (
              <button
                type="button"
                onClick={() => toggle(n.key)}
                aria-expanded={open}
                aria-label={`${open ? '收起' : '展开'} ${n.title}`}
                className="mt-1 flex h-[22px] w-5 shrink-0 self-start items-center justify-center rounded text-slate-300 transition-colors hover:text-brand-700 dark:text-slate-600 dark:hover:text-brand-200"
              >
                <Chevron open={open} />
              </button>
            ) : (
              <span className="mt-1 h-[22px] w-5 shrink-0 self-start" aria-hidden="true" />
            )}
            {/**
              * ⚠️⚠️ **二级胶囊要有内衬，但不能用负外边距去"补"**（用户 2026-09 两轮反馈的最终口径）。
              *
              * 起因：一级文档按钮是 `rounded-lg px-2.5 py-2`（**左内边距 10px**），
              * 而这两行原来只有 `py-[5px] pr-2`（**没有 pl**）→ 二级文字**紧贴胶囊左边缘**
              * （胶囊左缘 = 文字左缘 = 72），选中时那圈胶囊紧箍着第一个字，观感与一级不是一套。
              *
              * ⚠️⚠️ **试过 `-ml-2.5`（负外边距把胶囊左移、想让文字不动）—— 观感更差，已回退**：
              *    负边距让胶囊背景**伸进箭头的格子**（箭头 50~70、胶囊变成 50~334，重叠 8px），
              *    用户反馈"左侧展开箭头产生了拥挤"。箭头本来坐在干净的栏底上，胶囊的玻璃底一垫过去就显挤。
              *    再试过连箭头一起左移（`-ms-2.5`）→ 箭头跑到 x=38、逼近栏边，更糟。
              *
              * **最终：只加 `pl-1.5`（6px 内衬），不加任何负外边距。**
              *    硬约束（这组数就是设计本身，改之前先看懂）：
              *      `文字 x = 胶囊左缘 + 内衬`，而胶囊左缘**最小只能是 72**
              *      （再往左就压到箭头 50~70 那一格）→ 内衬要多少，文字就必然右移多少。
              *    所以 6px 是个折中：文字 72 → **78**（只右移 6px），箭头↔胶囊仍是原来的 **2px**（不拥挤）。
              *    若改成 `pl-2.5`（10px，与一级完全同内衬）：文字会到 82；若要文字回到 72，内衬只能是 0。
              *
              * ⚠️ 二级的缩进量（行容器的 `depth * 8 + 2`）**用户明确要求不动**。
              * ⚠️ "待导入"占位行（下一个分支）**同步改**，否则以后导入内容时那一行会突然平移。
              */}
            {ready ? (
              <a
                href={docsHref(target.section, target.id)}
                aria-current={isCurrent ? 'page' : undefined}
                title={pageTip(target)}
                onClick={() => setNavOpen(false)}
                /* ⚠️ `data-scroll-lit="off"`：左栏页树排除在触屏的「滚动照亮」之外（2026-09 第十五轮）：
                   ① 它躺在自己的滚动容器里，照亮由视口中线判定 → 在该容器里等于"永远亮着最上面那一项"；
                   ② 当前页的选中态本来就常驻点亮，再叠一层照亮会分不清"我读到这里"和"我停在这一页"。 */
                data-scroll-lit="off"
                className={`flex min-w-0 flex-1 items-baseline rounded-lg py-[5px] pl-1.5 pr-2 leading-snug transition-colors ${label} ${
                  isCurrent ? 'glass-lit glass-lit-on glass-chip-on' : 'glass-lit hover:text-brand-700 dark:hover:text-brand-200'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{n.title}</span>
              </a>
            ) : (
              <span
                title="该篇尚未导入本站"
                className={`flex min-w-0 flex-1 items-baseline gap-2 rounded-lg py-[5px] pl-1.5 pr-2 text-slate-400 dark:text-slate-500`}
              >
                <span className="min-w-0 flex-1 truncate">{n.title}</span>
                <span className="shrink-0 rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600">
                  待导入
                </span>
              </span>
            )}
          </div>

          {/* 当前页的小节内联在它下面（拆分后页标题只取得下"第一个小节"，同页的其他小节否则在左栏看不到）。
              ⚠️ `xl:hidden`：xl 及以上右栏已有「本篇大纲」，两处同时列同一份清单是重复。 */}
          {isCurrent && n.self && n.self.toc.length > 1 && (
            <ul className="list-none xl:hidden">
              {n.self.toc.slice(1).map((t) => (
                <li key={t.id} className="list-none" style={{ listStyle: 'none' }}>
                  <a
                    href={docsHref(n.self!.section, n.self!.id, t.id)}
                    title={t.label}
                    onClick={(e) => {
                      e.preventDefault()
                      if (navOpen) goToAnchorFromDrawer(t.id)
                      else goToAnchor(t.id)
                    }}
                    className={`flex items-baseline rounded-md py-[3px] pr-2 text-[11.5px] leading-snug transition-colors ${
                      activeAnchor === t.id
                        ? 'font-semibold text-brand-700 dark:text-brand-200'
                        : 'text-slate-400 hover:text-brand-700 dark:text-slate-500 dark:hover:text-brand-200'
                    }`}
                    style={{ paddingLeft: `${depth * 8 + 30 + (t.level - 2) * 9}px` }}
                  >
                    <span className="truncate">{t.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {open && n.children.length > 0 && (
            /* 嵌套层级用一条**很淡的引导线**表达（`border-s`），这是"不破坏整体性"的分层做法：
               层级只靠「缩进 + 引导线」，不用额外字号/颜色/标记去堆叠。
               ⚠️ `ms-2.5` 让线落在三角位的左缘，缩进 8px/层。 */
            <ul className="docs-rail-guide ms-[13px] list-none border-s border-slate-200/70 dark:border-slate-700/50">
              {renderNodes(n.children, depth + 1)}
            </ul>
          )}
        </li>
      )
    })

  /**
   * 左栏导航（**两级下钻**，2026-09 用户定向）。
   *
   * 一级 = **文档列表**（只列文档，不让左栏被几十页挤满）；
   * 二级 = 点进某篇之后，显示**这一篇的目录**（H2 分节头 + H3 页），顶部一行是**返回行**。
   *
   * ⚠️ 三级样式是**刻意分开**的（用户逐条确认）：
   *   · 一级目录项（文档名）：`13.5px medium` + 选中胶囊 —— 与"可点的页"同款；
   *   · 二级里的 H2 分节头：`13px semibold` 深色 + 上分隔线 —— 与原来的"源分组标题"同款，
   *     且**可点 = 展开/收缩**（不跳转：正文都在 H3 页里）；
   *   · 二级里的 H3 页：页样式（`13.5px medium`）+ 选中胶囊。
   *
   * ⚠️ 单篇分区（毕业论文）**不建一级**：那种分区只有一篇，"一级"这一层是多余的。
   */
  const docList = navForest.length > 1
  const activeDocKey = `src:${current?.chapter ?? ''}`
  const pageTree = docList ? (
    navDepth === 1 ? (
      /* ---------- 一级：文档列表 ---------- */
      <ul className="list-none space-y-0.5">
        {navForest.map((f) => {
          const active = f.key === activeDocKey
          return (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => {
                  /* ⚠️ 必须**跳路由**，不能只切层级：早先只写 setNavDepth(2)，
                     `current` 一直停在上一篇的第一页 → 点哪篇都显示「虚幻引擎总览」（实测 bug）。 */
                  const first = firstPageOf(f.nodes)
                  if (first) window.location.hash = docsHref(section.id, first.id)
                  setNavDepth(2)
                }}
                aria-current={active ? 'true' : undefined}
                data-scroll-lit="off"
                className={`flex w-full items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] leading-snug transition-colors ${
                  active
                    ? 'glass-lit glass-lit-on glass-chip-on font-semibold'
                    : 'glass-lit font-medium text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-200'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{f.chapter}</span>
                <span className="dot-num shrink-0 text-[11px]">{countPages(f.nodes)} 页</span>
              </button>
            </li>
          )
        })}
      </ul>
    ) : (
      /* ---------- 二级：这一篇的目录 ---------- */
      <div>
        {/* ⚠️ 左栏里那条「返回 UE 理论」已**移除**（用户 2026-09 定稿）：
            「现在这一版的返回 UE 理论不好看也不好改，直接改横栏的方便又快捷」——
            返回入口统一放到**横栏左端**（`backLink`，二级时自动显示「返回 UE 理论 / UE 实战」），
            那里位置固定、不用滚、视觉上也更统一。 */}
        {navForest
          .filter((f) => f.key === activeDocKey)
          .map((f) => (
            <div key={f.key}>{renderNodes(f.nodes, 0)}</div>
          ))}
      </div>
    )
  ) : (
    /* 单篇分区：直接显示目录，不建一级、不显示返回行 */
    <div>{navForest.map((f) => <div key={f.key}>{renderNodes(f.nodes, 0)}</div>)}</div>
  )

  /* 右栏已删（用户 2026-09）：这份 outline 不再被任何地方使用，连同整段一起移除 */
  /* ⚠️ 原「本篇大纲」列表（`outline`）已随右栏一起删除（用户 2026-09 定稿）。 */

  const emptySection = !current || current.status !== 'ready'

  return (
    // ⚠️ 宽度口径（2026-09 第三轮，改之前先看 MAINTAINING.md 的硬约束表）
    //    外层 100rem（1600px）；左栏 15rem、右栏 14rem；间距 gap-6。
    //    左栏从 13rem 加到 15rem 是因为改成了「源 → 分组 → 页」三层树，最深四级缩进，
    //    13rem 下标题只能显示约 8 个字。
    // ⚠️ 高度口径（踩过三次，别再改错）：
    //    外框 = `md:h-dvh` → 里面依次是「顶栏占位 h-16」与「文档区横栏 h-[--docs-subbar-h]」
    //    两条 shrink-0 的占位 → 剩下的空间由滚动容器的 `md:flex-1` 拿。
    //    **绝对不要再写 `calc(100dvh - var(--site-bar-h))`**：占位条已经补过一次，
    //    再减一次就是重复计算，整块内容会上移、空白全落到最底部。
    //    **两栏的高度必须显式写**（`h-[calc(100dvh-顶栏-横栏)]`）：只写 flex-1 时它们会撑到
    //    内容高度，内部滚动不触发（实测过 20481px）；而写死一个与真实可用高度不符的值
    //    正是「左栏最后一行被切掉」的成因（旧值比真实可用高度多算了 64px）。
    <div className="mx-auto flex max-w-[104rem] flex-col px-4 pb-24 pt-6 sm:px-6 md:h-dvh md:pb-0 md:pt-0">
      {/* ⚠️ 第十轮：**顶栏占位那条 h-16 已删**。原来它把「横栏 + 三栏」推到 y=64 之下，
          于是滚动容器的内容永远从 y=112 开始 —— 横栏背后什么都没有，折射也就无事可做
          （实测开/关 `backdrop-filter` 的可见差异只有 0.08%）。
          现在改成：滚动容器**从视口顶（y=0）起算**，用 `md:mt-[var(--site-bar-h)]` 把它的
          可视顶边压到顶栏下沿，横栏在容器内部 sticky 到同一位置。
          于是正文会从横栏**下面穿过**，文字能透过去、折射也真的在弯内容。 */}

      {/**
        * ⚠️ **横栏的折射层已删除**（用户 2026-09 定稿：让横栏"统一采用中间那种不透明/饱和底"）。
        *    原因见 `index.css` 里那段长注释 —— 简言之：折射层是满宽 fixed 层，
        *    而右侧滚动滑块有 15px 压在它范围内，导致**滑块顶部被扭曲**（还带着原生冷蓝灰的箭头按钮）。
        */}

      {/* 手机端：返回入口与篇数（桌面端这两样在横栏里）。品牌名不再可点，所以这里必须给返回入口。 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 md:hidden">
        {backLink}
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {section.label} · {section.ready} 篇
        </span>
      </div>

      {/* 手机端吸顶条：目录入口。`sticky top-16` = 正好贴在常驻顶栏下沿。
          ⚠️ 高度直接决定锚点落点（`--docs-anchor-offset` 会量它）。
          实测 = 「py-2(16) + 内部 h-9 按钮(36) + 下边框(1) + 上边框(1)」= 54px。
          ⚠️ 2026-09 第十二轮：材质由**硬编码旧冷值**（`rgb(250_251_251/0.92)` /
              `rgb(18_20_21/0.9)`）改为**引用画布变量 + glass-panel 的底**。
              原来那两个值在暖调转向后成了页面里唯一的冷色块，而且没有跟全局顶栏同一套玻璃语言
              （用户第 4 条要的就是"手机端和 PC 端一样对齐"）。
          ⚠️⚠️ 2026-10：**左端那个「← 返回作品集」图标按钮已删除**（用户定向）。
              理由（用户原话）：「它在二级目录也会直接返回主站，这个和我想要的操作逻辑不一致」——
              那个按钮的 href 写死 `#top`（回作品集首页），而上面那一行的返回入口在二级时是
              「返回 UE 理论」（回分区封面），两个"返回"目标不同、并排出现就是打架。
              现在手机端与 PC 端口径一致：**返回入口只有一个**（上面那一行 / PC 的横栏左端）。
              代价：手机端少了一个"一步回作品集"的入口，用户已接受（「多点一下的事情」）。
          ⚠️ 删掉它**不影响 54px 高度**（高度由 h-9 的目录按钮 + py-2 决定），
              所以 `--docs-anchor-offset`（实测 134px）与 `docs:anchors` 的断言都不用动。
          ⚠️ 那三个 `border-x-0 border-t-0` 已删：它们在 `@layer utilities` 里，
              **打不过**本文件无层的 `.glass-panel { border: 1px solid … }`，从来没生效过
              （实测四条边都是 1px）。要真的只留底边，得走 `.glass-panel-sides-off` 那类普通类。 */}
      <div
        ref={stickyBarRef}
        data-docs-stickybar
        className="glass-panel sticky top-16 z-30 -mx-4 mb-4 flex items-center gap-2 rounded-none rounded-b-xl px-4 py-2 sm:-mx-6 sm:px-6 md:hidden"
      >
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-expanded={navOpen}
          aria-controls="docs-drawer"
          className="glass-chip inline-flex h-9 flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          目录与大纲
          <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
            {section.short} {String(current?.order ?? 1).padStart(2, '0')}
          </span>
        </button>
      </div>

      {/* 手机端抽屉：独占一层浮层，自带滚动，分「分区 + 目录」与「本篇大纲」两块 */}
      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" aria-hidden="true" onClick={() => setNavOpen(false)} />
          <div
            id="docs-drawer"
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="文档分区、目录与大纲"
            className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto overscroll-contain rounded-t-2xl border-t border-slate-200/70 bg-[var(--color-slate-50)] px-4 pb-8 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] outline-none md:hidden dark:border-slate-700/70 dark:bg-[var(--color-slate-900)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">文档分区</p>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="关闭目录"
                className="glass-lit flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sectionList}
            <p className="mt-5 border-t border-slate-200 pt-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:text-slate-500">
              {section.label}目录
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{section.blurb}</p>
            <div className="mt-2.5">{pageTree}</div>
          </div>
        </>
      )}

      <div
        ref={scrollRef}
        id="docs-scroll"
        className="docs-scroll relative md:mt-[var(--site-bar-h)] md:grid md:h-[calc(100dvh-var(--site-bar-h))] md:min-h-0 md:grid-cols-[var(--docs-rail-w)_minmax(0,1fr)] md:gap-6 md:overflow-y-auto md:scroll-pt-4 md:pr-2"
      >
        {/* 文档区横栏（**在滚动容器内部**，2026-09 第十轮从外面搬进来）。

            ⚠️ 为什么必须搬进来（这是"横栏没有透明 + 折射效果"的真正原因）：
              原来横栏是滚动容器的**兄弟**，纵向布局是「顶栏占位 64 + 横栏 48 + 滚动容器」——
              于是滚动容器的内容**永远从 y=112 开始**，物理上不可能从横栏背后经过。
              实测：横栏背后 `elementFromPoint(700, 70/80/…/130)` 全部返回 `null`，
              开/关 `backdrop-filter` 的可见差异只有 0.08%（顶栏同法是 80.95%）。
              搬进来之后正文就会从横栏**下面穿过**，折射才真的有事可做，
              文字也能像顶栏那样"透过去"。用户的判断是对的。

            ⚠️ 两个配套件，少一个都会破：
              ① 容器上的 `md:mt-[var(--site-bar-h)]` + `md:h-[calc(100dvh-var(--site-bar-h))]`：
                 让滚动容器的**可视顶边**落在顶栏下沿（y=64），横栏于是正好停在原来那个视觉位置，
                 **视觉零位移**；高度显式写死，不再依赖 `flex-1`（踩过：flex 分配会让它多出几十像素，
                 横栏被顶到 y=80）；
              ② 紧随其后的 `docs-subbar-spacer`（同高）：给横栏一个"在文档流里位于 sticky 阈值
                 之下"的自然位置 —— 没有它，sticky 元件一开始就在 `top` 之上，会跟着内容滚走。

            ⚠️ `.docs-subbar`（`position: sticky; top: 0` —— 参照系是**滚动容器顶边**，见 index.css 的注释）
               同时还是第八轮那道防「iPad 上横栏被顶栏吞掉」的防线，`scripts/check-anchors.mjs` 有断言守着，
               改这里的类名等于同时撤掉两道保障。
            ⚠️ 它在 grid 里必须 `md:col-span-full`（跨越三栏），否则只会占第一列的位置。 */}
        <div
          ref={subBarRef}
          className="docs-subbar hidden h-[var(--docs-subbar-h)] shrink-0 items-center gap-3 md:col-span-full md:flex"
        >
          {backLink}
          <span aria-hidden="true" className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          {sectionTabs}
        </div>
        {/* ⚠️ spacer 放在横栏**之后**，并用同值的负上外边距把自己在文档流里抵消掉。
            作用有两个，缺一个都会破：
              ① 给横栏一个"位于 sticky 阈值**之下**"的流内位置 —— 这是 sticky 被钉住的前提。
                 横栏在流里的自然位置 = 容器顶边 + 48px（被下面这个 spacer 顶开），
                 所以它一有机会就被钉在容器顶边（y=64），首屏与滚动**零位移**；
              ② 补上横栏占掉的那 48px，让正文起始位置与"横栏还在容器外面"时逐像素一致（实测 112）。
            反过来把 spacer 放前面（或干脆不给横栏留流内位置）会退化成
            「横栏停在 y=88/136，下面露出一条空白，而且不再吸顶」——两条都实测过。 */}
        <div aria-hidden="true" className="docs-subbar-spacer hidden shrink-0 md:-mt-[var(--docs-subbar-h)] md:col-span-full md:block" />

        {/* 左：页树。
            ⚠️ sticky 必须加在 **aside 自身**上，不要外面套一层 div 再 sticky（踩过两次）：
              套一层时 sticky 认的是父级内容盒，而那个盒子没有可粘的行程，直接跟着滚走。
            ⚠️ 高度：第十轮起用 `md:h-[calc(100dvh-var(--site-bar-h))]`，与滚动容器**同一个算式**。
              原来那条 `calc(100dvh - 顶栏 - 横栏)` 的前提是"横栏在滚动容器**上面**"，
              而横栏现在已经搬进容器里（见上面那段注释），算式会重复减掉一个栏高
               —— `docs:anchors` 的"侧栏底部"断言实测抓到 5 处。
              ⚠️ 也**不能写 `md:h-full`**：grid item 的百分比高度在自动行高里解析不出确定值，
              aside 会拉伸到整行内容高度（实测 3676px），内部滚动彻底失效。
            ⚠️ 内层那个滚动盒必须**显式给横向余量**，而且要**给够**：`overflow-x-visible` 单写是无效的
              （只要另一轴是 auto/scroll，visible 就会被算成 auto，照样裁切），所以只能靠内边距把内容
              推离裁切边。实测：选中胶囊的亮边 + 外发光（`0 0 30px -4px`，等效可见半径约 13px）
              在 8px 余量下会被削掉左/上/下的边缘；16px 仍在临界。
              **第十二轮定稿：横向余量 20px**（`-mx-5 + px-5`，净偏移 0），配合左栏 `--docs-rail-w: 20rem`。
              ⚠️ 用户在这一轮明确：「不能因为文档区去掉外边框就把原来的设计改掉」——
                 所以**改的是这个容器的几何，不是 `.glass-lit` 那圈光**（光的配方是全站共用的）。
              底部再留 `pb-6`（最后一行选中时下边缘同样会被容器底边裁）。
            ⚠️ 嵌套缩进从 10px/级 收到 **8px/级**（配合左栏加宽），给最深的标题留出文本宽度。
            ⚠️ `md:top-[var(--docs-subbar-h)]`（第十轮）：横栏现在是滚动容器的**第一个 grid 行**
              （下面那个 spacer 给它留的位置），它的行高把三栏整体压低了 48px。
              sticky 的 `top` 相对 scrollport 顶边算，所以这里补回那 48px。
            ⚠️ 高度必须与"自然位置 → 容器底"这一段**严格相等**：aside 的自然位置在
              y=160（顶栏 64 + spacer 48 + 横栏 48），只剩 `100dvh - 64 - 48 - 48` 可用。
              高一点就会溢出视口、低一点就浪费下半屏 —— 这条 5 处断言抓到过两次，改高度前先跑断言。 */}
        <aside className="docs-rail hidden md:sticky md:top-[var(--docs-subbar-h)] md:flex md:h-[calc(100dvh-var(--site-bar-h)-var(--docs-subbar-h)-var(--docs-subbar-h))] md:flex-col">
          {/* ⚠️ 横向余量口径（第十二轮定稿，用户原话：「我的想法是直接把左侧边往右侧缩一些就可以，
              整个宽度都已经给你让地方了」）：
              **左 44px / 右 20px 的不对称内边距**（`-mx-5` + `ps-11 pe-5`）。
              为什么左要 44：选中胶囊那圈外发光的等效可见半径约 13–15px，
              之前左右都取 20px，实测左侧仍会在某些渲染下被滚动盒（`overflow-y: auto`
              → 另一轴自动变成 auto）裁到；既然栏宽已经从 15rem 让到 20rem，
              就把左边一次性给足，彻底不留临界。右侧没有视觉元素贴边，20px 足够。
              ⚠️ 净偏移仍为 0：`-mx-5`（-20px）与右内边距 20px 抵消，
                 左内边距的 +24px 由 `--docs-rail-w` 的加宽吸收（文字列因此右移 24px，
                 这正是用户要的"往右侧缩"）。 */}
          <div
            ref={railPanelRef}
            className="docs-rail-panel docs-scroll -mx-5 min-h-0 flex-1 overflow-y-auto pb-6 pe-5 ps-11 pt-6"
          >
            {pageTree}
          </div>
        </aside>

        {/* 中：正文。data-copyable = 只读保护白名单，放开这一整块的选择与复制。
            ⚠️ `md:max-w-[52rem]`（832px）是**内容列的上限**，2026-09 用户定稿：
              正文吃满内容列（不再给 `p` 单独设宽度，避免"段落 672 / 列表 784 / 图片 806"
              三种右边线），而行长靠这个上限兜住 —— 832 − 卡片内边距 64 = 768 → **恒定 48 字/行**。
              ⚠️ 不要再改成"字号跟着视口放大"（试过 `clamp(17px,1.25vw,20px)`，用户否掉：偏大）。
            ⚠️ 第三列（本篇大纲）即使在"标题太少不显示"时也**保留列位**：
              撤掉它会把这 224px 让给正文列，正文一下子涨到 1118px（70 字/行），而且每页宽度还不一样。
            ⚠️ `md:pt-6` 与左右两栏的内层 `pt-6` 一致，三栏首行齐平。
            ⚠️ 底部留白不能省（`md:pb-24`）：滚动容器的 padding-bottom 在内容末尾不可靠。 */}
                {/* ⚠️ 正文上限 940px（≈58 字/行）+ 居中：删掉右栏后"中+右"的宽度全给这一列，
            若占满会到 1088px（≈68 字/行，偏长）。所以限宽并居中，**字号保持 16px 不动**。 */}
        <main className="relative mx-auto w-full min-w-0 md:max-w-[58.75rem] md:pb-24 md:pt-6">
          <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-700">
            {/* ⚠️ 页头**不再显示页面大标题**（2026-09 用户提案）。
                标题已经回到正文里、保持源文件里的原始层级 —— 否则「被抽出来当页头的那一个标题」
                会比同级的兄弟高一级：论文 2.2 页装着 2.2/2.3/2.4 三个平行小节，
                2.2 被提到页头变 h1，2.3、2.4 留在正文是 h2，同级看起来像父子。
                页头现在只回答「我在哪」：页码 + 来源文档 + 面包屑 + 前置 + 配套项目。
                ⚠️ 但页面仍需一个 h1：用 `sr-only`（视觉隐藏、读屏与爬虫可见），
                   否则整页没有一级标题，文档结构不合法。 */}
            <h1 className="sr-only">{current?.displayTitle ?? current?.title ?? section.label}</h1>
            {/**
             * ⚠️⚠️ **页头是「两行」，不是一行 flex-wrap**（2026-10 定稿，用户定向 A1+A2）。
             *
             * 旧结构把四件事塞进同一个 `flex-wrap` 容器：页码、面包屑、动作、前置。
             * 于是**每个新链接都可能把页头撑高一行**（实测：手机上挂一个「原件下载 PDF」
             * 会让页头从 84 → 126.8px，最长的论文页 320px 下到 149px）。用户原话：
             * 「后续的跳转文本会进一步拉长顶部显示的长度」。
             *
             * 现在拆成两行，各自负责自己的溢出：
             *   · 行 1 = 页码 + 面包屑 —— **恒一行**（`<640px` 只留 序号 › 文档名 › 本页标题，
             *            中间的祖先段隐藏、文档名可收缩加省略号）；
             *   · 行 2 = 动作 —— 一区一个，永远放得下，页头高度因此**确定**。
             *
             * ⚠️ 只在 `<640px` 拆行（`max-sm:`）。≥640px 一行放得下，拆了反而多 22.5px
             *    （实测 1440px：39 → 69）。这是这一轮唯一的分端行为，别顺手改成全端。
             *
             * ⚠️ `leading-none` 不能省：外层容器继承正文的 `line-height: 1.85`，
             *    每一行会被撑大 6–12px（实测踩过，量出来"越改越高"就是这个原因）。
             *
             * 完整链仍可从行 1 的 `title` 属性看到（悬停），读屏也读得到（文本节点没删，只是隐藏）。
             */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 leading-none max-sm:flex-col max-sm:items-start max-sm:gap-y-2">
              {(() => {
                /* ⚠️ 用 `ancestors`（构建期写好的**完整祖先链**），**不要用 `crumbs`** ——
                   实测 `crumbs` 恒为空数组（它来自 `pack` 的 trail，而按序号切页走另一条路径），
                   用它的话面包屑会退化成"文档名 › 页标题 › 页标题"（重复两遍，实测踩过）。 */
                const root = current?.docDisplayName ?? current?.docName ?? current?.chapter ?? section.label
                const full = [root, ...(current?.ancestors ?? [])]
                  .filter(Boolean)
                  .filter((c, i, arr) => arr.indexOf(c) === i)
                const pageTitle = current?.displayTitle ?? current?.title
                if (pageTitle && full[full.length - 1] !== pageTitle) full.push(pageTitle)
                /* 窄屏只留「根 + 本页标题」；中间的祖先段由 CSS 隐藏（`max-sm:hidden`），
                   而不是在这里删 —— 这样 ≥640px 一个数据源就够，不用两套链。 */
                const hideFrom = 1
                const hideTo = full.length - 2
                return (
                  <>
                    {/* 行 1 的容器。`max-sm:flex-nowrap` + `min-w-0` 是"A2 恒一行"的关键：
                        不写 nowrap 时它是 flex-wrap，照样会换行（试过，没用）。 */}
                    <span className="contents max-sm:flex max-sm:w-full max-sm:flex-nowrap max-sm:items-baseline max-sm:gap-x-2.5">
                      {current?.order != null && (
                        <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                          {String(current.order).padStart(2, '0')}
                        </span>
                      )}
                      {/**
                       * ⚠️ 用 `Fragment` 而不是再套一层 `<span>`：外层的 `gap` 会和父级的 `gap` 叠加，
                          同一段路径在视觉上间距不一致（实测）。分隔符与文字都当**直接子元素**。
                       */}
                      {full.map((c, i) => {
                        const last = i === full.length - 1
                        const hidden = i >= hideFrom && i <= hideTo
                        return (
                          <Fragment key={`${c}-${i}`}>
                            {i > 0 && (
                              <span
                                aria-hidden="true"
                                className={`shrink-0 text-[11px] text-slate-300 dark:text-slate-600 ${
                                  i - 1 >= hideFrom && i - 1 <= hideTo ? 'max-sm:hidden' : ''
                                }`}
                              >
                                ›
                              </span>
                            )}
                            <span
                              /* `title` 给被省略号截断的那一段留后路（悬停可看全名）；
                                 最后一段是"我在哪"，不截断。 */
                              title={c}
                              className={[
                                last
                                  ? 'text-[12px] font-medium text-slate-600 dark:text-slate-300'
                                  : 'text-[11px] text-slate-400 dark:text-slate-500',
                                hidden ? 'max-sm:hidden' : '',
                                /* 文档名那一段（i === 1）允许收缩并加省略号；其余不缩 */
                                i === hideFrom && hideTo >= hideFrom
                                  ? 'max-sm:min-w-0 max-sm:shrink max-sm:overflow-hidden max-sm:text-ellipsis max-sm:whitespace-nowrap'
                                  : 'shrink-0',
                                i === 0 && hideTo < hideFrom ? 'max-sm:shrink' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              aria-current={last ? 'page' : undefined}
                            >
                              {c}
                            </span>
                          </Fragment>
                        )
                      })}
                    </span>
                    {/* 行 2（动作）。`max-sm` 下独占一行；≥640px 回到行内。 */}
                    {(pageActions.length > 0 || current?.prereq) && (
                      <span className="contents max-sm:flex max-sm:w-full max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5">
                        {pageActions.map((a) => (
                          <a
                            key={a.key}
                            href={a.href}
                            title={a.title}
                            {...(a.download ? { download: '' } : {})}
                            {...(a.external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
                            /**
                             * ⚠️⚠️ 2026-10 用户定向：**从玻璃按钮改回下划线链接**。
                             * 原话：「文档区下载和跳转的采用按钮，比起第一行的文本显得太大太强调了，
                             * 改成带下划线的链接文本吧」。
                             * 旧口径是 `.glass-lit .glass-chip .glass-btn`（与篇尾「下一节」同一套），
                             * 实测 390px 下 98.8×36.8 —— 而它上面那行面包屑只有 11–12px，
                             * 主次确实反了：页头该回答"我在哪"，不是"来点我"。
                             * 现在与同一行的「前置：xxx」用**同一套**链接样式（品牌色 + 下划线）。
                             *
                             * ⚠️ `py-1`（不是只有文字）把触控高度从 ~16px 抬到 ~22px：
                             *    仍变小了（原来是 36.8px），用户已明确接受（「可接受触控目标变小」）。
                             * ⚠️ 不要再补可见的体积文案（如「（8.2 MB）」）：用户定向「不需要补长度」，
                             *    体积与完整名都在 `title` 里。
                             * ⚠️ `whitespace-nowrap` 保留：它是"动作行恒一行"的一部分。
                             */
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1 text-sm font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition-colors hover:text-brand-900 dark:text-brand-200 dark:decoration-brand-500/50 dark:hover:text-brand-100"
                          >
                            {a.key === 'download' && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                              </svg>
                            )}
                            {a.label}
                          </a>
                        ))}
                        {/* 前置：告诉读者"这一篇不是入口"，避免从中间开始读而卡住 */}
                        {current?.prereq && (
                          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                            前置：
                            <a
                              href={docsHref(current.section, current.prereq.id)}
                              className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800 dark:text-brand-200 dark:decoration-brand-500/50"
                            >
                              {current.prereq.title}
                            </a>
                          </span>
                        )}
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
            {/**
             * 窄屏的**完整路径播报**（用户 2026-10 定向：「读屏能听全路径可以加」）。
             *
             * 为什么需要它：`<640px` 时中间的祖先段是 `display:none`（视觉上只留
             * 序号 › 文档名 › 本页标题），而 `display:none` 的元素**不在可访问树里** ——
             * 读屏听不到「5 系统实现 › 5.2 实时推荐系统的实现 › …」这几级，
             * 也就答不出"这是论文的哪一章"。
             *
             * ⚠️ 三件事必须一起成立，少一个都会出问题：
             *   ① `sr-only`（不是 `hidden`）：视觉隐藏但**留在可访问树**里；
             *   ② `<nav aria-label="面包屑">`：读屏把它当导航区，能跳过、不被当成正文句子；
             *   ③ `sm:hidden`：≥640px 面包屑本来就是完整链，这一段必须**不播** ——
             *      否则路径会被念两遍（可见的那一遍 + 这一遍）。
             */}
            {(() => {
              const root = current?.docDisplayName ?? current?.docName ?? current?.chapter ?? section.label
              const pageTitle = current?.displayTitle ?? current?.title
              const crumbPath = [root, ...(current?.ancestors ?? []), pageTitle].filter(Boolean)
              return crumbPath.length > 1 ? (
                <nav aria-label="面包屑" className="sr-only sm:hidden">
                  {crumbPath.join(' › ')}
                </nav>
              ) : null
            })()}
            {/* 副标题（只有论文那一篇有）。
                ⚠️ 窄屏换成 `text-xs` + 紧行距：实测它是全站唯一会折成两行的副标题
                   （「本科毕业设计 · 数据科学与大数据技术 · 2023」在 390px 下折两行 = 40.9px），
                   把这一页的页头从 80.6 顶到 **107.4px** —— 比第二高的页高 27px，
                   而多出来的高度与面包屑、动作都无关，纯粹是这行字。用户 2026-10 定向：
                   「像这种实际看着会很长的都可以单独处理」。≥640px 维持原样。 */}
            {current?.subtitle && (
              <p className="mt-1.5 text-xs leading-snug text-slate-500 sm:mt-2 sm:text-sm sm:leading-normal dark:text-slate-400">
                {current.subtitle}
              </p>
            )}
          </header>

          {emptySection ? (
            /* ⚠️ **分区封面页**（用户 2026-09 定向）。
               它不是一页、不进左栏、不改路由 —— 只是"没有当前页"时**占中间那一列**的内容：
               用户原话「去掉 current 逻辑，仅在中间正文区去显示图片和文本」。
               左栏此时自然停在**一级文档列表**（`navDepth` 初值 = `pageId ? 2 : 1`），
               所以点「返回 UE 理论」= 左栏回一级 + 正文显示这张封面，一步到位。
               没有配封面的分区（如空的 FPS）保留原来的"还没有内容"提示。 */
            SECTION_LANDING[section.id] ? (
              /* ⚠️ `min-h-full` + `justify-center`：展示页内容少，**垂直居中**才不会显得空荡；
                 封面用 `max-h-[38vh] object-contain` **限高**，否则铺满列宽后（约 250px）
                 整块高度超过可视区 → 明明只有一点内容却能上下滚（用户反馈过这个"很奇怪"）。 */
              <div className="mx-auto w-full max-w-3xl">
                {SECTION_LANDING[section.id].variant === 'emblem' ? (
                  /* 校徽：居中、限宽、白底圆角（原图只有 183px，铺满整列会糊） */
                  <figure className="flex justify-center">
                    <img
                      src={`${import.meta.env.BASE_URL}${SECTION_LANDING[section.id].cover}`}
                      alt={`${section.label} 徽标`}
                      className="h-28 w-28 rounded-2xl border border-slate-200/70 bg-white object-contain p-1.5 shadow-sm sm:h-32 sm:w-32 dark:border-slate-700/60"
                      loading="eager"
                    />
                  </figure>
                ) : (
                  <figure className="flex justify-center overflow-hidden rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-700/60">
                    <img
                      src={`${import.meta.env.BASE_URL}${SECTION_LANDING[section.id].cover}`}
                      alt={`${section.label} 封面`}
                      /* 横幅：限高 30vh 保证"整页落在可视区内、不出现滚动"，宽度自适应 */
                      className="mx-auto block h-auto max-h-[30vh] w-auto max-w-full object-contain"
                      loading="eager"
                    />
                  </figure>
                )}
                <h2
                  className={`mt-5 text-2xl font-bold text-slate-800 dark:text-slate-100 ${
                    SECTION_LANDING[section.id].variant === 'emblem' ? 'text-center' : ''
                  }`}
                >
                  {section.label}
                </h2>
                <p
                  className={`mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 ${
                    SECTION_LANDING[section.id].variant === 'emblem' ? 'text-center' : ''
                  }`}
                >
                  {section.blurb}
                </p>
                {SECTION_LANDING[section.id].extra && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {SECTION_LANDING[section.id].extra}
                  </p>
                )}
              </div>
            ) : (
              <div className="glass-card-strong rounded-2xl px-5 py-10 text-center sm:px-8">
                <p className="text-base font-medium text-slate-600 dark:text-slate-300">
                  {section.label}还没有可以阅读的内容
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {section.blurb}。笔记写好后放进 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/{section.id}/source/</code>
                  ，跑一次 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run docs:build</code> 就会出现在这里。
                </p>
              </div>
            )
          ) : (
            <div
              className="doc-content glass-card-strong rounded-2xl px-5 py-6 sm:px-8 sm:py-8"
              data-copyable
              ref={contentRef}
              onClick={onContentClick}
            >
              {loading && <p className="text-sm text-slate-400">正在加载文档…</p>}
              {failed && <p className="text-sm text-slate-500 dark:text-slate-400">文档内容加载失败，请刷新重试。</p>}
              {!loading && !failed && <div dangerouslySetInnerHTML={{ __html: html }} />}
            </div>
          )}

          {!emptySection && (
            <p className="mt-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              本区内容为个人笔记与毕业设计原文；UE 笔记由 Typora 维护，论文由 Word 原稿转出。点击任意配图可放大查看。
            </p>
          )}

          {/* 篇尾导航：读完一篇给"下一篇"（分区内按顺序串） */}
          <nav aria-label="文档导航" className="mt-6 flex flex-wrap items-center gap-3">
            {current?.next && (
              <a
                href={docsHref(current.section, current.next.id)}
                title={current.next.sameDoc ? `下一节：${current.next.title}` : `下一篇：${current.next.title}`}
                /* 动作按钮也对齐主站玻璃（用户 2026-09 第九轮：「下一节按钮也改，整体样式都需要统一」）。
                   与"当前项"的区别只在**底色浓一档**（`--glass-btn-bg`），光效同一套；
                   hover 时升到选中态那一档，于是三档关系是：未选中 → hover → 常驻选中。 */
                className="glass-lit glass-chip glass-btn group inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
              >
                {/* ⚠️ 文案要分开：同一份文档里翻页是「下一节」，跨文档才是「下一篇」。
                    一律写「下一篇」时，在同一份文档里翻页读起来是错的（用户反馈）。 */}
                {current.next.sameDoc ? '下一节' : '下一篇'}：{current.next.title}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </nav>

          {/* 收尾留白（`min-h-[70vh]`）——**这是大纲跳转准确性的前置条件，不要删**。
              任意标题要滚到容器顶，需要 `文档高度 ≥ 该标题位置 + 视口高度`；
              而文档末尾的内容本来只有一两屏，靠后的标题**永远到不了顶** ——
              `scrollTop` 撞到 max 就被夹住，表现就是「点和内容区实际位置不一致，越往下越严重」。
              代价：滚到底时正文下方会有一段空白，这是这类"内部滚动 + 大纲跳转"布局的常规做法。 */}
          {/*
            ⚠️ 这个 70vh 占位块是给**文章页**留高度的（文章短时底部不至于太空），
               但它**不能在展示页渲染** —— 实测：展示页只有封面 + 三行字，
               加上它之后 `MAIN` 高 1123px > 可视 886px → 竟然能上下滚 333px
               （用户反馈"就一点点东西，但是正文部分可以上下拉，这一点就很奇怪"）。
          */}
          {current && <div aria-hidden="true" className="hidden md:block md:min-h-[70vh]" />}
        </main>

        {/* 右栏「本篇大纲」已删除（用户 2026-09 定稿）。
            ⚠️ 为什么能删：实测 157 页里**只有 5 页（3%）**会用上它 ——
               页内小节数分布是 `1:142 页 / 2:4 / 3:6 / 4:1 / 5:3 / 6:1`，
               而显示阈值是 `toc.length > 3`；90% 的页只有页首一个条目。
            腾出来的宽度给了正文（见下面 `main` 的 `max-w-[58.75rem]`），
            ⚠️ 但**没有占满**：正文居中、限宽 940px（≈58 字/行），字号一点没动。 */}
      </div>

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} maxWidthClass="max-w-6xl">
          <p className="text-sm font-medium text-slate-200">{lightbox.alt}</p>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="rounded-lg border border-slate-500 px-3.5 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
          >
            关闭
          </button>
        </Lightbox>
      )}
    </div>
  )
}
