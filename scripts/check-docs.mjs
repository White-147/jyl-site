// 文档区产物自检：清单 ↔ 页面 HTML ↔ 图片 ↔ 大纲 的一致性
//
// 用法：node scripts/check-docs.mjs
//
// 为什么要有它：文档区有四处会各自漂移，而且**都不会让构建失败** ——
//   · 清单里的大纲项指向一个页面上不存在的 id（点了没反应）
//   · 页面里引用的配图没转成 WebP（线上裂图，本地 dev 也是裂图）
//   · 一篇源拆出来的页数变了，但路由 / 互链还停在旧页
//   · 预算被悄悄突破（某次改版面常量后普遍变长）
// 这些都是"构建成功但功能坏了"，只能靠断言拦。改动版面 / 拆分逻辑后请跑一次。
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_ROOT = join(root, 'public', 'docs')
const MANIFEST = join(root, 'src', 'data', 'docs.json')
const BUDGET = 4.0
/** 正文列宽 / 视口高（手机口径），与 build-docs.mjs 的常量同源 */
const MOBILE_COL_PX = 318
const MOBILE_VIEW_PX = 727
const LINE_PX = 29.6

const problems = []
const notes = []
const fail = (m) => problems.push(m)

if (!existsSync(MANIFEST)) {
  console.error('[error] 还没有清单，先跑：node scripts/build-docs.mjs')
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const pages = manifest.pages
const ready = pages.filter((p) => p.status === 'ready')
const byPath = new Map(pages.map((p) => [`${p.section}/${p.id}`, p]))

/* ---- 1. 每页都要有真实文件，且不能是空壳 ---- */
for (const p of ready) {
  const file = join(OUT_ROOT, p.html)
  if (!existsSync(file)) {
    fail(`缺页文件：${p.section}/${p.id} → ${p.html}`)
    continue
  }
  const html = readFileSync(file, 'utf8')
  // 46 字节 = 只有一个空 span 的壳（历史上真出现过：块只渲染了自身、丢了子孙）
  if (html.replace(/<[^>]+>/g, '').trim().length < 40 && !html.includes('<img')) {
    fail(`页面是空壳：${p.section}/${p.id}（${html.length} 字节）`)
  }
  if (html.includes('doc-anchor')) {
    fail(`页面里还有标题锚点 #：${p.section}/${p.id}`)
  }
}

/* ---- 2. 大纲项必须能在页面上找到对应 id ---- */
for (const p of ready) {
  const file = join(OUT_ROOT, p.html)
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))
  const seen = new Set()
  for (const t of p.toc) {
    if (!ids.has(t.id)) fail(`悬空大纲项：${p.section}/${p.id} → #${t.id}（「${t.label}」）`)
    if (seen.has(t.id)) fail(`大纲 id 重复：${p.section}/${p.id} → #${t.id}`)
    seen.add(t.id)
  }
}

/* ---- 3. 页面里的图片必须存在 ---- */
let imgTotal = 0
for (const p of ready) {
  const file = join(OUT_ROOT, p.html)
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0]
    const src = (tag.match(/\bsrc="([^"]+)"/) ?? [])[1]
    if (!src) continue
    imgTotal++
    if (!existsSync(join(root, 'public', src))) fail(`配图缺失：${p.section}/${p.id} → ${src}`)
    if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) {
      fail(`配图缺 width/height（会导致锚点跳转失准）：${p.section}/${p.id} → ${src}`)
    }
  }
}

/* ---- 4. 预算复核（用页面里真实的图片尺寸重算一遍） ---- */
let over = 0
for (const p of ready) {
  const file = join(OUT_ROOT, p.html)
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  let imgPx = 0
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const w = Number((m[0].match(/\bwidth="(\d+)"/) ?? [])[1] ?? 0)
    const h = Number((m[0].match(/\bheight="(\d+)"/) ?? [])[1] ?? 0)
    if (w > 0 && h > 0) imgPx += (h * MOBILE_COL_PX) / w + 20
  }
  const text = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, '')
  const screens = ((text.length / (MOBILE_COL_PX / 16)) * LINE_PX + imgPx) / MOBILE_VIEW_PX
  if (screens > BUDGET + 0.6) {
    over++
    notes.push(`${p.section}/${p.title} 实测 ${screens.toFixed(1)} 屏（预算 ${BUDGET}）`)
  }
}

/* ---- 5. 路由唯一性 / 互链目标存在 ---- */
const seenRoute = new Set()
for (const p of pages) {
  const key = `${p.section}/${p.id}`
  if (seenRoute.has(key)) fail(`路由冲突：#/docs/${key}`)
  seenRoute.add(key)
}
let links = 0
for (const p of ready) {
  const file = join(OUT_ROOT, p.html)
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/href="#\/docs\/([^/"]+)\/([^"]+)"/g)) {
    links++
    const target = `${m[1]}/${decodeURIComponent(m[2])}`
    if (!byPath.has(target)) fail(`互链指向不存在的页：${p.section}/${p.id} → #/docs/${target}`)
  }
}

/* ---- 6. 源 ↔ 产物逐条对账（**防静默丢内容**） ----
 *
 * 为什么必须有：拆分/装箱是"把一棵标题树重新装箱"，一旦哪一步漏掉一个分支，
 * **构建照样成功、页面照样能开**，只是某几节的内容再也不出现在站点上 ——
 * 这类丢失只能靠"拿源去数产物"发现。
 * 用户的直觉是对的：文档越长、下钻越深，出问题的概率越大。
 * 实测过的情况：大纲里看不到 5.1.2，一度以为内容丢了 —— 实际是被并进了 5.1.1 那一页，
 * 属于"看不见"而不是"丢了"。两种都必须能被区分开，所以这里做的是**覆盖率**断言。 */
const stripTags = (s) => s.replace(/<[^>]+>/g, '')
const norm = (s) =>
  stripTags(String(s))
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/&[a-z]+;|&#\d+;/gi, '')
    .replace(/\s+/g, '')
    .trim()

/** 源 id → 它的源文件（按分区找 .html 或 .md） */
const sourceFile = (section, id) => {
  for (const ext of ['.html', '.md']) {
    const p = join(root, 'docs', section, 'source', `${id}${ext}`)
    if (existsSync(p)) return p
  }
  return null
}

{
  const bySource = new Map()
  for (const p of ready) {
    if (!bySource.has(p.source)) bySource.set(p.source, { section: p.section, pages: [] })
    bySource.get(p.source).pages.push(p)
  }

  let headingsChecked = 0
  let imagesChecked = 0
  for (const [id, info] of bySource) {
    const file = sourceFile(info.section, id)
    if (!file) {
      fail(`找不到源文件：docs/${info.section}/source/${id}.(html|md)`)
      continue
    }
    const raw = readFileSync(file, 'utf8')
    const isHtml = file.endsWith('.html')

    // 源里的标题
    const srcHeadings = isHtml
      ? [...raw.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)].map((m) => norm(m[1]))
      : [...raw.matchAll(/^#{1,4}[ \t]+(.+)$/gm)].map((m) => norm(m[1]))
    // 源里的配图（归一成「路径去扩展名」这一种键）
    const srcImages = [
      ...new Set(
        [...raw.matchAll(/(?:src="|!\[[^\]]*\]\()([^")\s]+\.(?:png|jpe?g|webp))/g)].map((m) =>
          m[1].replace(/\\/g, '/').replace(/^.*?images\//, '').replace(/\.(png|jpe?g|webp)$/i, ''),
        ),
      ),
    ]

    // 产物侧：先把这一源所有页的标题、配图、以及"页面自身承载的标题"收集起来
    const pageHeadings = new Set()
    const pageImages = new Set()
    for (const p of info.pages) {
      const f = join(OUT_ROOT, p.html)
      if (!existsSync(f)) continue
      const html = readFileSync(f, 'utf8')
      for (const m of html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)) pageHeadings.add(norm(m[1]))
      for (const m of html.matchAll(/(?:src=")([^"]+\.webp)/g)) {
        pageImages.add(m[1].replace(/^.*?images\//, '').replace(/\.webp$/i, ''))
      }
      // 页面标题、祖先链、本页小节名都算"这条标题被承载了"：
      // dropFirstHeading 会把页面第一个标题从正文里去掉，改由页面头部/左栏显示
      pageHeadings.add(norm(p.title))
      for (const a of p.ancestors ?? []) pageHeadings.add(norm(a))
      for (const l of p.labels ?? []) pageHeadings.add(norm(l))
      pageHeadings.add(norm(p.chapter))
    }

    for (const h of srcHeadings) {
      if (!h) continue
      headingsChecked++
      // 文档标题（H1）是**故意**不渲染的：它与配置里的源标题重复，见 manifest.docTitles。
      // 这里显式放行，且要求它确实被记录过 —— 不能靠"猜"来放行。
      if (manifest.docTitles?.[id] && norm(manifest.docTitles[id]) === h) continue
      if (!pageHeadings.has(h)) fail(`内容丢失（标题）：[${info.section}/${id}] 源里的「${h}」没有出现在任何生成页里`)
    }
    for (const img of srcImages) {
      imagesChecked++
      if (!pageImages.has(img)) fail(`内容丢失（配图）：[${info.section}/${id}] 源里的 ${img} 没有出现在任何生成页里`)
    }
    notes.push(`对账 ${id}：标题 ${srcHeadings.length} 条、配图 ${srcImages.length} 张，全部落位`)
  }
  notes.push(`源↔产物对账共核对 ${headingsChecked} 条标题、${imagesChecked} 张配图`)
}

/* ---- 7. 正文首个标题必须**就是页面标题本身**，且不能是祖先标题 ----
 *
 * 2026-09 定稿的规则：**正文从主题标题本身开始、保持源文件里的原始层级**，
 * 页头只回答「我在哪」（来源文档 + 面包屑），不再显示页面大标题。
 *
 * 为什么绕了一圈才定成这样（两个方向都试过）：
 *   甲、页头显示大标题 + 正文从标题之下开始 → 「被抽去当页头的那一个标题」比同级的兄弟高一级。
 *       论文 2.2 页装着 2.2 / 2.3 / 2.4 三个**平行**小节，2.2 被提到页头成了 h1，
 *       2.3、2.4 留在正文是 h2 —— 同级看起来像父子。
 *   乙、页头显示大标题 + 正文保留标题 → 16 页标题重复。
 *   现在：标题归位到正文，页头放一个 `sr-only` 的 h1 保证文档结构合法。
 */
for (const p of ready) {
  const file = join(OUT_ROOT, p.html)
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  const first = [...html.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((m) => stripTags(m[2]).replace(/\s+/g, '').trim())
    .find(Boolean)
  if (!first) {
    // 整页只有正文、没有小标题是合法的（比如「4.添加注释」那种一段话的页）
    continue
  }
  if (first !== p.title.replace(/\s+/g, '')) {
    fail(`正文首标题不是页面标题：[${p.section}/${p.id}] 页标题是「${p.title}」，正文却从「${first}」开始`)
  }
  if ((p.ancestors ?? []).some((a) => a.replace(/\s+/g, '') === first)) {
    fail(`正文从祖先标题开始：[${p.section}/${p.id}] 页面标题是「${p.title}」，正文却从「${first}」开始`)
  }
}

/* ---- 汇总 ---- */
const sections = manifest.sections
console.log('')
console.log('文档区自检')
console.log(`  ${sections.map((s) => `${s.label} ${s.ready}/${s.total}`).join(' · ')}`)
console.log(
  `  页 ${ready.length} · 平均 ${(ready.reduce((a, p) => a + p.stats.screens, 0) / ready.length).toFixed(1)} 屏/篇 · ` +
    `正文 ${ready.reduce((a, p) => a + p.stats.chars, 0)} 字 · 图 ${imgTotal} 张 · 互链 ${links} 条`,
)
if (notes.length) {
  console.log(`\n  ℹ 超预算 ${over} 篇（单块拆不动，需要原文补子标题）：`)
  for (const n of notes) console.log(`    · ${n}`)
}
if (problems.length) {
  console.log(`\n  ✗ ${problems.length} 处问题：`)
  for (const m of problems.slice(0, 40)) console.log(`    · ${m}`)
  process.exit(1)
}
console.log('\n  ✓ 全部通过\n')
