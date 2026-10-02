import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { parseDocsHash, type DocsRoute } from '../data/docs'

/**
 * 极简 hash 路由：只服务文档区（`#/docs/<分区>/<页>`）。
 *
 * 解析本身在 `src/data/docs.ts`（与拼地址的 docsHref 同源），这里只负责
 * "订阅 hashchange + 管好文档区特有的两件副作用"。
 *
 * 为什么不用 react-router：全站只有"主页 / 文档区"两个视图，
 *   引一个路由库只为解析一个 hash，不划算。
 */
const read = (): DocsRoute | null =>
  typeof window === 'undefined' ? null : parseDocsHash(window.location.hash)

/**
 * 路由级过渡：用 **View Transitions API** 给"换分区 / 退回一级 / 回主站"做丝滑淡入。
 *
 * ⚠️ 为什么用 View Transitions 而不是自己写两层 DOM 交叉淡入：
 *    它由浏览器**快照新旧两帧**再交叉播放，不用我们把旧视图留在 DOM 里 ——
 *    而这里的"视图"是整棵文档区（左栏 + 正文 + 表格），自己搭双缓冲代价太大、易出 bug。
 *    **同文档 View Transitions 已于 2025-10 成为 Baseline**（Chrome 111+ / Safari 18+ /
 *    Firefox 144+），不支持的浏览器会**直接跳过动画**（属性不存在 → 走原逻辑），
 *    属于纯增强，不需要 polyfill。
 *
 * ⚠️⚠️ 必须 `flushSync`：`startViewTransition` 在回调返回后**立刻**给 DOM 拍照，
 *    而 React 的 `setState` 是异步的 —— 不强制同步刷新的话拍到的还是旧 DOM，动画等于没有。
 *    `flushSync` 只在这一个事件回调里用，不影响别处的并发渲染。
 *
 * ⚠️ 只在**视图真的会变**的时候起过渡（避免初始加载也淡入一次、以及同一路由的重复点击）。
 */
type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

/** 路由指纹：**必须把"不在文档区"也算进去**，否则"文档区 → 主站"这条路径永远判为没变化、不起过渡 */
const fp = (r: DocsRoute | null) => (r ? `${r.section ?? ''}/${r.pageId ?? ''}` : '(main)')

/**
 * ⚠️⚠️ **必须做成模块级单例**：`useDocsRoute` 被**两个组件**调用
 *    （`App.tsx` 取整条路由、`TopBar.tsx` 只取 `isDocs`）。
 *    早先每个实例各挂一个 `hashchange` 监听器 —— 一次换页会**触发两次 View Transition**
 *    （实测拦截 `startViewTransition` 得到每步 2 次调用，时间戳完全相同），
 *    而且两套 `lastKey` 各算各的，其中一套会把 `location.hash` 已变过的值当成初值，
 *    于是 ①「一级 → 二级」和 ④「回主站」那两步的过渡被静默跳过。
 *    现在：**只有一处监听、一次过渡、一次 setState**，所有实例订阅同一份状态。
 */
let currentRoute: DocsRoute | null = typeof window === 'undefined' ? null : parseDocsHash(window.location.hash)
let lastRouteKey = fp(currentRoute)
let started = false
const subscribers = new Set<(r: DocsRoute | null) => void>()

function startStore() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('hashchange', () => {
    const next = read()
    const changed = lastRouteKey !== fp(next)
    const doc = document as VTDoc
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const publish = () => {
      currentRoute = next
      for (const fn of subscribers) fn(next)
    }
    lastRouteKey = fp(next)
    /** 路由没变（例如重复点同一个条目）→ 不起过渡，也不打扰订阅者 */
    if (!changed) return
    if (!doc.startViewTransition || reduced) {
      publish()
      return
    }
    doc.startViewTransition(() => {
      flushSync(publish)
    })
  })
}

function subscribe(fn: (r: DocsRoute | null) => void) {
  startStore()
  subscribers.add(fn)
  /* ⚠️ 清理函数必须返回 void：`subscribers.delete()` 返回 boolean，直接返回会被 TS 拒（EffectCallback） */
  return () => {
    subscribers.delete(fn)
  }
}

export function useDocsRoute(): { isDocs: boolean; section?: string; pageId?: string; anchor?: string } {
  const [route, setRoute] = useState<DocsRoute | null>(currentRoute)

  useEffect(() => {
    /** 订阅前先把当前值同步一次：另一个实例可能已经换过页了 */
    setRoute(currentRoute)
    return subscribe(setRoute)
  }, [])

  // 视图切换时把滚动位置交还给新视图（否则从文档底部切回主页会落在半空）。
  // ⚠️ `'instant'` 而不是 `'auto'`：`auto` 会套用 html 上的 `scroll-behavior: smooth`，
  //    切视图时能看见"整页自己滚回顶部"的动画。
  useEffect(() => {
    if (route) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [route?.section, route?.pageId])

  /**
   * 文档区的「固定外壳」开关。
   *
   * 桌面端（md 及以上）文档区换成内部滚动：页面本身不滚，只有正文列滚，
   * 左右两栏才能钉在视口里不动（用户明确要求"左侧那一栏连带着下面的导航一起固定住"）。
   * 这条类名配合 `index.css` 里的 `html.docs-shell { overflow: clip }` 与
   * `TopBar` 的 `.site-bar.is-fixed`（页面不滚了，sticky 无从粘起，必须改 fixed）。
   *
   * ⚠️ 三处断点必须一致：这里、`index.css` 的 `@media (min-width: 768px)`、`Docs.tsx` 的 `md:`。
   * ⚠️ 用 `matchMedia` 而不是 CSS 类切换：`overflow: clip` 会让页面无法滚动，
   *    如果手机端也被加上，就没有任何滚动手段了（侧栏在手机端根本不存在）。
   * ⚠️ 卸载时必须移除类名，否则切回主站后页面永远滚不动。
   */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => document.documentElement.classList.toggle('docs-shell', Boolean(route) && mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.classList.remove('docs-shell')
    }
  }, [Boolean(route)])

  return { isDocs: Boolean(route), section: route?.section, pageId: route?.pageId, anchor: route?.anchor }
}
