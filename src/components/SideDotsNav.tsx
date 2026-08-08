import { useEffect, useMemo, useState } from 'react'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { SECTIONS, SECTION_IDS } from '../data/navigation'
import ThemeToggle from './ThemeToggle'

/** 右侧玻璃管进度导航（内容篇幅分布版）：
 *  管在顶部图标与底部主题之间贯穿（top-14/bottom-14，图标在管外）；
 *  节点按各板块在页面中的实际位置比例分布于管上（滚动进度感真实）；
 *  Dock 弹性动效：hover 文字+节点同放大，选中常驻放大。PC/平板显示。 */
export default function SideDotsNav() {
  const active = useScrollSpy(SECTION_IDS)
  const [positions, setPositions] = useState<number[]>(SECTIONS.map(() => 0))
  const [progress, setProgress] = useState(0)
  // 深色模式液柱粒子：固定伪随机参数（位置/大小/时长/延迟），仅 dark 下显示
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 7.3 + 3) % 92,
        size: i % 3 === 0 ? 3 : 2,
        duration: 2.6 + (i % 5) * 0.7,
        delay: (i * 0.83) % 3,
        bottom: (i * 11 + 5) % 88,
      })),
    [],
  )

  // 测量各板块在页面中的纵向位置比例（图片有固定宽高比，高度稳定；窗口变化时重测）
  useEffect(() => {
    const measure = () => {
      const scrollH = document.documentElement.scrollHeight || document.body.scrollHeight
      if (!scrollH) return
      setPositions(
        SECTIONS.map((sec) => {
          const el = document.getElementById(sec.id)
          if (!el) return 0
          return ((el.getBoundingClientRect().top + window.scrollY) / scrollH) * 100
        }),
      )
    }
    measure()
    window.addEventListener('resize', measure)
    // 内容高度变化（板块增减/文案调整）时自动重测节点位置
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
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
      aria-label="页面章节导航"
      className="fixed bottom-0 right-4 top-0 z-40 hidden md:flex"
    >
      {/* 玻璃管：顶部图标与底部主题之间贯穿（光纤质感） */}
      <div
        className="fixed bottom-14 right-[21px] top-14 w-2 overflow-hidden rounded-full border border-white/60 bg-white/40 shadow-[inset_0_0_6px_rgba(59,130,246,0.4),0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-sm dark:border-white/20 dark:bg-white/10"
        aria-hidden="true"
      >
        {/* 阅读进度液柱：从顶部向下延伸。
            浅色模式：收敛的静态蓝渐变条；深色模式：整个液柱内流动粒子（赛博感） */}
        <div
          className="absolute left-0 right-0 top-0 overflow-hidden rounded-b-full transition-[height] duration-150 ease-out"
          style={{ height: `${progress}%` }}
        >
          {/* 渐变主体：浅色静态蓝条（收敛）；深色加深为粒子底 */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-blue-600 to-sky-400 opacity-90 dark:from-blue-700 dark:to-cyan-500/80 dark:opacity-40"
            aria-hidden="true"
          />
          {/* 深色模式：液柱内流动粒子（上浮 + 呼吸闪烁） */}
          <div className="absolute inset-0 hidden dark:block" aria-hidden="true">
            {particles.map((p, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-cyan-200 shadow-[0_0_4px_rgba(103,232,249,0.9)]"
                style={{
                  left: `${p.left}%`,
                  bottom: `${p.bottom}%`,
                  width: p.size,
                  height: p.size,
                  animation: `particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
                }}
              />
            ))}
          </div>
          {/* 液面高光线（深色模式更亮） */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/70 dark:bg-cyan-200/90" aria-hidden="true" />
        </div>
      </div>

      {/* 管外顶部：返回顶部（↑ 图标 + 左侧常驻提示） */}
      <div className="absolute right-0 top-7">
        <a
          href="#top"
          aria-label="返回顶部"
          title="返回顶部"
          className="group flex items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
        >
          <span className="w-14 text-right text-xs text-slate-400 transition-colors group-hover:text-blue-700 dark:text-slate-500 dark:group-hover:text-blue-400">
            返回顶部
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-slate-500 transition-colors group-hover:text-blue-700 dark:text-slate-400 dark:group-hover:text-blue-400"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </a>
      </div>

      {/* 章节节点：按内容篇幅分布于管上（位置 = 板块在页面中的比例） */}
      <div className="absolute bottom-14 right-0 top-14">
        {SECTIONS.map((sec, i) => {
          const isActive = active === sec.id
          return (
            <div key={sec.id} className="absolute right-0" style={{ top: `${positions[i]}%` }}>
              <a
                href={`#${sec.id}`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={sec.label}
                className={`group flex -translate-y-1/2 items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <span
                  className={`w-14 text-right text-xs transition-colors ${
                    isActive
                      ? 'font-bold text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100'
                  }`}
                >
                  {sec.label}
                </span>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                    isActive
                      ? 'scale-125 bg-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.6)] ring-4 ring-blue-200/70 dark:bg-blue-400 dark:ring-blue-500/20'
                      : 'bg-white shadow-[inset_0_0_3px_rgba(59,130,246,0.5)] ring-2 ring-slate-300 group-hover:scale-125 group-hover:bg-blue-600 group-hover:ring-blue-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-blue-400'
                  }`}
                  aria-hidden="true"
                />
              </a>
            </div>
          )
        })}
      </div>

      {/* 管外底部：主题切换（整行可点，与节点行同构） */}
      <div className="absolute bottom-7 right-0">
        <ThemeToggle placement="left" variant="row" label="主题" />
      </div>
    </nav>
  )
}
