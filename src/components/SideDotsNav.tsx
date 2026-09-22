import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useAnchorScroll } from '../hooks/useAnchorScroll'
import { useInViewPause } from '../hooks/useInViewPause'
import { SECTIONS, SECTION_IDS, HERO_ID, HERO_ROLE } from '../data/navigation'
import { SCROLL_MARGIN_DESKTOP_PX, SCROLL_MARGIN_MOBILE_PX } from '../data/scrollTargets'
import ThemeToggle from './ThemeToggle'

/** 导轨只在 md（768px）起可见（与 className 的 `hidden md:flex` 同源）。
 *  ⚠️ 这是**联动点**：改这里必须同步改下面的 className，反之亦然。 */
const RAIL_QUERY = '(min-width: 768px)'

const subscribeRail = (cb: () => void) => {
  const mq = window.matchMedia(RAIL_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** 只负责「当下是否显示导轨」。用 useSyncExternalStore 而不是 useEffect+useState，
 *  是为了避免首帧按「手机」渲染、effect 里再切成「桌面」造成的一次无谓布局位移：
 *  它会在**同一次渲染前**比对快照并强制重渲染（React 提供的正是这个用途）。 */
function useRailVisible() {
  return useSyncExternalStore(
    subscribeRail,
    () => window.matchMedia(RAIL_QUERY).matches,
    () => false,
  )
}

/** 右侧玻璃管进度导航（内容篇幅分布版）：
 *  管在顶部图标与底部主题之间贯穿（top-14/bottom-14，图标在管外）；
 *  节点按各板块在页面中的实际位置比例分布于管上（滚动进度感真实）；
 *  Dock 弹性动效：hover 文字+节点同放大，选中常驻放大。PC/平板显示。
 *
 *  液柱粒子：数量随视口高度取 min（深色 24 / 浅色 14，原深色固定 72 个）。
 *  浅色模式为克制版复刻——更低不透明度、更小尺寸，只当隐约的流动感，
 *  让浅深两套保持同一形态语言；深色仍为较亮的赛博微粒。 */
/** 对外组件：`<768px` 时直接不挂载导轨，连带它的滚动监听 / 观察器 / 测量逻辑一起省掉。
 *
 *  ⚠️ 2026-09 移动端性能修复的**结构性**做法
 *  原实现只在 className 上写 `hidden md:flex`，元素虽然不显示，但组件照样挂载并运行：
 *  一个 scroll 监听（每帧读 scrollHeight 强制布局）、两个 ResizeObserver、
 *  一个 MutationObserver、一个 rAF 双帧重测，以及 useScrollSpy 的常驻侦测。
 *  手机上这些测量结果没有任何人看得见，却要和真正的滚动竞争主线程 —— 这是本次修复里
 *  对「手机 + 平板竖屏」最直接的一项。
 *  这里用条件挂载替代 CSS 隐藏：`<768px` 时整棵子树与全部 effect 都不存在。
 *  外层 nav 是稳定骨架（承载 `hidden md:flex` 的显示开关与定位），Rail 内部再用
 *  `display: contents` 展开，视觉与拆分前完全一致。 */
export default function SideDotsNav() {
  const railVisible = useRailVisible()
  return (
    <nav
      aria-label="页面章节导航"
      className="fixed bottom-0 right-4 top-0 z-40 hidden md:flex"
    >
      {railVisible && <Rail />}
    </nav>
  )
}

function Rail() {
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
          // 跨视图条目（UE 文档区，主页面里没有对应 section）不参与比例计算，压到管底
          if (!el) return 100
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
  //
  // ⚠️ 2026-09 移动端/平板性能修复：**不要每帧读 scrollHeight**。
  // `documentElement.scrollHeight` 是一次强制布局查询（读它会 flush 待处理的样式与布局），
  // 而本组件从 md（768px，平板）起就存在，等于平板每次滚动都在 rAF 里强制同步重排。
  // 页面高度只在「图片解码完成 / 字体替换 / 内容增删 / 视口变化」时才会变，
  // 所以这里缓存 max，并只在这些时机刷新：
  //   · window resize（含移动端地址栏收起的视口高度变化）
  //   · 下面的 ResizeObserver 观察 body（内容高度变化时触发，已带 rAF 合并）
  // 历史口径不变：液柱 = scrollY / (docH − viewportH)，节点位置用同一分母（见下方 measure）。
  useEffect(() => {
    let raf = 0
    let maxScroll = 0

    const refreshMax = () => {
      const doc = document.documentElement
      maxScroll = doc.scrollHeight - doc.clientHeight
    }

    const paint = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setProgress(maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0)
      })
    }

    const onResize = () => {
      refreshMax()
      paint()
    }

    refreshMax()
    paint()
    window.addEventListener('scroll', paint, { passive: true })
    window.addEventListener('resize', onResize)
    // ResizeObserver 的首次回调会在观察开始时同步触发一次，正好负责「挂载后内容仍在长高」的补正；
    // 它只更新缓存的 max，不直接 setState，避免在观察回调里读到布局中途的值。
    const ro = new ResizeObserver(() => {
      refreshMax()
      paint()
    })
    ro.observe(document.body)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', paint)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
  }, [])

  return (
    // `contents`：内层不再生成盒子，管体/节点/主题按钮仍是外层 nav 的子节点，
    // 定位与层级与拆分前逐像素一致（唯一变化是把 ref 从最外层挪到了这一层）。
    <nav
      ref={railRef}
      className={`contents ${inView ? '' : 'anim-paused'}`}
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
                {/* 带 href 的条目（UE 文档区）是跨视图跳转，不走 useAnchorScroll 的平滑滚动 */}
                <a
                  href={sec.href ?? `#${sec.id}`}
                  onClick={sec.href ? undefined : (e) => onAnchorClick(e, sec.id)}
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
