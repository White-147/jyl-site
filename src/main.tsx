import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 字体：站点专用子集（见 scripts/subset-fonts.mjs 与 src/fonts/），@font-face 在 index.css
import './index.css'
// —— 首屏字体预加载 ——
// @font-face 均为 font-display: swap 且无预加载时，字体会在 CSS 解析后才发起请求，
// 首帧只能用后备字体渲染（名字草书/得意黑标题跳变最明显），字体到达后再"覆盖式"替换。
// 由 Vite 资源导入拿到构建后的哈希 URL，与 JS/CSS 并行下载，首屏即命中目标字体。
import smileyUrl from './fonts/smiley-sans-oblique.woff2'
import liuJianUrl from './fonts/liu-jian-mao-cao-regular.woff2'
import noto400Url from './fonts/noto-sans-sc-400.woff2'
import noto500Url from './fonts/noto-sans-sc-500.woff2'
import noto900Url from './fonts/noto-sans-sc-900.woff2'

function preloadFont(url: string) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.href = url
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

preloadFont(smileyUrl)
preloadFont(liuJianUrl)
preloadFont(noto400Url)
preloadFont(noto500Url)
preloadFont(noto900Url)

import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
