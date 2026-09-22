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

export const docsHref = (docId: string, anchor?: string) =>
  `#/docs/ue5/${docId}${anchor ? `?s=${encodeURIComponent(anchor)}` : ''}`

export default function Docs({ docId, anchor }: { docId?: string; anchor?: string }) {
  const ready = useMemo(() => DOCS.filter((d) => d.status === 'ready'), [])
  const current = ready.find((d) => d.id === docId) ?? ready[0]

  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [activeAnchor, setActiveAnchor] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

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

  // 切文档：回到顶部（否则会把上一篇的滚动位置带过来）
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    setNavOpen(false)
  }, [current?.id])

  // 深链：`?s=<heading id>` → 滚到该标题
  useEffect(() => {
    if (!anchor || loading || !html) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(anchor)
      if (!el) return
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, behavior: 'auto' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [anchor, loading, html])

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
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
    }
  }, [loading, html])

  /** 大纲点击：滚到标题 + 写回地址栏（抽成函数，左右两栏与正文锚点共用一套行为） */
  const goToAnchor = useCallback(
    (id: string) => {
      const el = document.getElementById(id)
      if (!el) return
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, behavior: 'smooth' })
      setActiveAnchor(id)
      history.replaceState(null, '', docsHref(current?.id ?? '', id))
    },
    [current?.id],
  )

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
    <div className="mx-auto max-w-[88rem] px-4 pb-24 pt-6 sm:px-6 lg:pt-10">
      {/* 顶部：返回主站 + 移动端目录开关 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <a
          href="#top"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回作品集
        </a>
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-expanded={navOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 lg:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          目录
        </button>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {ready.length} 篇已导入 · 共 {DOCS.length} 篇
        </span>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
        {/* 左：文档树 + 当前篇大纲 */}
        <aside className={`${navOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
              UE5 学习笔记
            </p>
            <ul className="mt-3 space-y-1">
              {DOCS.map((doc) =>
                doc.status === 'ready' ? (
                  <li key={doc.id}>
                    <a
                      href={docsHref(doc.id)}
                      aria-current={doc.id === current.id ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        doc.id === current.id
                          ? 'bg-brand-700 font-semibold text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-200'
                      }`}
                    >
                      {doc.title}
                    </a>
                  </li>
                ) : (
                  <li key={doc.id}>
                    <span
                      title="该篇尚未导入本站"
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 dark:text-slate-500"
                    >
                      {doc.title}
                      <span className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600">
                        待导入
                      </span>
                    </span>
                  </li>
                ),
              )}
            </ul>

            {/* 当前篇大纲：移动端与桌面端共用（桌面端就在左栏下方） */}
            {current.toc.length > 0 && (
              <>
                <p className="mt-6 border-t border-slate-200 pt-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  本篇大纲
                </p>
                <ul className="mt-3 space-y-0.5 xl:hidden">
                  {current.toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={docsHref(current.id, t.id)}
                        onClick={(e) => {
                          e.preventDefault()
                          goToAnchor(t.id)
                          setNavOpen(false)
                        }}
                        className={`block border-l-2 py-1 text-[13px] transition-colors ${
                          t.level >= 3 ? 'pl-6' : 'pl-3'
                        } ${
                          activeAnchor === t.id
                            ? 'border-brand-500 font-medium text-brand-700 dark:text-brand-200'
                            : 'border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-brand-200'
                        }`}
                      >
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>

        {/* 中：正文。data-copyable = 只读保护白名单，放开这一整块的选择与复制 */}
        <main className="min-w-0">
          <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-700">
            <h1 className="font-display text-3xl font-normal tracking-tight text-ink dark:text-ink-light">
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
        </main>

        {/* 右：本篇大纲（宽屏常驻） */}
        <aside className="hidden xl:block">
          <nav aria-label="本篇大纲" className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              本篇大纲
            </p>
            <ul className="mt-3 space-y-0.5">
              {current.toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={docsHref(current.id, t.id)}
                    onClick={(e) => {
                      e.preventDefault()
                      goToAnchor(t.id)
                    }}
                    className={`block border-l-2 py-1 text-[13px] leading-snug transition-colors ${
                      t.level >= 3 ? 'pl-5' : 'pl-3'
                    } ${
                      activeAnchor === t.id
                        ? 'border-brand-500 font-medium text-brand-700 dark:text-brand-200'
                        : 'border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-brand-200'
                    }`}
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
