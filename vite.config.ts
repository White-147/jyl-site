import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// 首屏字体（src/fonts，由 @font-face 引用）；构建后把这些字体的 <link rel="preload" as="font">
// 注入 dist/index.html 的 <head>——HTML 解析时立即发起请求，早于 CSS/JS，消除字体滞后覆盖（FOUT）。
// 字体文件名在构建后带 hash，故采用 closeBundle 后处理（读实际产物名），而非写死 URL。
// 注意：Liu Jian Mao Cao（名字）与 Smiley Sans（得意黑）已 base64 内嵌进 index.html（font-face-inline，
// 随 HTML 到达），此处仅预加载 Noto Sans SC 三个正文字重。
const FONT_FILES = [
  'noto-sans-sc-400.woff2', // 正文 400
  'noto-sans-sc-500.woff2', // 正文 500
  'noto-sans-sc-900.woff2', // 正文 900（粗标题）
]

function injectFontPreload(): Plugin {
  return {
    name: 'inject-font-preload',
    apply: 'build',
    closeBundle() {
      const outDir = 'dist/assets'
      if (!existsSync(outDir)) return
      const files = readdirSync(outDir).filter((f) => f.endsWith('.woff2'))
      const links: string[] = []
      for (const f of FONT_FILES) {
        const hashed = files.find((x) => x.startsWith(f.replace('.woff2', '')))
        if (hashed) {
          links.push(
            `<link rel="preload" href="./assets/${hashed}" as="font" type="font/woff2" crossorigin="anonymous" />`,
          )
        }
      }
      if (links.length === 0) return
      const htmlPath = 'dist/index.html'
      if (!existsSync(htmlPath)) return
      let html = readFileSync(htmlPath, 'utf8')
      // 幂等：已存在则替换
      html = html.replace(/<!-- font-preload-injected -->[\s\S]*?<\/head>/, '</head>')
      const inject = `${links.join('\n    ')}\n    <!-- font-preload-injected -->`
      html = html.replace('</head>', `${inject}\n  </head>`)
      writeFileSync(htmlPath, html, 'utf8')
      console.log(`[font-preload] injected ${links.length} preload links into dist/index.html`)
    },
  }
}

// https://vite.dev/config/
// base: './' —— 支持部署在 GitHub Pages 子路径（/portfolio/）下
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), injectFontPreload()],
})
