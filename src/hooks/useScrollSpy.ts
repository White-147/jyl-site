import { useEffect, useState } from 'react'
import {
  SCROLL_MARGIN_DESKTOP_PX,
  SCROLL_MARGIN_MOBILE_PX,
  SCROLL_TRIGGER_EPSILON_PX,
} from '../data/scrollTargets'

/**
 * 滚动侦测：返回当前正在阅读的区块 id（用于导航高亮）。
 *
 * 判定规则：取「顶部已经越过触发线、且最靠下」的那个板块 = 当前在读。
 * 这与「点锚点跳转后落点恰好等于停靠位」是同一个坐标系：
 * 段落停靠在 X 处 → 它的 top = X ≤ 判定线 → 它成为最靠下的通过者 → 高亮它。
 *
 * ⚠️ 联动维护点（详见 docs/联动维护点.md 第 6 条）
 * 判定线必须等于各 section 的锚点停靠位（`.anchor-offset` 的 scroll-margin-top）。
 * ⚠️ 这里读的是 `scrollTargets.ts` 的常量，而 CSS 侧那两个 scroll-margin-top 是**硬编码**的
 *    —— 值本身仍是同源，但"改一处就够"的保证不存在。完整清单见 scrollTargets.ts 顶部注释。
 *
 * 历史问题（两轮）：
 *   1. 停靠位 64px 而判定线 128px → 点击导航跳转后高亮停在上一段，要再滚一下才切。
 *   2. 两者统一 80px，但手机端吸顶导航正好占 0..80px → 标题紧贴浮层下沿、零间隙。
 * 现在：停靠位与判定线同源（手机 112 / 桌面 104，见 scrollTargets.ts），
 * 容差 2px 只用于吸收子像素误差。
 *
 * 首屏（#top）也参与侦测：它排在 SECTIONS 第一位，页面滚到顶时它成为当前项，
 * 所以点「返回顶部」后首屏节点会亮起，而不是停留在「关于我」。
 */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState('')

  useEffect(() => {
    let raf = 0
    // 元素引用缓存（2026-09 移动端性能修复）：
    // 原来每帧对每个 id 调一次 document.getElementById —— 那是会触发样式/布局失效查询的 DOM 操作，
    // 滚动时约 60 次/秒 × 7 个 id。这些节点在整页生命周期内不会换，挂载时解析一次即可，
    // 只有 resize 才需要重解析（视口断点可能改变被测量的内容）。
    let els: (HTMLElement | null)[] = []
    const resolve = () => {
      els = ids.map((id) => document.getElementById(id))
    }

    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // ⚠️ `#docs` 是**跨视图**入口（hash 路由 `#/docs/ue5`），主页面里没有这个 section。
        // 这里提前退出并保持上一次的高亮，否则滚到底部时它会把高亮抢走。
        if (!els.some((el) => el !== null)) return

        // 判定线 = 当前视口宽度下的停靠位 + 容差
        const margin =
          window.matchMedia('(min-width: 640px)').matches
            ? SCROLL_MARGIN_DESKTOP_PX
            : SCROLL_MARGIN_MOBILE_PX
        const triggerLine = margin + SCROLL_TRIGGER_EPSILON_PX

        let bestId = ''
        let bestTop = -Infinity
        for (let i = 0; i < els.length; i++) {
          const el = els[i]
          if (!el) continue
          const top = el.getBoundingClientRect().top
          if (top <= triggerLine && top > bestTop) {
            bestTop = top
            bestId = ids[i]
          }
        }
        if (bestId) setActive(bestId)
      })
    }

    const onResize = () => {
      resolve()
      update()
    }

    resolve()
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  return active
}
