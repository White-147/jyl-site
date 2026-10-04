import { useEffect, useState } from 'react'
import {
  SCROLL_MARGIN_DESKTOP_PX,
  SCROLL_MARGIN_MOBILE_PX,
  SCROLL_TRIGGER_EPSILON_PX,
} from '../data/scrollTargets'

/**
 * 程序化锚点滚动的**抑制窗口**（2026-10 加，修「点 Tab 时高亮一路接力」）。
 *
 * 现象（真机 + CDP 实测，390×844）：从顶部点「联系」，`scroll-behavior: smooth`
 * 把它做成一段 **1.45 秒**的动画，滚动经过每个区块 → 侦测按真实位置逐档更新 →
 * 高亮在 1.5 秒里换 **6 次**（关于 → 项目 → 技能 → 经历 → 空 → 联系）。用户口径：
 * 「手机端滑动的自动选中效果和之前比起来有一些奇怪，就是没那么丝滑」。
 *
 * 修法：锚点滚动期间**暂停**滚动侦测，并在**点击当帧**直接把高亮置到目标 ——
 * 用户自己点的目标，先亮起来比"跟着动画跑到那"更符合预期，中间那串接力也不再出现。
 *
 * ⚠️ 用模块级事件而不是 React Context：`useScrollSpy` 有**两个**消费者
 *    （`MobileTabBar` 与 `SideDotsNav` 的 Rail，各挂各的监听），Context 要改组件树，
 *    而这里只需要一个"广播一次、所有实例都收到"的通道。
 * ⚠️ 兜底超时不能省：`settleAndMeasure` 最长等 200 帧（约 3.3s），
 *    万一事件没到（异常路径），抑制不能永久生效，否则侦测就死了。
 */
const SUPPRESS_EVENT = 'dsh:scrollspy-suppress'
const RELEASE_EVENT = 'dsh:scrollspy-release'
const SUPPRESS_MAX_MS = 5000

/** 锚点滚动开始时调用：抑制侦测 + 立刻把高亮置到目标 */
export function announceAnchorScroll(targetId: string) {
  window.dispatchEvent(new CustomEvent(SUPPRESS_EVENT, { detail: { targetId } }))
}

/** 滚动停稳后调用：恢复侦测 */
export function announceAnchorScrollEnd() {
  window.dispatchEvent(new Event(RELEASE_EVENT))
}

/**
 * 滚动侦测：返回当前正在阅读的区块 id（用于导航高亮）。
 *
 * 判定规则：取「顶部已经越过触发线、且最靠下」的那个板块 = 当前在读。
 * 这与「点锚点跳转后落点恰好等于停靠位」是同一个坐标系：
 * 段落停靠在 X 处 → 它的 top = X ≤ 判定线 → 它成为最靠下的通过者 → 高亮它。
 *
 * ⚠️ 联动维护点（详见 MAINTAINING.md 第 4 条）
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
    /** 抑制中：程序化锚点滚动正在进行，滚动侦测不发车 */
    let suppressed = false
    let suppressTimer = 0
    // 元素引用缓存（2026-09 移动端性能修复）：
    // 原来每帧对每个 id 调一次 document.getElementById —— 那是会触发样式/布局失效查询的 DOM 操作，
    // 滚动时约 60 次/秒 × 7 个 id。这些节点在整页生命周期内不会换，挂载时解析一次即可，
    // 只有 resize 才需要重解析（视口断点可能改变被测量的内容）。
    let els: (HTMLElement | null)[] = []
    const resolve = () => {
      els = ids.map((id) => document.getElementById(id))
    }

    const update = () => {
      // ⚠️ 抑制期间**连 rAF 都不排**：排了也只是白算一次然后被丢掉。
      if (suppressed) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (suppressed) return
        // ⚠️ `#docs` 是**跨视图**入口（hash 路由 `#/docs`），主页面里没有这个 section。
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

    /** 锚点滚动开始：停侦测 + 立刻亮到目标（目标不存在就不动，免得出现空档） */
    const onSuppress = (e: Event) => {
      const targetId = (e as CustomEvent<{ targetId?: string }>).detail?.targetId
      suppressed = true
      window.clearTimeout(suppressTimer)
      suppressTimer = window.setTimeout(() => {
        suppressed = false
        update()
      }, SUPPRESS_MAX_MS)
      cancelAnimationFrame(raf)
      if (targetId && ids.includes(targetId)) setActive(targetId)
    }
    const onRelease = () => {
      window.clearTimeout(suppressTimer)
      suppressed = false
      // 停稳后按真实位置对齐一次：把"少滚一段"那类偏差也一起收掉
      update()
    }

    const onResize = () => {
      resolve()
      update()
    }

    resolve()
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener(SUPPRESS_EVENT, onSuppress)
    window.addEventListener(RELEASE_EVENT, onRelease)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(suppressTimer)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', onResize)
      window.removeEventListener(SUPPRESS_EVENT, onSuppress)
      window.removeEventListener(RELEASE_EVENT, onRelease)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  return active
}
