import { useEffect, useState } from 'react'

/** 返回顶部按钮（带滚动进度环）：滚动超过 300px 浮现，环随阅读进度填充，点击平滑回顶 */
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
      className={`fixed bottom-20 right-5 md:bottom-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 sm:h-14 sm:w-14 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-500/40 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      {/* 滚动进度环 */}
      <svg viewBox="0 0 60 60" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="30" cy="30" r={R} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
        <circle
          cx="30"
          cy="30"
          r={R}
          fill="none"
          stroke="white"
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
      {/* 桌面 hover 提示 */}
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
