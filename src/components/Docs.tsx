import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import docsData from '../data/ue5-docs.json'
import type { Ue5DocsManifest } from '../data/types'
import Lightbox from './Lightbox'

const manifest = docsData as Ue5DocsManifest
const DOCS = manifest.docs
/** 文档 HTML 与图片都放在 public 下，用相对路径引用（与 vite.config 的 base: './' 一致） */
const DOC_BASE = 'docs/ue5'

/** 顶栏高度：吸顶胶囊导航（h-14 + mt-3）+ 余量。锚点跳转与标题高亮都用它 */
const HEADER_OFFSET = 88

/** 解析 `#/docs` 或 `#/docs/ue5/<id>`；返回 null 表示当前不在文档区 */
export function parseDocsHash(hash: string): { docId?: string; anchor?: string } | null {
  if (!hash.startsWith('#/docs')) return null
  const rest = hash.slice('#/docs'.length).replace(/^\//, '')
  const [pathPart, queryPart] = rest.split('?')
  const segs = pathPart.split('/').filter(Boolean)
  const anchor = new URLSearchParams(queryPart ?? '').get('s') ?? undefined
  // segs[0] 是分区名（当前只有 ue5），segs[1] 是文档 id
  return { docId: segs[1], anchor }
}

const docsHref = (docId: string, anchor?: string) =>
  `#/docs/ue5/${docId}${anchor ? `?s=${encodeURIComponent(anchor)}` : ''}`

export default function Docs({ docId, anchor }: { docId?: string; anchor?: string }) {
  const ready = useMemo(() => DOCS.filter((d) => d.status === 'ready'), [])
  const current = ready.find((d) => d.id === docId) ?? ready[0]

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
  // ⚠️ 文档区的滚动容器（md 及以上）。**不是 window** ——
  // 布局是「固定外壳 + 内部滚动」：左栏与右栏钉在视口里不动，只有中间正文列滚动。
  // 所以锚点跳转、大纲高亮、切文档重置这三处读写的都是这个元素，不是页面。
  const scrollRef = useRef<HTMLDivElement>(null)

  // 拉取文档 HTML（构建产物，静态资源；失败时给出明确回退而不是空白页）
  useEffect(() => {
    if (!current) return
    let alive = true
    setLoading(true)
    setFailed(false)
    fetch(`${DOC_BASE}/${current.id}.html`)
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
  }, [current?.id])

  // 切文档：回到顶部（否则会把上一篇的滚动位置带过来）。
  // ⚠️ 桌面端要滚的是**正文列容器**（scrollRef），手机端才是页面 —— 两处都归零最省心。
  //    另外桌面端页面本身不滚动（由 index.css 的 `.docs-shell` 关掉），
  //    所以进文档区时也要把窗口位置归零，否则会停在进入前的偏移上。
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setNavOpen(false)
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

  /** 文档树（侧栏与手机抽屉共用同一段 JSX —— 两处各写一份必然会漂移） */
  const docTree = (
    <ul>
      {DOCS.map((doc, i) => {
        const prevGroup = i > 0 ? DOCS[i - 1].group : doc.group
        // group 变化处加一段留白：界面族（01–03）与蓝图族（04–05）分开，
        // 让"这两族有先后"这件事在目录里就看得见，而不是靠用户自己猜。
        const groupGap = i > 0 && doc.group !== prevGroup
        const num = String(doc.order ?? i + 1).padStart(2, '0')
        return (
          <li key={doc.id} className={groupGap ? 'mt-3 border-t border-slate-200 pt-3 dark:border-slate-700' : 'mt-0.5'}>
            {doc.status === 'ready' ? (
              <a
                href={docsHref(doc.id)}
                aria-current={doc.id === current?.id ? 'page' : undefined}
                onClick={() => setNavOpen(false)}
                className={`flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  doc.id === current?.id
                    ? 'bg-brand-700 font-semibold text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-200'
                }`}
              >
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    doc.id === current?.id ? 'text-white/75' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {num}
                </span>
                <span className="min-w-0">{doc.title}</span>
              </a>
            ) : (
              <span
                title="该篇尚未导入本站"
                className="flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 dark:text-slate-500"
              >
                <span className="font-mono text-[11px] tabular-nums">{num}</span>
                <span className="min-w-0 flex-1">{doc.title}</span>
                <span className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600">
                  待导入
                </span>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )

  /** 当前篇大纲（桌面右栏、xl 以下的左栏、手机抽屉三处共用）。
   *
   *  ⚠️ 层级只用「缩进 + 字号/字重」表达，**不用树形连接线**（2026-09 第二轮）：
   *    第一版试过 `├ └` 字符 + 1px 竖线，实测观感偏"文件管理器"，
   *    而参考的那种带图标与折叠三角的树属于应用侧栏范式，搬进 224px 的网页大纲里显得沉重。
   *    现在的口径：每级缩进 12px，一级 12px 半粗、二级 12px 常规、三级 11px 灰，
   *    靠三级之间的**明度差**读层级，比画线更干净。
   *    字号分档不是随手取的：最长标签 17 字在 12px 下需要约 196px，
   *    而右栏可用文字宽 192px —— 所以三级降到 11px，保证**全部标签不换行**（实测 34/27 项零换行）。
   *    兜底：仍溢出的个别标签用 `truncate`，宁可省略号也不换行（换行会把目录拉得又长又乱）。 */
  const outline = current ? (
    <ul className="space-y-0.5">
      {current.toc.map((t) => {
        const level = t.level
        return (
          <li key={t.id}>
            <a
              href={docsHref(current.id, t.id)}
              onClick={(e) => {
                e.preventDefault()
                goToAnchor(t.id)
                setNavOpen(false)
              }}
              title={t.label}
              className={`flex items-baseline py-1 leading-tight transition-colors ${
                level === 1
                  ? 'text-[12px] font-semibold'
                  : level === 2
                    ? 'text-[12px]'
                    : 'text-[11px]'
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
  ) : null

  // 侧栏/目录当前的标题高亮（rAF 节流，读的是 h2/h3 的视口位置）
  useEffect(() => {
    if (loading || !html) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const headings = Array.from(
          contentRef.current?.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id]') ?? [],
        )
        let best = ''
        for (const el of headings) {
          if (el.getBoundingClientRect().top <= HEADER_OFFSET + 8) best = el.id
          else break
        }
        setActiveAnchor(best)
      })
    }
    update()
    // 两个滚动源都要听：桌面端是正文列容器（scrollRef），手机端是页面（window）。
    // 用 passive 监听，不干扰滚动性能。
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      scroller?.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update)
    }
  }, [loading, html])

  /** 大纲点击：滚到标题 + 写回地址栏（抽成函数，左右两栏与正文锚点共用一套行为） */
  /**
   * 滚到某个标题。
   *
   * ⚠️ 必须按滚动容器分流（2026-09 改成「固定外壳 + 内部滚动」布局后新增）：
   *   · 桌面端（md 及以上）页面本身不滚，正文列容器在滚 → 改容器的 scrollTop；
   *   · 手机端没有侧栏，仍是页面滚动 → 走 window.scrollTo。
   * 判据用「容器是否真的有可滚高度」而不是断点，这样两种布局共用一条代码路径，
   * 也不会因为将来改断点而静默失效。
   *
   * `HEADER_OFFSET` 只对手机端（页面滚动）有意义：桌面端正文列的第一个标题本来就
   * 紧贴列顶，不需要再减顶栏高度。
   */
  const scrollToAnchor = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const scroller = scrollRef.current
    const canScroll = scroller && scroller.scrollHeight > scroller.clientHeight + 1
    if (canScroll) {
      scroller.scrollTo({ top: scroller.scrollTop + el.getBoundingClientRect().top - 16, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, behavior: 'smooth' })
    }
  }, [])

  /** 大纲点击：滚到标题 + 写回地址栏（抽成函数，左右两栏与正文锚点共用一套行为） */
  const goToAnchor = useCallback(
    (id: string) => {
      scrollToAnchor(id)
      setActiveAnchor(id)
      history.replaceState(null, '', docsHref(current?.id ?? '', id))
    },
    [current?.id, scrollToAnchor],
  )

  // 深链：`?s=<heading id>` → 滚到该标题。
  // ⚠️ 放在 scrollToAnchor 定义**之后**：它依赖那个 useCallback，
  //    提到前面会触发 TS2448（块级变量在声明前使用）。
  useEffect(() => {
    if (!anchor || loading || !html) return
    const t = window.setTimeout(() => scrollToAnchor(anchor), 60)
    return () => window.clearTimeout(t)
  }, [anchor, loading, html, scrollToAnchor])

  /** 内容区点击委托：图片开灯箱、页内锚点走平滑滚动 + 写回 hash（可分享、可后退） */
  const onContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      const img = target.closest<HTMLImageElement>('img[data-doc-image]')
      if (img) {
        setLightbox({ src: img.getAttribute('src') ?? '', alt: img.alt || '文档配图' })
        return
      }
      const link = target.closest<HTMLAnchorElement>('a[href^="#"]')
      if (!link) return
      e.preventDefault()
      goToAnchor(decodeURIComponent(link.getAttribute('href')!.slice(1)))
    },
    [goToAnchor],
  )

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-slate-500">
        文档尚未导入。
      </div>
    )
  }

  return (
    // ⚠️ 宽度口径（2026-09 两轮调整，改之前先看 docs/联动维护点.md 第 13 条的硬约束表）
    //    第一轮：外层 88rem → 100rem，左右栏 240/208 → 192/176（内容列 848 → 961@1440）。
    //    第二轮：左右栏 → 208/224（A 方案），因为大纲最长标签 17 字在 13px 下要 212px，
    //            右栏可用文字宽必须 ≥192px 才能不换行；内容列 1184 → 1144（@1600 容器）。
    //    注意两个值分别在 `md:grid-cols` 与 `xl:grid-cols` 里，改一处要连另一处一起看。
    //    改后内容列：1440 → 948，1920 → 1180。
    // ⚠️ `md:h-[calc(100dvh-var(--site-bar-h))]` 不能省：外层容器带 `h-auto`，
    //    而**显式的 height 会压过 `flex-1` 的 flex-basis**（flex 只在主轴分配剩余空间，
    //    不覆盖 height 属性）。只写 `flex-1` 时 grid 会撑到内容高度（实测 20481px），
    //    内部滚动根本不触发、页面又因为 `.docs-shell` 不能滚 —— 整个文档区就滚不动了。
    <div className="mx-auto flex max-w-[100rem] flex-col px-4 pb-24 pt-6 sm:px-6 lg:pt-10 md:h-[calc(100dvh-var(--site-bar-h))] md:pb-0 md:pt-0">
      {/* 桌面端把页面滚动换成「内部滚动」，顶栏改为 fixed（见 TopBar）；
          这条占位把 fixed 顶栏让出的 64px 补回来 —— 高度必须与 `--site-bar-h` 一致。 */}
      <div aria-hidden="true" className="hidden h-16 shrink-0 md:block" />

      {/* 顶部：手机端的返回入口 + 篇数。
          ⚠️ 桌面端这里**不再放假链接**（2026-09）：「返回作品集」已经挪进左栏顶部，
          与「5 篇笔记」一起钉在视口里；手机端没有左栏，所以这两样仍留在文档流顶部。
          一处入口、两种布局，不再在顶栏重复第三个。 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 md:hidden">
        <a
          href="#top"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回作品集
        </a>
        <span className="text-sm text-slate-400 dark:text-slate-500">{ready.length} 篇笔记</span>
      </div>

      {/* 手机端吸顶条：目录入口。`sticky top-16` = 正好贴在常驻顶栏下沿，
          无论滚到文档哪一段都能点到（这是修复"下滑后失去跳转能力"的关键）。 */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-slate-200/70 bg-[rgb(250_251_251/0.92)] px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 md:hidden dark:border-slate-700/70 dark:bg-[rgb(18_20_21/0.9)]">
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-expanded={navOpen}
          aria-controls="docs-drawer"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          目录与大纲
          <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
            {String(current.order ?? 1).padStart(2, '0')}/{String(DOCS.length).padStart(2, '0')}
          </span>
        </button>
      </div>

      {/* 手机端抽屉：独占一层浮层，自带滚动，分「切换文档」与「本篇大纲」两块 */}
      {navOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
            aria-hidden="true"
            onClick={() => setNavOpen(false)}
          />
          <div
            id="docs-drawer"
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="文档目录与大纲"
            className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto overscroll-contain rounded-t-2xl border-t border-slate-200 bg-[#fafbfb] px-4 pb-8 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] outline-none md:hidden dark:border-slate-700 dark:bg-[#121415]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
                UE5 学习笔记
              </p>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="关闭目录"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {docTree}
            <p className="mt-3 px-2.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              01–05 为建议阅读顺序（界面在前、蓝图在后）。
            </p>
            {current.toc.length > 0 && (
              <>
                <p className="mt-5 border-t border-slate-200 pt-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  本篇大纲
                </p>
                <div className="mt-2.5">{outline}</div>
              </>
            )}
          </div>
        </>
      )}

      <div
        ref={scrollRef}
        id="docs-scroll"
        className="md:grid md:min-h-0 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6 md:overflow-y-auto md:pr-2 xl:grid-cols-[13rem_minmax(0,1fr)_14rem]"
      >
        {/* 左：返回入口 + 文档树（+ xl 以下顺带放本篇大纲 —— 右侧栏在 xl 以下不显示）
            ⚠️ sticky 必须加在 **aside 自身**上，不要外面套一层 div 再 sticky（2026-09 踩过两次）：
              · 若给 grid item 加 `align-self: start`，它的高度会缩到内容高度（实测 374px），
                里面那个 sticky 元素的"容器"就只有 374px —— 没有可粘的行程，直接跟着滚走；
              · 不加 `align-self: start` 时 grid item 被拉伸到整行高（15800px），
                但那是 **aside 的盒子**，套在里面的 div 依然粘不住（sticky 认的是父级内容盒）。
              所以：让 aside 保持默认 stretch、自身 `position: sticky`，
              它的容器就是整行高的 grid area，粘住行程足够。
            ⚠️ `top-16` 是顶栏高度；`md:py-6` 给内容上下留白（sticky 元素有 padding 不影响粘性）。
            ⚠️ `max-h-[calc(100dvh-6rem)]` + `overflow-y-auto`：窄于 xl 时这一栏还要放大纲，
              内容会超过视口，必须让**它自己**能滚，否则底部内容永远看不到。 */}
        <aside className="hidden md:sticky md:top-16 md:block md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:py-6 md:pr-1">
          <a
            href="#top"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回作品集
          </a>
          <p className="flex items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
            UE5 学习笔记
            <span className="font-mono text-[10px] font-normal tabular-nums tracking-normal text-slate-400 dark:text-slate-500">
              {ready.length} 篇
            </span>
          </p>
          <div className="mt-3">{docTree}</div>

          {/* 「按顺序阅读」全站只在这里说一次（2026-09 精简）：
              原来在页头计数、侧栏注释、目录末行、正文头部各说一遍，属于同一句话的四份拷贝。
              序号 01–05 本身已经说明顺序，这里只补一句"为什么是这个顺序"。 */}
          <p className="mt-4 px-2.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            01–05 为建议阅读顺序（界面在前、蓝图在后）；每篇头部标注前置、尾部给出下一篇。
          </p>

          {current.toc.length > 0 && (
            <div className="xl:hidden">
              <p className="mt-6 border-t border-slate-200 pt-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:text-slate-500">
                本篇大纲
              </p>
              <div className="mt-2.5">{outline}</div>
            </div>
          )}
        </aside>

        {/* 中：正文。data-copyable = 只读保护白名单，放开这一整块的选择与复制。
            `md:py-6` 是正文列自己的上下留白（外层在桌面端已去掉 padding）。 */}
        <main className="min-w-0 md:py-6">
          <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {String(current.order ?? 1).padStart(2, '0')} / {String(DOCS.length).padStart(2, '0')}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {current.group}
              </span>
              {/* 前置：告诉读者"这一篇不是入口"，避免从中间开始读而卡住 */}
              {current.prereq && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  前置：
                  <a href={docsHref(current.prereq.id)} className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800 dark:text-brand-200 dark:decoration-brand-500/50">
                    {current.prereq.title}
                  </a>
                </span>
              )}
            </div>
            <h1 className="font-display mt-2.5 text-3xl font-normal tracking-tight text-ink dark:text-ink-light">
              {current.title}
            </h1>
            {current.subtitle && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{current.subtitle}</p>
            )}
          </header>

          <div
            className="doc-content glass-card-strong rounded-2xl px-5 py-6 sm:px-8 sm:py-8"
            data-copyable
            ref={contentRef}
            onClick={onContentClick}
          >
            {loading && <p className="text-sm text-slate-400">正在加载文档…</p>}
            {failed && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                文档内容加载失败，请刷新重试。
              </p>
            )}
            {!loading && !failed && <div dangerouslySetInnerHTML={{ __html: html }} />}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            本区内容为个人学习笔记，原文由 Typora 维护；点击任意配图可放大查看。
          </p>

          {/* 篇尾导航：读完一篇给"下一篇"（只在同 group 内串，跨组那一步留给侧栏） */}
          <nav aria-label="文档导航" className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={docsHref('unreal5-notes')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-200"
            >
              文档总览
            </a>
            {current.next && (
              <a
                href={docsHref(current.next.id)}
                className="group inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                下一篇：{current.next.title}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </nav>
        </main>

        {/* 右：本篇大纲（宽屏常驻；xl 以下由左栏与手机抽屉承担，三处共用同一个 `outline`）。
            宽度 14rem（224px）= A 方案：可用文字宽 192px，12px 字号下最长标签（17 字）刚好不换行。
            加宽的代价是内容列从 1184 → 1144（仍远大于加宽前的 961）。
            ⚠️ 与左栏同一口径：sticky 加在 aside 自身，不要套内层 div（原因见左栏注释）。 */}
        <aside className="hidden xl:sticky xl:top-16 xl:block xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            本篇大纲
          </p>
          <div className="mt-2.5">{outline}</div>
        </aside>
      </div>

      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
          maxWidthClass="max-w-6xl"
        >
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
