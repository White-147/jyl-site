import { useEffect, useState } from 'react'
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

export function useDocsRoute(): { isDocs: boolean; section?: string; pageId?: string; anchor?: string } {
  const [route, setRoute] = useState<DocsRoute | null>(read)

  useEffect(() => {
    const onHash = () => setRoute(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
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
