import { useEffect, useState } from 'react'

/** 滚动侦测：返回当前正在阅读的区块 id（用于导航高亮）。
 *  触发规则：板块顶部越过视口顶部 128px 触发线，且选择「最靠下」的板块
 *  （即刚越过触发线的那个 = 当前在读；与板块 scroll-mt-16 锚点停靠位兼容）。
 *  用 scroll 监听 + rAF 节流（IntersectionObserver threshold:0 只在进出视口时回调，
 *  无法表达「板块顶部越过触发线」这一连续条件）。 */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState('')

  useEffect(() => {
    const TRIGGER_LINE = 128
    let raf = 0

    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        let bestId = ''
        let bestTop = -Infinity
        for (const id of ids) {
          const el = document.getElementById(id)
          if (!el) continue
          const top = el.getBoundingClientRect().top
          if (top <= TRIGGER_LINE && top > bestTop) {
            bestTop = top
            bestId = id
          }
        }
        if (bestId) setActive(bestId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  return active
}
