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
export interface DocsRoute {
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

  return route
}
