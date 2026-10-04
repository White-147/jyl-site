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
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
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
  /**
   * 「空壳页」判据。
   *
   * ⚠️ 历史背景：早先这里是「正文 < 40 字且无图」，用来抓一种真事故 ——
   *    页面的块**只渲染了自身、丢了子孙**（46 字节的空 span）。
   * ⚠️⚠️ 2026-09 起这个判据**不再有意义**：切页改成"每个标题各自成页"，
   *    每页的块都是**叶子**（`children` 恒空），"丢了子孙"这种失败模式从结构上消失了。
   *    而源里确实存在**极短的真内容**（实测 9 页：`用于编辑选中的对象` 9 字、
   *    `参见 蓝图基础知识文件` 20 字…），旧判据把它们全报成"空壳"（9 条假报）。
   *
   * 新判据只抓**真的什么都没有**：剥完标签后一个字都没有、也没有图。
   *    那种页要么是渲染管线坏了，要么是切页切出了空页，都必须拦下。
   */
  const bare = html.replace(/<[^>]+>/g, '').replace(/[\s\u3000]/g, '')
  if (bare.length === 0 && !html.includes('<img')) {
    fail(`页面是空壳：${p.section}/${p.id}（${html.length} 字节，剥标签后无任何文字与图）`)
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

/* ---- 3. 页面里的图片必须存在 ----
 *
 * ⚠️⚠️ 这一段曾经**完全测不出**一次真实事故（2026-10 第十八轮，线上 250 张配图全裂）：
 *    当时生成出来的 src 是
 *      `docs/ue5/images/../../../../public/docs/ue5/images/x.webp`
 *    旧写法是 `existsSync(join(root, 'public', src))` —— `existsSync` 会把 `..` **按字面解析**，
 *    于是路径从 `public/docs/pages/<区>/` 一路退出仓库根、再进 `public/docs/ue5/images/`，
 *    **命中真文件**，自检长期报"配图全部落位"，而浏览器按页面 URL 解析必然 404。
 *
 *    所以现在的判据换成**与浏览器一致**的口径，两条缺一不可：
 *      ① `src` 里**不允许出现 `..`** —— 相对路径的解析基准是页面 URL（hash 路由下尤其绕），
 *         带 `..` 就说明构建归一化没做干净，直接判失败，不给它"恰好能对上"的机会。
 *      ② 解析后的绝对路径必须**仍在 `public/` 之内** —— 用 path.resolve 真解析，
 *         而不是把 `..` 交给 existsSync。这样任何"逃出目录"的写法都会被拦下。
 *    另外还要拦"没编码的非法 URL 字符"（空格），它会干扰匹配、也可能被服务器拒。
 */
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

    if (src.split('/').includes('..')) {
      fail(`配图 src 含 ".."（浏览器会按页面 URL 解析成 404）：${p.section}/${p.id} → ${src}`)
      continue
    }
    if (/ /.test(src)) {
      fail(`配图 src 有未编码的空格（应写成 %20）：${p.section}/${p.id} → ${src}`)
    }

    /**
     * ⚠️ 必须先 `decodeURIComponent` 再落到磁盘 —— **浏览器/服务器就是按这个口径解码的**，
     *    生成的 src 是百分号编码（中文与空格都在内），直接用编码串 `existsSync` 永远找不到文件。
     *    （编码失败时退回原文，交给下面的 existsSync 报"缺失"，不吞掉错误。）
     */
    let decoded = src
    try { decoded = decodeURIComponent(src) } catch { /* 保留原文，让缺失检查报出来 */ }

    const abs = resolve(root, 'public', decoded)
    const pubRoot = resolve(root, 'public')
    if (!abs.startsWith(pubRoot + sep)) {
      fail(`配图 src 逃出了 public/：${p.section}/${p.id} → ${src}`)
      continue
    }
    if (!existsSync(abs)) fail(`配图缺失：${p.section}/${p.id} → ${src}`)
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

/**
 * 源 id → 它的源文件。
 *
 * ⚠️ 2026-10 起目录按**类型**分区（用户定向 B-2）：
 *      `docs/<区>/source/md/*.md`（markdown 快照）
 *      `docs/<区>/source/pdf/*.pdf`（原件，浏览器下载用）
 *    论文那份是 pandoc 产物，仍留在 `source/thesis.html` 原位（它是 html，不属于 md 这一类）。
 *    ⚠️ 旧的「直接放 source/ 下」这一档**必须保留**：论文（和将来可能的新源）就是这种，
 *       去掉它会让对账直接报「找不到源文件」。
 */
const sourceFile = (section, id) => {
  const candidates = [
    join(root, 'docs', section, 'source', 'md', `${id}.md`),
    join(root, 'docs', section, 'source', `${id}.html`),
    join(root, 'docs', section, 'source', `${id}.md`),
  ]
  return candidates.find((p) => existsSync(p)) ?? null
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
      fail(`找不到源文件：docs/${info.section}/source/md/${id}.md（或 source/${id}.html）`)
      continue
    }
    const raw = readFileSync(file, 'utf8')
    const isHtml = file.endsWith('.html')

    // 源里的标题
    const srcHeadings = isHtml
      ? [...raw.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)].map((m) => norm(m[1]))
      : [...raw.matchAll(/^#{1,4}[ \t]+(.+)$/gm)].map((m) => norm(m[1]))
    /**
     * 源里的配图。键**只取文件名（去扩展名）**。
     *
     * ⚠️⚠️ 早先源侧保留子目录（`蓝图基础/新建文件夹`）、产物侧只留文件名（`新建文件夹`），
     *    两边键永远不相等 → **每一张图都报"内容丢失（配图）"**（实测 31 条假报）。
     *    两侧必须用同一种归一：**basename + 去扩展名**。
     *    网页侧图片路径形如 `docs/ue5/images/../images/蓝图基础/x.webp`，取 basename 最稳。
     */
    const imgKey = (p) => p.replace(/\\/g, '/').split('/').pop().replace(/\.(png|jpe?g|webp)$/i, '')
    const srcImages = [
      ...new Set(
        [...raw.matchAll(/(?:src="|!\[[^\]]*\]\()([^")\s]+\.(?:png|jpe?g|webp))/g)].map((m) => imgKey(m[1])),
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
        /* ⚠️ 与源侧同一口径：**basename + 去扩展名**（见上面 srcImages 的注释，两侧不一致会全量假报）
           ⚠️ 还要**先解码**：产物里的 src 是百分号编码（中文/空格都被编码），
              不解码则键是 `%E6%96%B0...`、源侧是 `新建文件夹`，两边永远不相等 → 全量假报"内容丢失"。
              这正是"两侧必须同一种归一"的又一处 —— 归一里必须包含解码这一步。 */
        let s = m[1]
        try { s = decodeURIComponent(s) } catch { /* 保留原文 */ }
        pageImages.add(imgKey(s))
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

/* ---- 8. 原件下载：声明了就必须在 public/ 里真有那个文件，且与清单里的字节数一致 ----
 *
 * 2026-10 加（B-2 目录规整的配套断言）。为什么必须有一条：
 *   PDF 的**源**在 `docs/<区>/source/pdf/`，站点只能从 `public/` 出东西 ——
 *   `build-docs.mjs` 每次构建会把它复制到 `public/docs/<区>/source/pdf/`。
 *   这一步一旦被删/写错路径，**构建照样成功**，症状是"点了下载得到一张网页"
 *   （静态服务器把不存在的路径兜底成 index.html）。实测就是这么踩到的，
 *   所以这里按 manifest 里记的字节数逐个核对，不靠肉眼。
 */
{
  const withDl = ready.filter((p) => p.download)
  const checkedSources = new Set()
  let n = 0
  for (const p of withDl) {
    if (checkedSources.has(p.source)) continue
    checkedSources.add(p.source)
    const abs = join(OUT_ROOT, p.download.href)
    if (!existsSync(abs)) {
      fail(`原件缺失：public/docs/${p.download.href}（源 ${p.source}）—— 检查 build-docs.mjs 的复制步骤`)
      continue
    }
    const bytes = statSync(abs).size
    if (bytes !== p.download.bytes) {
      fail(`原件体积与清单不一致：${p.download.href} 实际 ${bytes} 字节，清单写 ${p.download.bytes} —— 重跑 docs:build`)
      continue
    }
    notes.push(`原件 ${p.download.href} · ${p.download.mb} MB · ${bytes} 字节，与清单一致`)
    n++
  }
  /* 反向：清单没声明下载的源，public/ 里不该多出 PDF（多出来就是没清理干净的残留） */
  for (const s of manifest.sections) {
    const dir = join(OUT_ROOT, s.id, 'source', 'pdf')
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      const owner = ready.find((p) => p.download && p.download.href.endsWith(`/${f}`))
      if (!owner) fail(`多余的 PDF：public/docs/${s.id}/source/pdf/${f}（清单里没有源声明它）`)
    }
  }
  if (n) notes.push(`原件下载共 ${n} 个源`)
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
