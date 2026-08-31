// 字体子集化管线：从站点源码提取用到的全部字符
//  1. Noto Sans SC（正文，4 字重）→ 站点专用 woff2
//  2a. Smiley Sans 得意黑（区块标题展示字母）→ 站点字符集子集 woff2（源 5.7MB）
//  2b. Long Cang 龙藏手书（名字单独展示）→ 名字专用字符集子集 woff2（源 5MB）
//  3. Fraunces（数字显示衬线）→ 复制 latin 子集
//  4. Victor Mono（等宽点缀：代码彩蛋 / 行号，含 italic 变体）→ 复制 latin 子集
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

// 2a. 得意黑 Smiley Sans（区块标题展示，斜切墨体）：全量 ttf → 站点字符集子集 woff2
const SMILEY_SRC = join(root, 'scripts', 'fonts-src', 'smiley-sans', 'SmileySans-Oblique.ttf')
const smiley = await subsetFont(readFileSync(SMILEY_SRC), text, { targetFormat: 'woff2' })
const smileyOut = join(root, 'src', 'fonts', 'smiley-sans-oblique.woff2')
writeFileSync(smileyOut, smiley)
console.log(`✔ Smiley Sans（得意黑）: ${Math.round(smiley.length / 1024)} KB`)

// 2b. 柳建毛草 Liu Jian Mao Cao（名字单独展示，草书）：名字用字 + 拉丁数字保底
const LIU_CHARS = '蒋宇龙' + '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ·，。'
const LIU_SRC = join(root, 'scripts', 'fonts-src', 'liujianmaocao', 'LiuJianMaoCao-Regular.ttf')
const liu = await subsetFont(readFileSync(LIU_SRC), LIU_CHARS, { targetFormat: 'woff2' })
const liuOut = join(root, 'src', 'fonts', 'liu-jian-mao-cao-regular.woff2')
writeFileSync(liuOut, liu)
console.log(`✔ Liu Jian Mao Cao（柳建毛草）: ${Math.round(liu.length / 1024)} KB（${LIU_CHARS.length} 字符）`)

// 3. Fraunces（数字显示衬线）：latin 子集源直接复制（源已按 latin 裁剪）
const FRAUNCES = ['fraunces-latin-500-normal.woff2']
for (const file of FRAUNCES) {
  const src = join(root, 'node_modules', '@fontsource', 'fraunces', 'files', file)
  const out = join(root, 'src', 'fonts', file.replace('-normal', '').replace(/\.woff2$/, '.woff2'))
  copyFileSync(src, out)
  console.log(`✔ Fraunces ${file}: ${Math.round(statSync(out).size / 1024)} KB`)
}

// 4. Victor Mono（等宽点缀：代码彩蛋 / 行号 / mono 元素；含 italic 花体变体）
for (const file of ['victor-mono-latin-400-normal.woff2', 'victor-mono-latin-400-italic.woff2']) {
  const src = join(root, 'node_modules', '@fontsource', 'victor-mono', 'files', file)
  const out = join(root, 'src', 'fonts', file.replace('victor-mono-latin-', 'victor-mono-latin-'))
  copyFileSync(src, out)
  console.log(`✔ Victor Mono ${file}: ${Math.round(statSync(out).size / 1024)} KB`)
}
console.log('完成：字体已输出到 src/fonts/')
