import { useEffect, type RefObject } from 'react'

/**
 * 触屏上的「滚动照亮」：与视口中线最近的那一个 `.glass-lit` 亮起。
 *
 * 为什么需要它（2026-09 第十四轮，用户实机反馈）
 *   手机 / 平板此前沿用的是桌面那套 `:hover`：**点一下才亮**，而且触屏的 `:hover`
 *   只被后续点击解除 —— 点过的卡片会一直亮着（实测点完滚动 420px 仍未脱开）。
 *   用户口径：「我希望是屏幕划到哪，或者说用户手机焦点在哪，哪里就有悬停或者选中的效果」。
 *
 * 三条设计约束（改这个钩子之前先读）
 *   ① **任何时刻只亮一块**：所以判定用"与视口中线最近"，不是"进入了视口"。
 *      后者在一屏有 3~4 张卡时会把它们同时点亮，那读起来不是"视线所在"而是"整页在闪"。
 *   ② **锚点在 0.42 而不是 0.5**：手机上底部压着 Tab Bar（约 90px），几何中线落在它后面，
 *      按 0.5 算会稳定地"亮下面那张"。
 *   ③ **不动桌面**：本钩子只在没有悬停能力的设备上做任何事（`(hover: hover)` 门）。
 *      桌面鼠标本来就会悬停，再叠一层滚动照亮会出现"卡片追着鼠标亮"的干扰。
 *      CSS 侧还有一道同样的门（`.glass-lit-scrolled` 只在
 *      `@media not all and (hover: hover)` 里生效），两道门都留着：
 *      钩子这门省掉无谓的开销，CSS 那门保证鼠标环境下即使加了类也没有视觉变化。
 *
 * 实现要点
 *   · **不监听滚动**：IntersectionObserver 以"整视口"为根，元素进 / 出视口时回调一次，
 *     只在那几次回调里量几何并落类。滚动过程中没有任何 getBoundingClientRect 调用，
 *     比在 scroll 事件里逐帧算便宜得多。
 *   · **活的候选集**：`.glass-lit` 是**动态**的 —— 筛选胶囊会随筛选重建、文档区正文是
 *     运行时 fetch 进 DOM 的。所以候选集靠两条增量维护：IntersectionObserver 的回调
 *     负责"进了 / 出了视口"，MutationObserver 只负责"新插入的节点补上 observe"，
 *     它本身不参与几何计算。
 *   · 只加 / 摘一个类，不写内联样式，也不碰 `aria-*`（"当前项"语义归 scroll spy 与组件自己管）。
 *
 * ⚠️ 与「选中态」的分工：本钩子加的 `.glass-lit-scrolled` 只出面光与那圈弥散内缘光，
 *   **不加底、不换文字色**（`--bar-control-lit-*` 那层只属于真正的选中项）。
 *   三级关系：`.glass-lit-on`（当前项）｜`.glass-lit-scrolled`（视线所在）｜`.glass-lit-press`（手指按下）。
 */
export function useInViewLight(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // ③ 桌面（有悬停能力）直接不启用
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (window.matchMedia('(hover: hover)').matches) return

    const host = root.current
    if (!host || !('IntersectionObserver' in window)) return

    /** 当前在视口内的候选（活的） */
    const live = new Set<Element>()
    /** 此刻被点亮的那个 */
    let lit: Element | null = null
    let raf = 0

    /** ② 锚点：视口高度的 42% 处 */
    const anchorY = () => window.innerHeight * 0.42

    const scan = () => {
      raf = 0
      const y0 = anchorY()
      let best: Element | null = null
      let bestDist = Infinity
      for (const el of live) {
        const r = el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) continue
        // 跨过锚点的元素优先（距离记 0）；否则按"元素竖直中心"与锚点的距离比
        const spans = r.top <= y0 && r.bottom >= y0
        const dist = spans ? 0 : Math.abs(r.top + r.height / 2 - y0)
        if (dist < bestDist) {
          bestDist = dist
          best = el
        }
      }
      // 只亮"确实与视口有交集"的那一个：滚到页脚时所有卡片都出视口，应当全灭
      if (best && bestDist <= window.innerHeight) {
        if (best !== lit) {
          lit?.classList.remove('glass-lit-scrolled')
          best.classList.add('glass-lit-scrolled')
          lit = best
        }
      } else if (lit) {
        lit.classList.remove('glass-lit-scrolled')
        lit = null
      }
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(scan)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) live.add(e.target)
          else {
            live.delete(e.target)
            // 离开视口的元素若正亮着，先摘掉，避免它带着类留在缓存里
            if (e.target === lit) {
              e.target.classList.remove('glass-lit-scrolled')
              lit = null
            }
          }
        }
        schedule()
      },
      // 整视口为根：进出各回调一次，中途不再打扰
      { root: null, rootMargin: '0px', threshold: 0 },
    )

    for (const el of host.querySelectorAll('.glass-lit')) io.observe(el)

    /**
     * 视图切换（主站 ↔ 文档区）与筛选重建之后，DOM 会换一批 `.glass-lit`。
     * DOM 变化不触发 scroll / resize，所以这里补 observe —— 只补观察，不做几何计算。
     */
    const mo = new MutationObserver(() => {
      for (const el of host.querySelectorAll('.glass-lit')) {
        if (!live.has(el)) io.observe(el)
      }
      schedule()
    })
    mo.observe(host, { childList: true, subtree: true })

    // 视口变化（旋转 / 地址栏收放）后锚点会变，重扫一次
    window.addEventListener('resize', schedule, { passive: true })
    window.visualViewport?.addEventListener('resize', schedule, { passive: true })
    schedule()

    return () => {
      io.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
      lit?.classList.remove('glass-lit-scrolled')
      live.clear()
    }
  }, [root])
}

/**
 * 触屏上的「按压反馈」：给 `.glass-lit` 那一族补一档"按下即亮、抬起即灭"的状态。
 *
 * 为什么不用 `:active`：触屏上它的时机由浏览器定 —— 移动端往往在 `touchend` 后立刻撤掉，
 * 长按或带手势时又可能压根不触发。用 `pointerdown` / `pointerup` 自己加类最稳，也最好调。
 * 类名 `.glass-lit-press`，材质在 index.css（**只出面光**，不加琥珀亮边，
 * 免得与"当前项"混淆 —— 点了会跳转的卡片按下去就整块点亮会读成"选中了"）。
 *
 * ⚠️ 顺带挂了一个只活 60ms 的 `.touch-tap` 钩子类，用来兜"某条悬停规则漏了能力门"的情况。
 *   它**目前没有对应的 CSS 规则**（第十四轮试过一版压制规则，会把滚动照亮一起压掉，
 *   反而出现"一按就灭"，已撤）。留着是因为漏门这种事只能事后发现，
 *   真出现时在这里点名处理即可，不必再动钩子结构。
 */
export function useTouchPress(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (window.matchMedia('(hover: hover)').matches) return
    const host = root.current
    if (!host) return

    let pressed: Element | null = null
    let releaseTimer = 0
    let tapTimer = 0

    const onDown = (e: PointerEvent) => {
      // 摘掉上一次点击残留的 :hover 观感（触屏的 :hover 只被后续点击解除）
      host.classList.add('touch-tap')
      window.clearTimeout(tapTimer)
      tapTimer = window.setTimeout(() => host.classList.remove('touch-tap'), 60)

      const target = e.target instanceof Element ? e.target.closest('.glass-lit') : null
      if (target && target !== pressed) {
        pressed?.classList.remove('glass-lit-press')
        target.classList.add('glass-lit-press')
        pressed = target
      }
      window.clearTimeout(releaseTimer)
    }

    const release = () => {
      // 抬起后留一小段，让"按下"这一下看得见（跳转前的一帧反馈）
      window.clearTimeout(releaseTimer)
      releaseTimer = window.setTimeout(() => {
        pressed?.classList.remove('glass-lit-press')
        pressed = null
      }, 180)
    }

    host.addEventListener('pointerdown', onDown, { passive: true })
    host.addEventListener('pointerup', release, { passive: true })
    host.addEventListener('pointercancel', release, { passive: true })
    return () => {
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointerup', release)
      host.removeEventListener('pointercancel', release)
      window.clearTimeout(releaseTimer)
      window.clearTimeout(tapTimer)
      host.classList.remove('touch-tap')
      pressed?.classList.remove('glass-lit-press')
    }
  }, [root])
}
