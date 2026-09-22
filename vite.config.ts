import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// 字体预加载（src/fonts，由 @font-face 引用）；构建后把这些字体的 <link rel="preload" as="font">
// 注入 dist/index.html 的 <head>——HTML 解析时立即发起请求，早于 CSS/JS，消除字体滞后覆盖（FOUT）。
// 字体文件名在构建后带 hash，故采用 closeBundle 后处理（读实际产物名），而非写死 URL。
//
// ⚠️ 只 preload「首屏第一帧真的会画出这个字重」的字体，其余交给浏览器按需取。
//    原因：Noto Sans SC 的中文子集约 **146KB/字重**（实测 400/500/700 = 144/146/147 KB，
//    woff2 已是压缩格式，gzip/brotli 压不动）。分级依据是「首屏第一帧是否用这个字重」：
//      400 → Hero 学历行 / 短句 / 段落（正文）        → preload high
//      500 → Hero 方向行 / 副题、吸顶导航品牌（font-medium）→ preload high
//      700 → 首屏不用（Hero 名字走内联的柳建毛草，不是 Noto 700）；
//            最早出现在区块标题与卡片名（`font-bold`）→ **不 preload**，H2 布局时自然触发
//    900 档已整体删除（全站无引用，见 scripts/subset-fonts.mjs）。
//    ⚠️ 若将来首屏出现 700 的大字（例如给 Hero 加粗体标题），必须把它加回本列表，
//       否则会出现「先 400 后跳 700」的可视字重跳变。
// 注意：Liu Jian Mao Cao（名字）已 base64 内嵌进 index.html（font-face-inline，随 HTML 到达）；
// Smiley Sans（得意黑）**不再内联**，走外部字体文件按需加载（见 scripts/inline-firstscreen-fonts.mjs 的文件头注释）。
const FONT_FILES: { file: string; priority: 'high' | 'low' }[] = [
  { file: 'noto-sans-sc-400.woff2', priority: 'high' }, // 首屏正文
  { file: 'noto-sans-sc-500.woff2', priority: 'high' }, // 首屏小字（方向行 / 副题 / 导航品牌）
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
      for (const { file, priority } of FONT_FILES) {
        const hashed = files.find((x) => x.startsWith(file.replace('.woff2', '')))
        if (hashed) {
          links.push(
            `<link rel="preload" href="./assets/${hashed}" as="font" type="font/woff2" crossorigin="anonymous" fetchpriority="${priority}" />`,
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
