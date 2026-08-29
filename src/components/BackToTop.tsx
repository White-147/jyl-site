import { useEffect, useState } from 'react'

/** 返回顶部按钮（移动端）：玻璃拟态圆钮 + 蓝→青渐变滚动进度环，
 *  与 PC 玻璃管导航同设计语言（半透明玻璃 + 细亮边 + 光晕 + Dock 弹性动效）；
 *  滚动超过 300px 浮现，环随阅读进度填充，点击平滑回顶 */
export default function BackToTop() {
  const [show, setShow] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const y = window.scrollY
      setShow(y > 300)
      setProgress(max > 0 ? Math.min(1, y / max) : 0)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const R = 26
  const C = 2 * Math.PI * R

  return (
    <button
      type="button"
      aria-label="返回顶部"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`fixed bottom-20 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/75 text-brand-600 shadow-[0_6px_20px_rgba(13,148,136,0.28)] backdrop-blur-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:h-14 sm:w-14 md:hidden dark:border-white/15 dark:bg-slate-900/70 dark:text-cyan-400 dark:focus-visible:ring-brand-500/40 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      {/* 滚动进度环：蓝→青渐变描边（呼应 PC 玻璃管液柱配色） */}
      <svg viewBox="0 0 60 60" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="backtop-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r={R} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <circle
          cx="30"
          cy="30"
          r={R}
          fill="none"
          stroke="url(#backtop-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
        />
      </svg>
      {/* 上箭头 */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      {/* hover 提示（平板及以上可见） */}
      <span
        className={`absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md transition-opacity duration-200 sm:block dark:bg-slate-700 ${
          hover && show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        回到顶部
      </span>
    </button>
  )
}
