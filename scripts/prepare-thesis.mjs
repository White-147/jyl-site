// 毕业论文：Word 原稿 → 文档区可用的 HTML 源
//
// 用法：node scripts/prepare-thesis.mjs [--docx <路径>] [--archive <路径>]
//
// 为什么这条链路和 UE 笔记不一样（笔记是 md，论文是 docx）：
//   论文是**已定稿的外部文档**，原稿在 `D:\work\毕业答辩\`，不在仓库里，也不会天天改。
//   它的排版信息（32 个表格、31 个代码表、41 张插图、上标引用）远多于手写笔记，
//   自己写 docx 解析器没有意义 —— pandoc 一次性转成结构化 HTML 质量已经够用。
//   所以论文的**仓库内源就是这份 HTML**（`docs/thesis/source/thesis.html`，进 git），
//   和 UE 笔记的 `*.md` 快照地位相同：都是"原文在仓库外的只读快照"。
//
// 用法要点：
//   · pandoc 输出走 `-o <文件>` 而不是管道 —— 沙箱下 Node 的 `stdio:'pipe'` 抓子进程输出会 EPERM，
//     写文件再读回来最稳。
//   · `--extract-media` 先把插图抽到临时目录，再归档进 `_archive/thesis/images/`；
//     站点用的是 `public/docs/thesis/images/*.webp`（由 optimize_images.py 生成）。
//   · 转换后必须重跑图片压缩（脚本末尾会打印命令）。
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, rmSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const argVal = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const DOCX = argVal('--docx', 'D:\\work\\毕业答辩\\2121190011_蒋宇龙_基于借阅大数据的图书推荐系统的设计与实现.docx')
const TMP = join(root, '.tmp-thesis')
const ARCHIVE = join(root, argVal('--archive', join('_archive', 'thesis', 'images')))
const OUT = join(root, 'docs', 'thesis', 'source', 'thesis.html')
/** 站点侧图片目录（与 optimize_images.py 的 --output 一致） */
const SITE_IMAGE_DIR = 'docs/thesis/images'
const WEBP_DIR = join(root, 'public', SITE_IMAGE_DIR)

const PANDOC = process.platform === 'win32' ? 'C:\\Program Files\\Pandoc\\pandoc.exe' : 'pandoc'

/* ---------- 工具 ---------- */

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * 把 pandoc 已经转义过一次的实体还原回字符。
 *
 * ⚠️ 代码表里必须做这一步：pandoc 输出的是 `<p>+ this.callNo + "&amp;&amp;certId="</p>`，
 *    而提取代码时我们只去掉标签、再把纯文本 `escapeHtml` 一遍 ——
 *    `&amp;` 于是变成 `&amp;amp;`，页面上就会**原样显示 `&amp;&amp;` 和 `&gt;=`**（实测踩过）。
 *    顺序很重要：先剥标签（否则 `&lt;` 还原出来的 `<` 会被当成标签削掉），再还原实体，最后统一转义一次。
 *    `&amp;` 必须**最后**还原，否则 `&amp;lt;` 会被二次解释成 `<`。
 */
const unescapeHtml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

/** 读 PNG/JPG 的真实像素尺寸（只解析文件头）。图注与占位要用它（原因见 build-docs.mjs 的 figure）。 */
function imageSize(file) {
  const b = readFileSync(file)
  if (b.length > 24 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i++
        continue
      }
      const marker = b[i + 1]
      const len = b.readUInt16BE(i + 2)
      // SOF0..SOF3 / SOF5..SOF7 / SOF9..SOF11 / SOF13..SOF15 里带尺寸
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
      }
      i += 2 + len
    }
  }
  return null
}

/* ---------- 1. pandoc ---------- */

if (!existsSync(DOCX)) {
  console.error(`[error] 找不到论文原稿：${DOCX}`)
  process.exit(1)
}
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

console.log(`[1/4] pandoc 转换：${DOCX}`)
const r = spawnSync(
  PANDOC,
  [DOCX, '-f', 'docx', '-t', 'html', '--wrap=none', `--extract-media=${TMP}`, '-o', join(TMP, 'thesis.html')],
  { stdio: 'inherit' },
)
if (r.error) {
  console.error(`[error] 调不起 pandoc（${PANDOC}）：${r.error.message}`)
  process.exit(1)
}
if (r.status !== 0) {
  console.error(`[error] pandoc 退出码 ${r.status}`)
  process.exit(1)
}

let html = readFileSync(join(TMP, 'thesis.html'), 'utf8').replace(/\r\n?/g, '\n')

/* ---------- 2. 归档插图 ---------- */

console.log('[2/4] 归档插图')
mkdirSync(ARCHIVE, { recursive: true })
const mediaDir = join(TMP, 'media')
const mediaFiles = existsSync(mediaDir)
  ? readdirSync(mediaDir).filter((f) => /\.(png|jpe?g)$/i.test(f))
  : []
if (!mediaFiles.length) {
  console.error('[error] pandoc 没有抽出任何插图，检查 --extract-media')
  process.exit(1)
}
/** image1.png → { name:'image1', ext:'.png', w, h } */
const images = new Map()
for (const f of mediaFiles) {
  copyFileSync(join(mediaDir, f), join(ARCHIVE, f))
  const size = imageSize(join(ARCHIVE, f))
  images.set(f.replace(extname(f), ''), { file: f, ...(size ?? {}) })
}
console.log(`      ${mediaFiles.length} 张 → ${ARCHIVE}`)

/* ---------- 3. 清洗 ---------- */

console.log('[3/4] 清洗 HTML')

/** 3a. 代码表 → <pre><code>
 *
 * 论文里的代码是 Word 的「单元格表格」，pandoc 只能还原成 `<table><th>代码-N</th><td><p>行</p>…`。
 * 这样渲染出来是一堆带段距的 `<p>`，既不像代码也不能选中整段复制。
 * 这里按「表头是 代码-N」这一条特征识别，转成 `<figure class="doc-code">` + `<pre><code>`。
 * ⚠️ 原稿把每行存成独立段落，**行首缩进在 Word 里就没保留**，pandoc 自然也无从还原 ——
 *    转换结果每行顶格。这是原稿的损失，不是转换的 bug；要恢复得回 Word 里改样式。 */
let codeCount = 0
let tableCount = 0
/**
 * ⚠️ 必须先按**完整的单张表**切块，再在块内匹配 —— 不能直接把整篇丢给一条正则。
 *    踩过的坑：写成 `<table>\s*<colgroup>[\s\S]*?</colgroup>…` 时，`[\s\S]*?` 是**可扩张的**，
 *    于是从封面那张表的 `<table>` 起步、越过若干张表的 `</colgroup>` 一路找到第五章的
 *    `<th>代码-1</th>`，把中间 200 多行（封面、摘要、目录、第 1–4 章）整段当成一个匹配删掉。
 *    实测后果：输出从 93 KB 掉到 39 KB，正文直接从「3 系统需求分析」开始。
 *    现在外层 `<table>[\s\S]*?</table>` 只负责切出单张表（本批 HTML 无嵌套表），
 *    内层再用带 `$` 锚点的严格正则判断它是不是代码表。
 */
const CODE_TABLE = /^<table>\s*<colgroup>[\s\S]*?<\/colgroup>\s*<thead>\s*<tr[^>]*>\s*<th>([^<]*)<\/th>\s*<\/tr>\s*<\/thead>\s*<tbody>\s*<tr[^>]*>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>$/

html = html.replace(/<table>[\s\S]*?<\/table>/g, (tbl) => {
  const m = tbl.match(CODE_TABLE)
  if (!m) {
    tableCount++
    return tbl
  }
  const text = unescapeHtml(
    m[2]
      .replace(/<\/p>\s*<p>/g, '\n')
      .replace(/^<p>/, '')
      .replace(/<\/p>$/, '')
      .replace(/<[^>]+>/g, ''),
  ).replace(/\n+$/, '')
  codeCount++
  return (
    `<figure class="doc-code">` +
    `<figcaption>${escapeHtml(m[1].trim())}</figcaption>` +
    `<pre><code>${escapeHtml(text)}</code></pre>` +
    `</figure>`
  )
})
console.log(`      代码块 ${codeCount} 个 / 数据表 ${tableCount} 张`)

/** 3b. 插图 → figure（带 width/height 占位，原因见 build-docs.mjs 的 figure 注释） */
let imgCount = 0
let imgIndex = 0
html = html.replace(/<img\s+src="([^"]+)"[^>]*?\/?>/g, (_m, src) => {
  const base = src.replace(/\\/g, '/').split('/').pop() ?? ''
  const key = base.replace(extname(base), '')
  const meta = images.get(key)
  if (!meta) {
    console.warn(`      [warn] 插图未归档，跳过：${src}`)
    return ''
  }
  const dim = meta.w ? ` width="${meta.w}" height="${meta.h}"` : ''
  // 与 UE 笔记同一口径：只有第一张懒加载，其余 eager + 低优先级（原因见 build-docs.mjs）
  const loading = imgIndex++ === 0 ? ' loading="lazy"' : ' fetchpriority="low"'
  imgCount++
  return `<figure class="doc-figure"><img data-doc-image src="${SITE_IMAGE_DIR}/${key}.webp" alt="${escapeHtml(key)}"${dim}${loading} decoding="async" />`
})
console.log(`      插图 ${imgCount} 张`)

/** 3c. 把 figure 从 pandoc 的 `<p>` 里提出来 —— `<figure>` 不能待在 `<p>` 里，
 *      浏览器解析到它会提前闭合段落，导致图注与图分家、并多出一堆空段落。 */
html = html.replace(/<p>\s*(<figure class="(?:doc-figure|doc-code)">[\s\S]*?<\/figure>)\s*<\/p>/g, '$1')

/** 3d. 图注合入 figure：紧跟图片的 `<p>图 5-1 xxx</p>` 提为该图的 <figcaption> */
html = html.replace(
  /(<figure class="doc-figure">[\s\S]*?<\/figure>)\s*<p>\s*(图\s*\d+[-.]\d+[^<]*?)\s*<\/p>/g,
  (_m, fig, caption) => `${fig.replace(/<\/figure>$/, '')}<figcaption>${escapeHtml(caption.trim())}</figcaption></figure>`,
)

/** 3e. 表注提到表格之前 */
html = html.replace(
  /<p>\s*(表\s*\d+[-.]\d+[^<]*?)\s*<\/p>\s*(<table>)/g,
  (_m, caption, table) => `<p class="doc-table-caption">${escapeHtml(caption.trim())}</p>\n${table}`,
)

/**
 * 3f. 砍掉封面 / 独创性声明 / 目录，只保留摘要与 Abstract。
 *
 * 前置部分的段落一律丢弃，**唯一例外**是「摘 要 / Abstract / 关键词 / Keywords」。
 * 这样不用去数页码、也不怕 pandoc 的换行差异。
 */
const firstH1 = html.indexOf('<h1')
if (firstH1 < 0) {
  console.error('[error] 没有找到 <h1>，pandoc 输出异常')
  process.exit(1)
}
const front = html.slice(0, firstH1)
const body = html.slice(firstH1)

const KEEP = /^\s*(<p>)?\s*(<strong>|<b>)?\s*(摘\s*要|Abstract|关\s*键\s*词|Keywords)/
const kept = []
for (const chunk of front.split(/(?=<p>)/)) {
  const t = chunk.trim()
  if (t && KEEP.test(t)) kept.push(t)
}
console.log(`      保留前置段落 ${kept.length} 段（摘要 / Abstract / 关键词）`)

const abstractSection = kept.length
  ? `<h1 id="摘要">摘 要 / Abstract</h1>\n${kept.join('\n')}\n`
  : ''

html = abstractSection + body

/* ---------- 4. 落盘 ---------- */

console.log('[4/4] 写出')
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${html.trim()}\n`, 'utf8')

const headings = (html.match(/<h[1-4][^>]*>/g) ?? []).length
console.log(`[ok] ${OUT}`)
console.log(`     ${(html.length / 1024).toFixed(0)} KB · 标题 ${headings} 个 · 代码块 ${codeCount} · 插图 ${imgCount} · 表格 ${(html.match(/<table>/g) ?? []).length}`)
console.log('')
console.log('下一步（图片产物，幂等）：')
console.log(`  python scripts/optimize_images.py _archive/thesis/images public/${SITE_IMAGE_DIR} --max-width 1400`)
console.log('  node scripts/build-docs.mjs')
if (!existsSync(WEBP_DIR)) {
  console.warn(`[warn] 站点图片目录还不存在：${WEBP_DIR}`)
}
