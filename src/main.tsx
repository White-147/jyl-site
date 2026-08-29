import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 字体：站点专用子集（见 scripts/subset-fonts.mjs 与 src/fonts/），@font-face 在 index.css
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
