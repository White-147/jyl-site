import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 字体：站点专用子集（见 scripts/subset-fonts.mjs 与 src/fonts/），@font-face 在 index.css
// 首屏字体 <link rel="preload" as="font"> 由 vite.config.ts 的 injectFontPreload 插件在构建时
// 注入 dist/index.html 的 <head>（HTML 解析即发起请求，早于 CSS/JS，消除 FOUT）
import './index.css'

import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
