/**
 * 文档区的地址规则（**唯一来源**）。
 *
 * 路由形态：`#/docs` · `#/docs/<分区>` · `#/docs/<分区>/<页 id>?s=<标题锚点>`
 *
 * 为什么用 hash 而不是路径路由：
 *   站点部署在 GitHub Pages（无服务端重写），路径路由要靠 404.html 兜底，
 *   而 `public/404.html` 现在承担的是**预览产物深链**的兜底。hash 不需要任何服务端配合，
 *   在 GitHub Pages、Cloudflare Pages、本地 file:// 预览下行为完全一致。
 *
 * 为什么单独成模块：路由串的**拼**（侧栏、篇尾、互链）与**解**（useDocsRoute）必须同源。
 *   早先拼在 Docs.tsx、解在 useDocsRoute.ts，两边各写一份 `#/docs/ue5/...` 的前缀，
 *   分区一改就要动两处 —— 这类漂移不会报错，只会静默生成 404 式死链。
 */

/** 页面 HTML 相对 public/ 的路径前缀（manifest 里的 html 字段已经带了 `pages/`） */
export const DOCS_FETCH_BASE = 'docs'

export interface DocsRoute {
  /** 分区 id（`thesis` / `theory` / `combat`）。未指定 = 进第一个分区 */
  section?: string
  /** 页 id（源内拆出来的某一页）。未指定 = 进该分区第一篇 */
  pageId?: string
  /** 页内标题锚点（`?s=<heading id>`） */
  anchor?: string
}

/** 解析 `#/docs...`；返回 null 表示当前不在文档区 */
export function parseDocsHash(hash: string): DocsRoute | null {
  if (!hash.startsWith('#/docs')) return null
  const rest = hash.slice('#/docs'.length).replace(/^\//, '')
  const [pathPart, queryPart] = rest.split('?')
  const segs = pathPart.split('/').filter(Boolean).map(decodeURIComponent)
  const anchor = new URLSearchParams(queryPart ?? '').get('s') ?? undefined
  return { section: segs[0], pageId: segs[1], anchor }
}

/** 拼文档区地址。`pageId` 省略 = 分区入口（由 Docs.tsx 落到该区第一篇） */
export function docsHref(section: string, pageId?: string, anchor?: string): string {
  const base = `#/docs/${encodeURIComponent(section)}${pageId ? `/${encodeURIComponent(pageId)}` : ''}`
  return anchor ? `${base}?s=${encodeURIComponent(anchor)}` : base
}

/** 文档区总入口（顶栏「笔记」用） */
export const DOCS_HOME = '#/docs'
