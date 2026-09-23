// UE 学习笔记导入器：markdown → 文档区 HTML + 目录清单 + 图片映射
//
// 用法：node scripts/import-ue-docs.mjs
//   （可选）--source <目录>  覆盖 markdown 源目录，默认 docs/ue5/source
//   （可选）--images <目录>  覆盖图片产物目录，默认 public/docs/ue5/images
//
// 为什么自己写解析器而不是引 marked/markdown-it：
//   这批笔记的方言非常规整 —— 实测五份文档里 HTML 标签**只有 `<img>`**（195 处），
//   没有代码块、没有表格、没有引用块，也没有 script/iframe/style/on* 事件属性。
//   而它有三处"非标准"是任何通用解析器都要额外打补丁的：
//     1) 图片路径是 Windows 反斜杠（`images\主工具栏\保存.png`），网页上必须换成正斜杠；
//     2) 部分文件名里混进了零宽空格（U+200B），必须原样保留才能对上磁盘文件；
//     3) 文档互链的写法不统一（`./a.md`、`./a`、`./a`+`.md` 三种混用）。
//   为这三件事引一个依赖、再写三个插件，不如 200 行自己搞定，还顺带产出大纲。
//
// ⚠️ 新增文档时：改下面 DOCS 表 → 跑本脚本 → 跑 `npm run fonts:subset`（新汉字要进字体子集）。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const argVal = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const SOURCE_DIR = join(root, argVal('--source', join('docs', 'ue5', 'source')))
const IMAGE_DIR = join(root, argVal('--images', join('public', 'docs', 'ue5', 'images')))

/** 文档清单：顺序即侧栏顺序，也**就是建议阅读顺序**（依赖关系是实测出来的，别随手调）。
 *
 *  依赖图（来自文档内的互链与内容依赖）：
 *    unreal5-notes 是总入口，指向另外 4 篇；ue5-window-base 与 blueprint-program-base 会回引它；
 *    ue5-window-advanced 的前置是 ue5-window-base；
 *    blueprint-program-base 开头明确建立在「蓝图基础」之上（"由于蓝图基础中的第一人称关卡模板…"）。
 *  所以 order：01 总览 → 02 界面基础 → 03 界面进阶 → 04 蓝图基础 → 05 蓝图编程。
 *
 *  group 只用于侧栏分组留白（界面族 3 篇 / 蓝图族 2 篇）；prereq 显示在正文头部。 */
const DOCS = [
  {
    id: 'unreal5-notes',
    file: 'unreal5-notes.md',
    title: '虚幻引擎总览',
    subtitle: '环境准备、Fab、项目模板、界面与快捷键',
    order: 1,
    group: '界面',
    status: 'ready',
  },
  {
    id: 'ue5-window-base',
    file: 'ue5-window-base.md',
    title: '界面基础操作',
    subtitle: '菜单栏、标签页、主工具栏、视口工具栏',
    order: 2,
    group: '界面',
    prereq: 'unreal5-notes',
    status: 'ready',
  },
  {
    id: 'ue5-window-advanced',
    file: 'ue5-window-advanced.md',
    title: '界面进阶操作',
    subtitle: '视口工具栏、大纲视图、细节面板',
    order: 3,
    group: '界面',
    prereq: 'ue5-window-base',
    status: 'ready',
  },
  {
    id: 'blueprint-base',
    file: 'blueprint-base.md',
    title: '蓝图基础',
    subtitle: '蓝图类、父类体系与 UE 对象模型',
    order: 4,
    group: '蓝图',
    prereq: 'unreal5-notes',
    status: 'ready',
  },
  {
    id: 'blueprint-program-base',
    file: 'blueprint-program-base.md',
    title: '蓝图编程基础',
    subtitle: '增强输入、角色与视角移动、自动门实战',
    order: 5,
    group: '蓝图',
    prereq: 'blueprint-base',
    status: 'ready',
  },
]

/* ---------- 工具 ---------- */

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const escapeAttr = (s) => escapeHtml(s).replace(/'/g, '&#39;')

/** 标题 → 锚点 id。中文不做音译，直接保留并用连字符连接，与 GitHub 风格一致。 */
function slugify(text, used) {
  let s = text
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\p{Script=Han}\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!s) s = 'section'
  let id = s
  let n = 2
  while (used.has(id)) id = `${s}-${n++}`
  used.add(id)
  return id
}

/** markdown 图片路径 → 站点路径。反斜杠换正斜杠、去 `images/` 前缀、后缀换 .webp。 */
function imageSrc(raw) {
  const rel = raw.replace(/\\/g, '/').replace(/^\.?\//, '')
  const withoutPrefix = rel.startsWith('images/') ? rel.slice('images/'.length) : rel
  const webp = withoutPrefix.replace(/\.(png|jpe?g)$/i, '.webp')
  return { file: withoutPrefix, url: `docs/ue5/images/${webp}` }
}

/** 行内标记 → 纯文本（用于把链接文本塞进 title/alt 这类属性位置）。 */
const stripInline = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1')

/* ---------- 行内解析 ---------- */

function inline(text, ctx) {
  // 先把「不该被后续规则碰到」的片段摘出来占位：行内代码 → 图片 → 链接
  const stash = []
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`

  let out = text.replace(/`([^`\n]+)`/g, (_m, code) => keep(`<code>${escapeHtml(code)}</code>`))

  // 图片：![alt](src) —— 本批笔记主力是内联 <img>，这里兼容 markdown 写法
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => {
    const { file, url } = imageSrc(src)
    ctx.images.add(file)
    return keep(figure(url, alt))
  })

  // 链接：[text](url)。⚠️ 链接文本在**清洗行内标记之后**再 escape —— 笔记里大量写作
  // `[**界面基础操作文件**](./x.md)`，若先 escape 会把 `**` 当普通字符原样输出。
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const clean = stripInline(label).trim()
    const labelHtml = escapeHtml(clean)
    if (/^https?:/i.test(url)) {
      // 外链的可见文本常常就是整条 URL（笔记里是"链接 + 裸地址"的写法），过长时收成域名
      const shown = /^https?:/i.test(clean) ? escapeHtml(shortUrl(clean)) : labelHtml
      return keep(
        `<a class="doc-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">${shown}</a>`,
      )
    }
    // 文档互链：解析成 /docs/ue5/<id>，未导入的目标降级成不可点状态
    const id = url.replace(/^\.\//, '').replace(/\.md$/, '').replace(/#.*$/, '')
    const target = ctx.docById.get(id)
    if (target && target.status === 'ready') {
      return keep(`<a class="doc-link" href="#/docs/ue5/${target.id}">${labelHtml}</a>`)
    }
    return keep(
      `<span class="doc-link-pending" title="该篇尚未导入本站">${labelHtml}<span class="doc-pending-badge">待导入</span></span>`,
    )
  })

  out = escapeHtml(out)
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => stash[Number(i)])
}

function shortUrl(u) {
  try {
    const { hostname, pathname } = new URL(u)
    const p = pathname.replace(/\/$/, '')
    return p && p !== '/' ? `${hostname}${p.length > 28 ? `${p.slice(0, 28)}…` : p}` : hostname
  } catch {
    return u
  }
}

/** 图片统一包 figure：灯箱由 React 端用事件委托接管（见 Docs.tsx 的 data-doc-image）。 */
function figure(url, alt) {
  const caption = alt && alt.trim() ? `<figcaption>${escapeHtml(alt.trim())}</figcaption>` : ''
  return (
    `<figure class="doc-figure">` +
    `<img data-doc-image src="${escapeAttr(url)}" alt="${escapeAttr(alt || '')}" loading="lazy" decoding="async" />` +
    `${caption}</figure>`
  )
}

/* ---------- 块级解析 ---------- */

function convert(md, ctx, docId) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const html = []
  const toc = []
  const usedSlugs = new Set()
  let i = 0
  let firstHeadingSkipped = false

  const flushParagraph = (buf) => {
    if (!buf.length) return
    html.push(`<p>${inline(buf.join(' '), ctx)}</p>`)
    buf.length = 0
  }
  const para = []

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // 空行：段落分隔
    if (trimmed === '') {
      flushParagraph(para)
      i++
      continue
    }

    // 内联 HTML 图片（本笔记主力写法）：<img src="..." style="..." />
    const imgMatch = trimmed.match(/^<img\b[^>]*?src="([^"]+)"[^>]*?\/?>$/i)
    if (imgMatch) {
      flushParagraph(para)
      const { file, url } = imageSrc(imgMatch[1])
      ctx.images.add(file)
      // 原文里图没有独立说明文字，用文件名兜底做 caption（去掉扩展名、把分隔符换成空格太激进了，保持原名）
      const alt = file.split('/').pop().replace(/\.[^.]+$/, '')
      html.push(figure(url, alt))
      i++
      continue
    }

    // 分隔线
    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph(para)
      html.push('<hr class="doc-hr" />')
      i++
      continue
    }

    // 标题（h1~h4）。⚠️ 必须包含 h1：笔记每份文档都以 `# 标题` 开头，
    //    早先写成 {2,4} 导致那一行被当成普通段落、原样带着 `#` 输出。
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      flushParagraph(para)
      const level = h[1].length
      const text = h[2].trim()
      // 文档第一个标题（# 一级）用作页面标题，不进大纲
      const id = slugify(text, usedSlugs)
      toc.push({ id, label: text, level })
      html.push(
        `<h${level} id="${escapeAttr(id)}" class="doc-h${level}">` +
          `<a class="doc-anchor" href="#${escapeAttr(id)}" aria-label="本节链接">#</a>` +
          `${inline(text, ctx)}</h${level}>`,
      )
      i++
      continue
    }

    // 列表（- / * / 1.），支持缩进嵌套
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushParagraph(para)
      const items = []
      const baseIndent = line.length - line.trimStart().length
      while (i < lines.length) {
        const cur = lines[i]
        if (cur.trim() === '') {
          // 列表中间的空行：看下一行是否还是列表项
          const next = lines[i + 1]
          if (next && (/^\s*[-*]\s+/.test(next) || /^\s*\d+\.\s+/.test(next))) {
            i++
            continue
          }
          break
        }
        const m = cur.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        if (!m) break
        const indent = m[1].length
        const text = m[3].trim()
        if (indent > baseIndent + 1) {
          // 嵌套：挂到紧邻的上一个条目的**内部**（早先是把子列表 push 成同级兄弟节点，
          // 结果是子项在视觉上不再缩进于父项之下）
          const sub = []
          let j = i
          while (j < lines.length) {
            const sm = lines[j].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
            if (!sm || sm[1].length <= baseIndent) break
            sub.push(`<li>${inline(sm[3].trim(), ctx)}</li>`)
            j++
          }
          if (items.length) {
            items[items.length - 1] = items[items.length - 1].replace(
              /<\/li>$/,
              `<ul class="doc-ul doc-ul-sub">${sub.join('')}</ul></li>`,
            )
          }
          i = j
          continue
        }
        items.push(`<li>${inline(text, ctx)}</li>`)
        i++
      }
      html.push(`<ul class="doc-ul">${items.join('')}</ul>`)
      continue
    }

    // 普通段落（连续行合并）
    para.push(trimmed)
    i++
  }
  flushParagraph(para)

  return { html: html.join('\n'), toc }
}

/* ---------- 主流程 ---------- */

const docById = new Map(DOCS.map((d) => [d.id, d]))
const outDir = join(root, 'public', 'docs', 'ue5')
mkdirSync(outDir, { recursive: true })

const manifestDocs = []
const allImages = new Set()
const missing = []

for (const doc of DOCS) {
  if (doc.status !== 'ready') {
    manifestDocs.push({
      id: doc.id,
      title: doc.title,
      subtitle: doc.subtitle,
      order: doc.order,
      group: doc.group,
      toc: [],
      status: 'pending',
    })
    continue
  }
  const src = join(SOURCE_DIR, doc.file)
  if (!existsSync(src)) {
    missing.push(doc.file)
    continue
  }
  const md = readFileSync(src, 'utf8')
  const ctx = { images: new Set(), docById }
  // 一级标题作为页面标题，块级转换从它之后开始（仍会渲染成 h1）
  const { html, toc } = convert(md, ctx, doc.id)
  ctx.images.forEach((f) => allImages.add(f))

  // 大纲去掉 h4（太细，侧栏放不下）
  const tocForNav = toc.filter((t) => t.level <= 3)
  writeFileSync(join(outDir, `${doc.id}.html`), html, 'utf8')
  manifestDocs.push({
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    order: doc.order,
    group: doc.group,
    // prereq / next 都存**文档对象**（id + 标题），前端不必再查一次表
    prereq: doc.prereq ? { id: doc.prereq, title: docById.get(doc.prereq)?.title ?? doc.prereq } : null,
    next: doc.nextId ? { id: doc.nextId, title: docById.get(doc.nextId)?.title ?? doc.nextId } : null,
    status: 'ready',
    toc: tocForNav,
    html: `${doc.id}.html`,
  })
  console.log(`[ok] ${doc.id}: ${html.length} 字节 HTML，大纲 ${tocForNav.length} 项，图片 ${ctx.images.size} 张`)
}

// 「下一篇」按 order 推导（不手写，避免加减文档时漏改）：只在同 group 内串，
// 这样界面族读完不会直接跳进蓝图族 —— 跨组的那一步交给侧栏（用户可能有别的读法）。
for (let i = 0; i < manifestDocs.length; i++) {
  const cur = manifestDocs[i]
  const next = manifestDocs
    .slice(i + 1)
    .find((d) => d.group === cur.group && d.status === 'ready')
  if (next) cur.next = { id: next.id, title: next.title }
}

if (missing.length) {
  console.error(`[error] 缺少源文件：${missing.join(', ')}`)
  process.exitCode = 1
}

// 图片产物核对：引用了但没转换出来的，直接报出来（避免上线后 404）
const missingImages = []
for (const f of allImages) {
  const webp = join(IMAGE_DIR, f.replace(/\.(png|jpe?g)$/i, '.webp'))
  if (!existsSync(webp)) missingImages.push(f)
}
if (missingImages.length) {
  console.error(`[error] ${missingImages.length} 张图片尚未转换，先跑：`)
  console.error(`  python scripts/optimize_images.py _archive/ue5-notes/images public/docs/ue5/images --only-from-md docs/ue5/source/*.md`)
  missingImages.slice(0, 10).forEach((f) => console.error(`   - ${f}`))
  process.exitCode = 1
}

const manifest = {
  _note: '由 scripts/import-ue-docs.mjs 生成，请勿手改。原文在 docs/ue5/source/*.md（从本地笔记同步），图片产物在 public/docs/ue5/images/。',
  docsRoot: 'docs/ue5',
  docs: manifestDocs,
}
const manifestPath = join(root, 'src', 'data', 'ue5-docs.json')
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`[ok] 清单写入 src/data/ue5-docs.json：ready ${manifestDocs.filter((d) => d.status === 'ready').length} 篇 / pending ${manifestDocs.filter((d) => d.status === 'pending').length} 篇`)
