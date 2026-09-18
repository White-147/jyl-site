import { useEffect, useRef, useState } from 'react'

/**
 * 元素离屏时暂停其内部所有动画（返回是否在视口内）。
 *
 * 用途：右侧玻璃管导航的粒子、Hero 的光斑浮动这类**无限循环**动画，
 * 滚动到看不见的位置后仍会逐帧提交合成，属于纯浪费。
 * 返回 false 时给容器加 `.anim-paused`（见 index.css），
 * 用 `animation-play-state: paused` 停住全部后代动画，不销毁 DOM、不重置进度。
 *
 * `prefers-reduced-motion: reduce` 下不接管：此时动画已在 CSS 层被关掉。
 */
export function useInViewPause<T extends HTMLElement>(rootMargin = '120px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setInView(entry.isIntersecting))
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
