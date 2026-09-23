import { useEffect, useState } from 'react'
import { parseDocsHash } from '../components/Docs'

/**
 * 极简 hash 路由：只服务 UE 文档区（`#/docs/ue5/<docId>`）。
 *
 * 为什么用 hash 而不是路径路由：
 *   站点部署在 GitHub Pages（无服务端重写），路径路由要靠 404.html 兜底，
 *   而 `public/404.html` 现在承担的是**预览产物深链**的兜底。hash 不需要任何服务端配合，
 *   在 GitHub Pages、Cloudflare Pages、本地 file:// 预览下行为完全一致。
 *
 * 为什么不用 react-router：全站只有"主页 / 文档区"两个视图，
 *   引一个路由库只为解析一个 hash，不划算。
 */
interface DocsRoute {
  isDocs: boolean
  docId?: string
  anchor?: string
}

const read = (): DocsRoute => {
  const parsed = typeof window === 'undefined' ? null : parseDocsHash(window.location.hash)
  return parsed ? { isDocs: true, docId: parsed.docId, anchor: parsed.anchor } : { isDocs: false }
}

export function useDocsRoute(): DocsRoute {
  const [route, setRoute] = useState<DocsRoute>(read)

  useEffect(() => {
    const onHash = () => setRoute(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 视图切换时把滚动位置交还给新视图（否则从文档底部切回主页会落在半空）
  useEffect(() => {
    if (route.isDocs) window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route.isDocs])

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
    const apply = () => {
      const on = route.isDocs && mq.matches
      document.documentElement.classList.toggle('docs-shell', on)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.classList.remove('docs-shell')
    }
  }, [route.isDocs])

  return route
}
