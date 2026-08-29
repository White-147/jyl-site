// 字体子集化管线：从站点源码提取用到的全部字符，将 Noto Sans SC（4 字重）
// 裁剪为站点专用 woff2；JetBrains Mono 直接取 latin 子集。
// 用法：node scripts/subset-fonts.mjs
// 内容更新（新增文字）后重新运行本脚本即可。
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function listFiles(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git' || name === '_archive' || name.startsWith('.')) continue
      files.push(...listFiles(p))
    } else {
      files.push(p)
    }
  }
  return files
}

// 1. 收集站点字符集
const set = new Set()
const add = (s) => { for (const ch of s) set.add(ch) }
const TARGETS = [
  { re: /\.(tsx|ts)$/, dirs: ['src'] },
  { re: /\.json$/, dirs: ['src/data'] },
  { re: /^index\.html$/, dirs: ['.'] },
]
for (const { re, dirs } of TARGETS) {
  for (const d of dirs) {
    for (const f of listFiles(join(root, d))) {
      if (!re.test(f)) continue
      add(readFileSync(f, 'utf8'))
    }
  }
}
// 补充常用符号集合（数字、英文、常见标点与空格），避免漏字导致字体回退
add('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .，。；：、？！（）【】《》—…·“”‘’+-*/=%#&@_<>[]{}\'"`~^|\\:;!?.,()')
const text = [...set].sort().join('')
console.log(`✔ 字符集：${text.length} 个字符`)

// 2. 子集化 Noto Sans SC（源：fontsource 简体中文全量 woff2）
mkdirSync(join(root, 'src', 'fonts'), { recursive: true })
const NOTO = [
  [400, 'noto-sans-sc-chinese-simplified-400-normal.woff2'],
  [500, 'noto-sans-sc-chinese-simplified-500-normal.woff2'],
  [700, 'noto-sans-sc-chinese-simplified-700-normal.woff2'],
  [900, 'noto-sans-sc-chinese-simplified-900-normal.woff2'],
]
for (const [weight, file] of NOTO) {
  const src = join(root, 'node_modules', '@fontsource', 'noto-sans-sc', 'files', file)
  const buf = await subsetFont(readFileSync(src), text, { targetFormat: 'woff2' })
  const out = join(root, 'src', 'fonts', `noto-sans-sc-${weight}.woff2`)
  writeFileSync(out, buf)
  console.log(`✔ Noto Sans SC ${weight}: ${Math.round(buf.length / 1024)} KB`)
}

// 3. JetBrains Mono：直接复制 latin 子集（源已按 latin 裁剪）
for (const weight of [400, 600]) {
  const src = join(root, 'node_modules', '@fontsource', 'jetbrains-mono', 'files', `jetbrains-mono-latin-${weight}-normal.woff2`)
  const out = join(root, 'src', 'fonts', `jetbrains-mono-${weight}.woff2`)
  copyFileSync(src, out)
  console.log(`✔ JetBrains Mono ${weight}: ${Math.round(statSync(out).size / 1024)} KB`)
}
console.log('完成：字体已输出到 src/fonts/')
