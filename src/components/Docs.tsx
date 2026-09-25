import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import docsData from '../data/docs.json'
import projectsData from '../data/projects.json'
import type { DocsManifest, DocPage } from '../data/types'
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

type NavNode =
  | { kind: 'page'; key: string; page: DocPage }
  | { kind: 'group'; key: string; title: string; firstPage: DocPage; children: NavNode[] }

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
function buildNav(pages: DocPage[], chapter: string): NavNode[] {
  const root: NavNode[] = []
  const stack: { title: string; node: Extract<NavNode, { kind: 'group' }> }[] = []

  for (const page of pages) {
    let i = 0
    while (i < stack.length && i < page.ancestors.length && stack[i].title === page.ancestors[i]) i++
    stack.length = i
    let bucket = i > 0 ? stack[i - 1].node.children : root
    for (let k = i; k < page.ancestors.length; k++) {
      // key 要**全局唯一**（折叠状态存在一个 Set 里），所以带上源名
      const key = `${chapter} / ${page.ancestors.slice(0, k + 1).join(' / ')}`
      const g: Extract<NavNode, { kind: 'group' }> = {
        kind: 'group',
        key,
        title: page.ancestors[k],
        firstPage: page,
        children: [],
      }
      bucket.push(g)
      stack.push({ title: page.ancestors[k], node: g })
      bucket = g.children
    }
    bucket.push({ kind: 'page', key: `${page.section}/${page.id}`, page })
  }

  const flatten = (nodes: NavNode[]): NavNode[] => {
    const out: NavNode[] = []
    for (const n of nodes) {
      if (n.kind !== 'group') {
        out.push(n)
        continue
      }
      n.children = flatten(n.children)
      if (n.children.length === 1 && n.children[0].kind === 'page') out.push(n.children[0])
      else out.push(n)
    }
    return out
  }
  return flatten(root)
}

/** 折叠状态存 localStorage：刷新后还保持收起的样子 */
const COLLAPSE_KEY = 'docs.nav.collapsed'
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
  const showSourceHeaders = navForest.length > 1

  const current = pages.find((p) => p.id === pageId) ?? pages[0]

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

  /** 当前页所在的每一级祖先 key */
  const currentKeys = useMemo(() => {
    if (!current) return [] as string[]
    const keys = [`src:${current.chapter}`]
    current.ancestors.forEach((_, i) => {
      keys.push(`${current.chapter} / ${current.ancestors.slice(0, i + 1).join(' / ')}`)
    })
    return keys
  }, [current])

  /** 切页时把当前页路径上的收起状态清掉 —— 跳过去了就一定要看得见自己在哪 */
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
  }, [revealKey])

  const isOpen = (key: string) => !collapsed.has(key)

  /** 面包屑去重：父级标题与页标题/源标题相同时不重复显示 */
  const crumbs = (current?.crumbs ?? []).filter((c) => c !== current?.title && c !== current?.chapter)

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
        if (alive) setHtml(t)
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

  const backLink = (
    <a
      href="#top"
      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      返回作品集
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
  const renderNodes = (nodes: NavNode[], depth: number) => (
    <ul>
      {nodes.map((n) =>
        n.kind === 'group' ? (
          <li key={n.key}>
            {(() => {
              const open = isOpen(n.key)
              return (
                <>
                  <div className="flex items-start gap-0.5" style={{ paddingLeft: `${depth * 8 + 2}px` }}>
                    <button
                      type="button"
                      onClick={() => toggle(n.key)}
                      aria-expanded={open}
                      aria-label={`${open ? '收起' : '展开'} ${n.title}`}
                      className="flex h-[22px] w-5 shrink-0 items-center justify-center rounded text-slate-300 transition-colors hover:text-brand-700 dark:text-slate-600 dark:hover:text-brand-200"
                    >
                      <Chevron open={open} />
                    </button>
                    <a
                      href={docsHref(section.id, n.firstPage.id)}
                      title={`${n.title}（${n.firstPage.title}）`}
                      onClick={() => setNavOpen(false)}
                      className="flex min-w-0 flex-1 items-baseline rounded-md py-[3px] pr-2 text-[13.5px] font-semibold leading-snug text-slate-500 transition-colors hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
                    >
                      <span className="min-w-0 truncate">{n.title}</span>
                    </a>
                  </div>
                  {open && renderNodes(n.children, depth + 1)}
                </>
              )
            })()}
          </li>
        ) : (
          <li key={n.key}>
            {n.page.status === 'ready' ? (
              <a
                href={docsHref(n.page.section, n.page.id)}
                aria-current={n.page.id === current?.id ? 'page' : undefined}
                title={pageTip(n.page)}
                onClick={() => setNavOpen(false)}
                className={`flex items-baseline rounded-lg py-[5px] pr-2 text-[13.5px] leading-snug transition-colors ${
                  n.page.id === current?.id
                    ? 'glass-lit glass-lit-on glass-chip-on font-semibold'
                    : 'glass-lit font-medium text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-200'
                }`}
                style={{ paddingLeft: `${depth * 8 + 24}px` }}
              >
                <span className="min-w-0 flex-1 truncate">{n.page.title}</span>
              </a>
            ) : (
              <span
                title="该篇尚未导入本站"
                className="flex items-baseline gap-2 rounded-lg py-[5px] pr-2 text-[13.5px] text-slate-400 dark:text-slate-500"
                style={{ paddingLeft: `${depth * 8 + 24}px` }}
              >
                <span className="min-w-0 flex-1 truncate">{n.page.title}</span>
                <span className="shrink-0 rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600">
                  待导入
                </span>
              </span>
            )}

            {/* 当前页的小节内联在它下面 —— 拆分后的页标题只取得下"第一个小节"，
                同页的其他小节（如 5.1.2）否则在左栏完全看不到。
                ⚠️ `xl:hidden`：xl 及以上右栏已经有「本篇大纲」，两处同时列同一份清单是重复。 */}
            {n.page.id === current?.id && n.page.toc.length > 1 && (
              <ul className="xl:hidden">
                {n.page.toc.slice(1).map((t) => (
                  <li key={t.id}>
                    <a
                      href={docsHref(n.page.section, n.page.id, t.id)}
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
          </li>
        ),
      )}
    </ul>
  )

  const pageTree = (
    <div>
      {navForest.map((f, fi) => {
        const open = isOpen(f.key)
        return (
          <div key={f.key} className={fi > 0 ? 'mt-1' : ''}>
            {showSourceHeaders && (
              <div
                className={`flex items-start gap-0.5 pb-0.5 ${
                  fi > 0 ? 'mt-3 border-t border-slate-200 pt-3 dark:border-slate-700' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(f.key)}
                  aria-expanded={open}
                  aria-label={`${open ? '收起' : '展开'} ${f.chapter}`}
                  className="flex h-[22px] w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:text-brand-700 dark:text-slate-500 dark:hover:text-brand-200"
                >
                  <Chevron open={open} />
                </button>
                <p className="min-w-0 flex-1 truncate pr-2 pt-[2px] text-[13px] font-semibold leading-snug text-slate-700 dark:text-slate-200">
                  {f.chapter}
                </p>
              </div>
            )}
            {open && renderNodes(f.nodes, 0)}
          </div>
        )
      })}
    </div>
  )

  /** 当前篇大纲（桌面右栏 + 手机抽屉共用） */
  const outline = current && current.toc.length > 0 && (
    <ul className="space-y-0.5">
      {current.toc.map((t) => {
        const level = t.level
        return (
          <li key={t.id}>
            <a
              href={docsHref(current.section, current.id, t.id)}
              onClick={(e) => {
                e.preventDefault()
                if (navOpen) goToAnchorFromDrawer(t.id)
                else goToAnchor(t.id)
              }}
              title={t.label}
              className={`flex items-baseline py-1 leading-tight transition-colors ${
                level === 1 ? 'text-[12px] font-semibold' : level === 2 ? 'text-[12px]' : 'text-[11px]'
              } ${
                activeAnchor === t.id
                  ? 'font-semibold text-brand-700 dark:text-brand-200'
                  : level === 3
                    ? 'text-slate-400 hover:text-brand-700 dark:text-slate-500 dark:hover:text-brand-200'
                    : 'text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200'
              }`}
              style={{ paddingLeft: `${(level - 1) * 12}px` }}
            >
              <span className="truncate">{t.label}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )

  const emptySection = !current || current.status !== 'ready'

  return (
    // ⚠️ 宽度口径（2026-09 第三轮，改之前先看 docs/联动维护点.md 的硬约束表）
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
    <div className="mx-auto flex max-w-[100rem] flex-col px-4 pb-24 pt-6 sm:px-6 md:h-dvh md:pb-0 md:pt-0">
      {/* ⚠️ 第十轮：**顶栏占位那条 h-16 已删**。原来它把「横栏 + 三栏」推到 y=64 之下，
          于是滚动容器的内容永远从 y=112 开始 —— 横栏背后什么都没有，折射也就无事可做
          （实测开/关 `backdrop-filter` 的可见差异只有 0.08%）。
          现在改成：滚动容器**从视口顶（y=0）起算**，用 `md:mt-[var(--site-bar-h)]` 把它的
          可视顶边压到顶栏下沿，横栏在容器内部 sticky 到同一位置。
          于是正文会从横栏**下面穿过**，文字能透过去、折射也真的在弯内容。 */}

      {/* 横栏已搬进 `#docs-scroll` 内部（见那条注释）；这里只剩它的折射层。 */}
      <div aria-hidden="true" className="docs-subbar-lens-layer">
        <span className="docs-subbar-lens" />
      </div>

      {/* 手机端：返回入口与篇数（桌面端这两样在横栏里）。品牌名不再可点，所以这里必须给返回入口。 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 md:hidden">
        {backLink}
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {section.label} · {section.ready} 篇
        </span>
      </div>

      {/* 手机端吸顶条：返回图标 + 目录入口。`sticky top-16` = 正好贴在常驻顶栏下沿。
          ⚠️ 高度直接决定锚点落点（`--docs-anchor-offset` 会量它）。加了返回图标后
          仍然是「py-2 + h-9 + 1px 边框」= 53px，所以落点不变。
          ⚠️ 2026-09 第十二轮：材质由**硬编码旧冷值**（`rgb(250_251_251/0.92)` /
              `rgb(18_20_21/0.9)`）改为**引用画布变量 + glass-panel 的底**。
              原来那两个值在暖调转向后成了页面里唯一的冷色块，而且没有跟全局顶栏同一套玻璃语言
              （用户第 4 条要的就是"手机端和 PC 端一样对齐"）。
              高度与 `sticky top-16` 都没动 —— 锚点落点的断言盯着这里。 */}
      <div
        ref={stickyBarRef}
        data-docs-stickybar
        className="glass-panel sticky top-16 z-30 -mx-4 mb-4 flex items-center gap-2 rounded-none rounded-b-xl border-x-0 border-t-0 px-4 py-2 sm:-mx-6 sm:px-6 md:hidden"
      >
        <a
          href="#top"
          aria-label="返回作品集"
          title="返回作品集"
          className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </a>
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
        className="docs-scroll relative md:mt-[var(--site-bar-h)] md:grid md:h-[calc(100dvh-var(--site-bar-h))] md:min-h-0 md:grid-cols-[var(--docs-rail-w)_minmax(0,1fr)] md:gap-6 md:overflow-y-auto md:scroll-pt-4 md:pr-2 xl:grid-cols-[var(--docs-rail-w)_minmax(0,1fr)_14rem]"
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
        <aside className="hidden md:sticky md:top-[var(--docs-subbar-h)] md:flex md:h-[calc(100dvh-var(--site-bar-h)-var(--docs-subbar-h)-var(--docs-subbar-h))] md:flex-col">
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
          <div className="docs-scroll -mx-5 min-h-0 flex-1 overflow-y-auto pb-6 pe-5 ps-11 pt-6">{pageTree}</div>
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
        <main className="relative min-w-0 md:max-w-[52rem] md:pb-24 md:pt-6">
          <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-700">
            {/* ⚠️ 页头**不再显示页面大标题**（2026-09 用户提案）。
                标题已经回到正文里、保持源文件里的原始层级 —— 否则「被抽出来当页头的那一个标题」
                会比同级的兄弟高一级：论文 2.2 页装着 2.2/2.3/2.4 三个平行小节，
                2.2 被提到页头变 h1，2.3、2.4 留在正文是 h2，同级看起来像父子。
                页头现在只回答「我在哪」：页码 + 来源文档 + 面包屑 + 前置 + 配套项目。
                ⚠️ 但页面仍需一个 h1：用 `sr-only`（视觉隐藏、读屏与爬虫可见），
                   否则整页没有一级标题，文档结构不合法。 */}
            <h1 className="sr-only">{current?.title ?? section.label}</h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {String(current?.order ?? 1).padStart(2, '0')}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {current?.chapter ?? section.label}
              </span>
              {crumbs.map((c) => (
                <span key={c} className="text-[11px] text-slate-400 dark:text-slate-500">
                  {c}
                </span>
              ))}
              {relatedProject && (
                <a
                  href={`#project-${relatedProject.id}`}
                  title={`${relatedProject.name}：项目简介、技术栈与演示入口`}
                  className="text-[11px] text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800 dark:text-brand-200 dark:decoration-brand-500/50"
                >
                  配套项目：{relatedProject.name} →
                </a>
              )}
              {/* 前置：告诉读者"这一篇不是入口"，避免从中间开始读而卡住 */}
              {current?.prereq && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  前置：
                  <a
                    href={docsHref(current.section, current.prereq.id)}
                    className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800 dark:text-brand-200 dark:decoration-brand-500/50"
                  >
                    {current.prereq.title}
                  </a>
                </span>
              )}
            </div>
            {current?.subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{current.subtitle}</p>}
          </header>

          {emptySection ? (
            <div className="glass-card-strong rounded-2xl px-5 py-10 text-center sm:px-8">
              <p className="text-base font-medium text-slate-600 dark:text-slate-300">
                {section.label}还没有可以阅读的内容
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {section.blurb}。笔记写好后放进 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/{section.id}/source/</code>
                ，跑一次 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run docs:build</code> 就会出现在这里。
              </p>
            </div>
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
            <a
              href={docsHref(section.id)}
              className="glass-lit glass-chip inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {section.label}目录
            </a>
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
          <div aria-hidden="true" className="hidden md:block md:min-h-[70vh]" />
        </main>

        {/* 右：本篇大纲（宽屏常驻；xl 以下由左栏里"当前页的小节"承担）。
            ⚠️ 实际标题 ≤ 2 条时**不渲染面板**（用户 2026-09：一两条的目录太死板）。
               实测 56 页里 33 页属于这种情况。
            ⚠️ 但要**保留第三列的列位**（下面那个空 aside）—— 撤掉列会让正文列涨到 1118px。
            ⚠️ 与左栏同一口径：`xl:top-[var(--docs-subbar-h)]` + `xl:h-[calc(100dvh-顶栏-横栏)]`
               （横栏是三栏之上的一个 grid 行，它占掉的高度必须在 sticky 的 top 与高度里各补回一次）。 */}
        {current && current.toc.length > 3 ? (
          <aside className="hidden xl:sticky xl:top-[var(--docs-subbar-h)] xl:flex xl:h-[calc(100dvh-var(--site-bar-h)-var(--docs-subbar-h)-var(--docs-subbar-h))] xl:flex-col">
            <div className="docs-scroll min-h-0 flex-1 overflow-y-auto pb-4 pt-6">
              <p className="pl-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                本篇大纲
              </p>
              <div className="mt-2.5">{outline}</div>
            </div>
          </aside>
        ) : (
          <aside className="hidden xl:block" aria-hidden="true" />
        )}
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
