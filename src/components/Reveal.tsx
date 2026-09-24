import { useEffect, useRef, useState, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

/**
 * 滚动渐显：每次进入视口都会重新触发（离开后再次进入会重新播放动画）。
 *
 * ⚠️ 但**首屏（含下面两屏）例外** —— 见下方 `skipTransition`。用户 2026-09 确认的方案甲。
 */
export default function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  /** 首屏预展开的那一批不播过渡（挂了 transition 会看到"从透明淡进来"的等待感） */
  const skipTransition = useRef(false)
  /**
   * 预展开过的那一批**永久保持可见**。
   *
   * ⚠️ 这里踩过一个坑：只 `setVisible(true)` 是不够的 —— 紧接着 IntersectionObserver 就会
   *    对折叠线以下的元素回调 `isIntersecting: false`，把它们**又按回不可见**。
   *    实测症状是"5 个区块拿到了 reveal-instant，却只有 1 个真的可见"，等于预展开没生效。
   *    所以预展开过的不再交给观察器管。
   */
  const preRevealed = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    /**
     * 「首屏预展开两屏」（用户 2026-09 确认的方案甲）。
     *
     * ⚠️ 为什么需要：全站 33 个区块都从 `opacity: 0` 起步，只有进视口才显示。
     *    行为本身没错，但后果是**首屏以下永远是空的** —— 高视口、整页截图、
     *    以及任何不滚动的查看方式（打印、无头截图、DevTools 全页快照）都只会看到
     *    「Hero + 一大片空白」，读起来就是"页面没加载完"。
     *    这里在挂载时把**视口 2 倍高度以内**的区块直接设为可见，且**跳过过渡**，
     *    于是它们与首屏一起出现，没有等待感。更下方的区块仍然保留滚动渐显 ——
     *    入场动画没有被取消，只是不再挡住第一眼。
     */
    if (el.getBoundingClientRect().top < window.innerHeight * 2) {
      skipTransition.current = true
      preRevealed.current = true
      setVisible(true)
    }
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    /** 预展开过的不再交给观察器（否则会被立刻按回不可见） */
    if (preRevealed.current) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisible(entry.isIntersecting)
        })
      },
      // 提前 64px 触发：让入场在元素进入视口时**已经**开始，
      // 而不是等它到位后才起步（原 -32px 会让整站读起来比实际慢）
      { threshold: 0.06, rootMargin: '0px 0px 64px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} ${skipTransition.current ? 'reveal-instant' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
