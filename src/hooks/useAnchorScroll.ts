import { useCallback, useEffect, useRef } from 'react'
import {
  SCROLL_MARGIN_DESKTOP_PX,
  SCROLL_MARGIN_MOBILE_PX,
} from '../data/scrollTargets'
import { HERO_ID } from '../data/navigation'

/**
 * 锚点跳转（统一入口）。
 *
 * ⚠️ 为什么不用原生 `href="#id"` 的默认行为
 * 实测（生产构建、多种视口）：**页面静定后的首次原生 hash 跳转会少滚一段**，
 * 落点偏差 30–130px 不等；第二次跳转才正确。用 `scrollIntoView({behavior:'smooth'})`
 * 手动滚也有同样现象。这是浏览器在「布局仍在收敛时执行锚点滚动」的行为，不是偏移量算错
 * —— 同一页面上 `behavior:'instant'` 每次都能落到正确位置。
 *
 * 因此这里采用「平滑滚动 + 停稳后校验 + 偏差则 instant 纠正」：
 *   - 正常情况：平滑滚动，落点误差 ≤2px，不做任何额外动作
 *   - 浏览器少滚时：停稳后一次性归位，用户看到的是"轻轻对齐"，而不是停在错位置
 *
 * 落点本身由 CSS 的 `scroll-margin-top`（anchor-offset 工具类）决定，本 hook 不参与计算，
 * 只负责「确保真的滚到那里」。目标位置由 scrollTargets.ts 提供，与侦测线同源。
 */

/** 允许的落点误差（px）。超过就纠正。 */
const TOLERANCE_PX = 2

function expectedOffset(): number {
  return window.matchMedia('(min-width: 640px)').matches
    ? SCROLL_MARGIN_DESKTOP_PX
    : SCROLL_MARGIN_MOBILE_PX
}

/** 等待滚动停稳，然后返回实际落点与预期落点的偏差 */
function settleAndMeasure(el: HTMLElement | null, expected: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    let still = 0
    let last = window.scrollY
    const tick = () => {
      frames++
      const y = window.scrollY
      if (Math.abs(y - last) < 0.5) still++
      else {
        still = 0
        last = y
      }
      // 连续 8 帧不动视为停稳；最多等 200 帧（约 3.3s）兜底
      if (still > 8 || frames > 200) {
        const actual = el ? el.getBoundingClientRect().top : 0
        resolve(Math.abs(actual - expected))
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

export function useAnchorScroll() {
  /** 上一次跳转的收尾定时器，新的跳转会取消它，避免互相干扰 */
  const pending = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(pending.current), [])

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    // 首屏：直接回到 0，不需要 scroll-margin 参与
    if (id === HERO_ID || !el) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      window.clearTimeout(pending.current)
      void settleAndMeasure(null, 0).then((err) => {
        if (err > TOLERANCE_PX) window.scrollTo(0, 0)
      })
      return
    }

    const expected = expectedOffset()
    el.scrollIntoView({ block: 'start', behavior: 'smooth' })

    window.clearTimeout(pending.current)
    // 等平滑滚动走完再校验；中途用户自己滚动的话，误差测量会失败但也不会乱跳
    void settleAndMeasure(el, expected).then((err) => {
      if (err > TOLERANCE_PX) {
        el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
      }
    })
  }, [])

  /**
   * 生成锚点链接的点击处理函数。
   * 用 `history.replaceState` 而不是改 `location.hash`：
   * 后者会触发浏览器的原生锚点滚动，与我们的滚动互相打架。
   */
  const onAnchorClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      // 保留新标签页/新窗口等原生行为
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      event.preventDefault()
      history.replaceState(null, '', id === HERO_ID ? location.pathname + location.search : `#${id}`)
      scrollToId(id)
    },
    [scrollToId],
  )

  return { scrollToId, onAnchorClick }
}

/**
 * 深链兜底：URL 带 `#id` 打开时，浏览器可能同样少滚一段。
 * 页面静定后校验一次，偏差则静默纠正（不改动 hash）。
 *
 * ⚠️ 必须**同时监听 `hashchange`**（2026-09 修）。只跑一次挂载的话，
 *    从文档区点 `#projects` 这类跨区入口会失效：hash 变了、App 切回了主站，
 *    但这个 hook 早就跑完了，而浏览器原生跳转发生在那一刻 `#projects` 还不存在 ——
 *    实测结果是「路由切过去了，页面停在 scrollY=0，#projects 在视口下方 2130px」。
 *    代价是主站内部点锚点时这里也会跟着校验一次，和 `onAnchorClick` 的落点修正重叠；
 *    两者都只在偏差 > 6px 时才动手，重复执行是幂等的。
 */
export function useDeepLinkCorrection() {
  useEffect(() => {
    let timer = 0
    const correct = () => {
      window.clearTimeout(timer)
      const id = location.hash.replace(/^#/, '')
      if (!id || id === HERO_ID) return
      // 路由型 hash（`#/docs/...`）不是页内锚点：既没有对应元素，也不该被"纠正"。
      // 文档区自己处理 `?s=<heading id>` 的定位（见 Docs.tsx）。
      if (id.startsWith('/')) return
      // 跨区跳转时目标元素要等 React 渲染完才存在，所以延后一轮再查
      timer = window.setTimeout(() => {
        const el = document.getElementById(id)
        if (!el) return
        void settleAndMeasure(el, expectedOffset()).then((err) => {
          if (err > TOLERANCE_PX) {
            el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
          }
        })
      }, 260)
    }
    correct()
    window.addEventListener('hashchange', correct)
    return () => {
      window.removeEventListener('hashchange', correct)
      window.clearTimeout(timer)
    }
  }, [])
}
