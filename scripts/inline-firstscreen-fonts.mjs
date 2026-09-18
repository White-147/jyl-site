// 首屏字体内联：把 src/fonts 里已子集化的两个展示字体以 base64 内联进 index.html。
//
// 为什么需要这个脚本：
//   柳建毛草（Hero 名字）与得意黑（区块标题）在首屏关键路径上，
//   若走外部字体文件会出现「先回退字体、后覆盖」的跳变。内联后随 HTML 一起到达。
//   代价是 index.html 变大（两个字体约 137KB → base64 约 180KB），
//   但 HTML 会走 gzip/brotli，实际传输增量远小于此。
//
// 为什么之前是个隐患：
//   这段 base64 原先由人工粘贴写入 index.html，**没有任何生成器**，
//   而且内联的是子集化之前的旧文件。文案变更后重跑 subset-fonts.mjs 时，
//   src/fonts 会更新但 index.html 里的内联副本不会，两者静默不一致。
//   本脚本让内联内容与 src/fonts 保持同源，幂等可重跑。
//
// 用法：node scripts/inline-firstscreen-fonts.mjs
//       在 subset-fonts.mjs 之后运行（npm run fonts:subset 已包含）。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = join(root, 'index.html')

/** 内联哪两个字体、用哪个 family 名（必须与 src/index.css 的 @font-face 完全一致） */
const FONTS = [
  { family: 'Liu Jian Mao Cao', file: 'liu-jian-mao-cao-regular.woff2' },
  { family: 'Smiley Sans', file: 'smiley-sans-oblique.woff2' },
]

const START = '<!-- firstscreen-fonts-inline:start -->'
const END = '<!-- firstscreen-fonts-inline:end -->'

function block() {
  const faces = FONTS.map(({ family, file }) => {
    const abs = join(root, 'src', 'fonts', file)
    if (!existsSync(abs)) {
      throw new Error(`缺少字体子集 ${file}，请先运行 node scripts/subset-fonts.mjs`)
    }
    const b64 = readFileSync(abs).toString('base64')
    return (
      `      @font-face {\n` +
      `        font-family: "${family}";\n` +
      `        font-style: normal;\n` +
      `        font-weight: 400;\n` +
      `        font-display: swap;\n` +
      `        src: url(data:font/woff2;base64,${b64}) format("woff2");\n` +
      `      }`
    )
  }).join('\n')

  const sizes = FONTS.map(({ file }) => {
    const kb = Math.round(readFileSync(join(root, 'src', 'fonts', file)).length / 1024)
    return `${file} ${kb}KB`
  }).join(' / ')

  return (
    `${START}\n` +
    `    <!-- 首屏专属字体内联（base64）：名字草书 + 得意黑随 HTML 一起到达，避免回退字体跳变。\n` +
    `         内容由 node scripts/inline-firstscreen-fonts.mjs 从 src/fonts 生成，请勿手改。\n` +
    `         来源：${sizes} -->\n` +
    `    <style id="font-face-inline">\n` +
    `${faces}\n` +
    `    </style>\n` +
    `    ${END}`
  )
}

const html = readFileSync(htmlPath, 'utf8')
const next = block()

let out
if (html.includes(START) && html.includes(END)) {
  out = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), next)
} else {
  // 首次运行：替换掉旧的无标记内联块（<style id="font-face-inline">…</style>）
  const legacy = /<style id="font-face-inline">[\s\S]*?<\/style>/
  if (!legacy.test(html)) {
    throw new Error('在 index.html 中既找不到内联标记，也找不到 <style id="font-face-inline">，请手动确认结构')
  }
  out = html.replace(legacy, next)
}

if (out === html) {
  console.log('[inline-firstscreen-fonts] 内联内容已是最新，无需改动。')
} else {
  writeFileSync(htmlPath, out, 'utf8')
  console.log(`[inline-firstscreen-fonts] 已更新 index.html 内联字体（${FONTS.length} 个）。`)
}
console.log(`  index.html：${Math.round(readFileSync(htmlPath).length / 1024)} KB`)
