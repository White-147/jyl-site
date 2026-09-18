import { useEffect, useMemo, useState } from 'react'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useAnchorScroll } from '../hooks/useAnchorScroll'
import { useInViewPause } from '../hooks/useInViewPause'
import { SECTIONS, SECTION_IDS, HERO_ID, HERO_ROLE } from '../data/navigation'
import { SCROLL_MARGIN_DESKTOP_PX, SCROLL_MARGIN_MOBILE_PX } from '../data/scrollTargets'
import ThemeToggle from './ThemeToggle'

/** 右侧玻璃管进度导航（内容篇幅分布版）：
 *  管在顶部图标与底部主题之间贯穿（top-14/bottom-14，图标在管外）；
 *  节点按各板块在页面中的实际位置比例分布于管上（滚动进度感真实）；
 *  Dock 弹性动效：hover 文字+节点同放大，选中常驻放大。PC/平板显示。
 *
 *  液柱粒子：数量随视口高度取 min（深色 24 / 浅色 14，原深色固定 72 个）。
 *  浅色模式为克制版复刻——更低不透明度、更小尺寸，只当隐约的流动感，
 *  让浅深两套保持同一形态语言；深色仍为较亮的赛博微粒。 */
export default function SideDotsNav() {
  const active = useScrollSpy(SECTION_IDS)
  const { onAnchorClick } = useAnchorScroll()
  const { ref: railRef, inView } = useInViewPause<HTMLElement>()
  // positions 全部为 0 时表示「尚未测量」。首帧若按 0 渲染，所有节点会叠在玻璃管顶端，
  // 测量完成后才散开，形成一次可测量的布局位移（实测 CLS 0.0053）。
  // 因此测量完成前不渲染节点，只保留管体 —— 视觉上只差一两帧，但位移归零。
  const [positions, setPositions] = useState<number[] | null>(null)
  const [progress, setProgress] = useState(0)
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  // 跟随站点主题（ThemeToggle 在 html 上切 .dark，这里同步粒子的配色与数量）
  useEffect(() => {
    const el = document.documentElement
    const sync = () => setDark(el.classList.contains('dark'))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const particles = useMemo(() => {
    // 按视口高度限制粒子数：矮屏少铺，避免小窗口也算 24 份合成层
    const cap = Math.max(8, Math.min(dark ? 24 : 14, Math.round(window.innerHeight / 38)))
    return Array.from({ length: cap }, (_, i) => ({
      left: (i * 4.1 + 2.5) % 92,
      bottom: (i * 4.3 + 3) % 90,
      size: dark ? (i % 6 === 0 ? 3 : i % 2 === 0 ? 2 : 1) : i % 3 === 0 ? 2 : 1,
      duration: dark ? 1.5 + ((i * 7) % 12) * 0.25 : 3.2 + ((i * 5) % 9) * 0.45,
      delay: ((i * 13) % 12) / 4,
      // 浅色：琥珀深系、明显更淡（隐约流动感）；深色：亮琥珀带辉光
      dot: dark
        ? 'bg-brand-300 shadow-[0_0_4px_rgba(242,169,59,0.9)]'
        : 'bg-brand-700',
      opacity: dark ? (i % 3 === 0 ? 0.75 : 0.5) : i % 3 === 0 ? 0.26 : 0.16,
    }))
  }, [dark])

  // 测量各节点在液柱上的位置比例。
  //
  // ⚠️ 必须与液柱用**同一套度量**（见 docs/联动维护点.md 第 6 条）
  // 液柱高度 = scrollY / maxScroll（maxScroll = docH − viewportH）。
  // 所以某个板块"刚滚到停靠位"时，液柱正好填到
  //     (sectionTop − 锚点偏移) / maxScroll
  // 节点就放在这个比例上，液面才会**精确穿过节点中心**。
  //
  // 历史问题：节点曾用 sectionTop / docH（文档静态比例），
  // 与液柱的分母（可滚动距离）和参照都不同，导致液面与节点系统性错位，
  // 实测偏差从 −10px 一路扩大到 −148px（专业技能）、再翻到 +88px（联系我）。
  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement
      const maxScroll = doc.scrollHeight - doc.clientHeight
      if (maxScroll <= 0) return
      const margin = window.matchMedia('(min-width: 640px)').matches
        ? SCROLL_MARGIN_DESKTOP_PX
        : SCROLL_MARGIN_MOBILE_PX
      setPositions(
        SECTIONS.map((sec) => {
          const el = document.getElementById(sec.id)
          if (!el) return 0
          // 首屏（#top）在文档顶端，滚到它时 scrollY = 0
          if (sec.role === HERO_ROLE) return 0
          const sectionTop = el.getBoundingClientRect().top + window.scrollY
          const scrollYAtStop = Math.max(0, sectionTop - margin)
          return (scrollYAtStop / maxScroll) * 100
        }),
      )
    }
    measure()
    window.addEventListener('resize', measure)
    // 内容高度变化（板块增减/文案调整/图片加载完成）时自动重测。
    // 初测可能发生在字体或图片就位之前，比例会偏；这里再补测两帧消除这种偏差。
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(measure))
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
      cancelAnimationFrame(raf1)
    }
  }, [])

  // 阅读进度：液柱高度 = 已读百分比（rAF 节流，滚动/窗口变化时更新）
  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement
        const max = doc.scrollHeight - doc.clientHeight
        setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <nav
      ref={railRef}
      aria-label="页面章节导航"
      className={`fixed bottom-0 right-4 top-0 z-40 hidden md:flex ${inView ? '' : 'anim-paused'}`}
    >
      {/* 玻璃管：顶部图标与底部主题之间贯穿（光纤质感） */}
      <div
        className="fixed bottom-14 right-[21px] top-14 w-2 overflow-hidden rounded-full border border-white/60 bg-white/40 shadow-[inset_0_0_6px_rgba(157,83,0,0.4),0_0_10px_rgba(157,83,0,0.15)] backdrop-blur-sm dark:border-white/20 dark:bg-white/10"
        aria-hidden="true"
      >
        {/* 阅读进度液柱：从顶部向下延伸。
            浅色模式：静态琥珀渐变条 + 隐约淡粒子；深色模式：较亮的流动粒子（赛博感） */}
        <div
          className="absolute left-0 right-0 top-0 overflow-hidden rounded-b-full transition-[height] duration-150 ease-out"
          style={{ height: `${progress}%` }}
        >
          {/* 渐变主体：浅色偏实；深色压暗作粒子底（brand-400 属图形级，可安全承载渐变的亮端） */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-brand-700 to-brand-400 opacity-90 dark:from-brand-700 dark:to-brand-500/80 dark:opacity-40"
            aria-hidden="true"
          />
          {/* 液柱内流动粒子：浅深同形态，浅色更低不透明度、更慢、更小 */}
          <div className="absolute inset-0" aria-hidden="true">
            {particles.map((p, i) => (
              <span
                key={i}
                className={`rail-particle absolute rounded-full ${p.dot}`}
                style={{
                  left: `${p.left}%`,
                  bottom: `${p.bottom}%`,
                  width: p.size,
                  height: p.size,
                  opacity: p.opacity,
                  animationDuration: `${p.duration}s`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
          {/* 液面高光线（深色模式更亮） */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/70 dark:bg-brand-200/90" aria-hidden="true" />
        </div>
      </div>

      {/* 管外顶部：返回顶部。
          它是**管外操作**，不是章节节点 —— 与管外底部的「主题」对称，
          所以不参与节点样式、也不与液柱比色（历史上它曾是首屏节点的载体，
          ↑ 图标横跨管体、激活色又与液柱起点完全相同，导致既不同构又看不见）。 */}
      <div className="absolute right-0 top-7">
        <a
          href={`#${HERO_ID}`}
          onClick={(e) => onAnchorClick(e, HERO_ID)}
          aria-label="返回顶部"
          title="返回顶部"
          className="group flex items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:var(--ease-out-sharp)] hover:scale-110"
        >
          <span className="w-14 text-right text-xs text-slate-400 transition-colors group-hover:text-brand-700 dark:text-slate-400 dark:group-hover:text-brand-200">
            返回顶部
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-slate-500 transition-colors group-hover:text-brand-700 dark:text-slate-400 dark:group-hover:text-brand-200"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </a>
      </div>

      {/* 节点区：位置 = 「该板块滚到停靠位时的滚动进度」，与液柱同一套度量，
          因此液面会精确穿过节点中心。

          容器几何必须与玻璃管**完全一致**（管体是 `top-14 bottom-14`，
          即 inset 上下各 3.5rem）：这样 0% 落在管顶、100% 落在管底。
          早先用 `inset-0` 是错误的 —— 那让容器等于整个视口高（900px 而不是 788px），
          比例被放大，偏差反而更大（实测 −210px）。
          也不能用 top-14/bottom-14 之外的做法：容器必须与管体同高同起点。

          positions 为 null 时尚未测量，整组不渲染，避免节点先叠在顶端再散开的位移。 */}
      {positions && (
        <div className="absolute bottom-14 right-0 top-14">
          {SECTIONS.map((sec, i) => {
            const isActive = active === sec.id
            return (
              <div key={sec.id} className="absolute right-0" style={{ top: `${positions[i]}%` }}>
                <a
                  href={`#${sec.id}`}
                  onClick={(e) => onAnchorClick(e, sec.id)}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={sec.label}
                  title={sec.label}
                  className={`group flex -translate-y-1/2 items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:var(--ease-out-sharp)] hover:scale-110 ${
                    isActive ? 'scale-110' : ''
                  }`}
                >
                  <span
                    className={`w-14 text-right text-xs transition-colors ${
                      isActive
                        ? 'font-bold text-brand-700 dark:text-brand-200'
                        : 'text-slate-500 group-hover:text-ink dark:text-slate-400 dark:group-hover:text-slate-100'
                    }`}
                  >
                    {sec.label}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200 [transition-timing-function:var(--ease-out-sharp)] ${
                      isActive
                        ? 'scale-125 bg-brand-700 shadow-[0_0_10px_rgba(157,83,0,0.6)] ring-4 ring-brand-200/70 dark:bg-brand-300 dark:ring-brand-300/25'
                        : 'bg-white shadow-[inset_0_0_3px_rgba(157,83,0,0.5)] ring-2 ring-slate-300 group-hover:scale-125 group-hover:bg-brand-700 group-hover:ring-brand-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-brand-300'
                    }`}
                    aria-hidden="true"
                  />
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* 管外底部：主题切换（整行可点，与节点行同构） */}
      <div className="absolute bottom-7 right-0">
        <ThemeToggle placement="left" variant="row" label="主题" />
      </div>
    </nav>
  )
}
