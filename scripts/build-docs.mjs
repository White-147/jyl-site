// 文档区构建器：源（markdown / pandoc HTML）→ 分区化文档页 + 大纲 + 清单
//
// 用法：node scripts/build-docs.mjs [--budget 4.0] [--quiet]
//
// 设计要点（改之前先读完）：
//
// 1. **一份源拆成多页**。早期是一篇源 = 一页，实测最长的一篇（蓝图编程基础）在手机上
//    是 **56 屏**，读者根本翻不到底。现在按标题层级**贪心装箱**：能塞进预算的相邻小节
//    合成一页，塞不下就下钻一级（h2 → h3 → h4），实在拆不动的叶子块如实保留并在报告里点名。
//
// 2. **预算是"手机屏"，不是字数**。理由（实测 + 调研）：
//      · 手机一屏 ≈ 440 汉字（390×844 / 17px / 行高 1.75 → 21 字/行 × 21 行）；
//        桌面一屏 ≈ 1,035 汉字（1440×900 / 780px 栏）—— **桌面一屏 ≈ 手机 2.35 屏**，
//        所以必须拿手机当约束方，以它为准桌面自动安全。
//      · 图片按**真实像素高**折算：`imgH × 318/imgW`。这批笔记有 218 张 UE 截图，
//        合起来约 59 屏 —— 只数字数会把图多的页严重低估。
//      · 3 屏是实证上限：NN/g 的注视点研究里 81% 的浏览时间落在前三屏，
//        原文「人们很少越过第三屏」。
//    当前预算 4 屏：实测平均 2.7 屏/页，绝大多数页落在 1–3 屏内。
//
// 3. **不输出标题锚点 `#`**。旧版给每个 h1–h4 都插了 `<a class="doc-anchor">#</a>`，
//    鼠标悬停标题就浮出来、还能点（用户明确要求去掉）。标题的 `id` 必须保留 ——
//    右栏大纲、`?s=` 深链全靠它。
//
// 4. **图必须带 width/height**。没有它，浏览器在图片加载完成前不知道图多高，
//    文档高度会随图片逐张加载不断增长，锚点跳转当场失准（历史实测偏差 96–1900px）。
//
// 5. 生成物（`public/docs/**/*.html` 与 `src/data/docs.json`）**不进 git**，
//    由 `predev` / `prebuild` 钩子自动重建。源在 `docs/<区>/source/`，那才是要提交的东西。
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const argVal = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const DEFAULT_BUDGET = Number(argVal('--budget', '4.0'))
const QUIET = args.includes('--quiet')

/* ============================ 版面常量（改这里就够） ============================ */

/** 手机端正文列宽（px）。390 视口 − 容器 px-4(32) − 卡片 px-5(40) = 318。 */
const MOBILE_COL_PX = 318
/** 手机端可视内容高（px）。844 − 顶栏 64 − 文档区吸顶条 53 ≈ 727。 */
const MOBILE_VIEW_PX = 727
/** 正文行高（px）。font-size 16 × line-height 1.85。 */
const LINE_PX = 29.6
/** 每行汉字数。318 / 16 ≈ 19.9。 */
const CHARS_PER_LINE = MOBILE_COL_PX / 16
/** 每张图的下外边距 + 图注（px），计入滚动成本。 */
const FIGURE_EXTRA_PX = 20

const screens = (chars, imgPx) => ((chars / CHARS_PER_LINE) * LINE_PX + imgPx) / MOBILE_VIEW_PX

/* ============================ 分区与源 ============================ */

/**
 * 分区：**顺序即导航顺序**（用户 2026-09 指定：毕业论文 → UE 理论 → UE 实战）。
 * `short` 给手机端分段控件用，`blurb` 给分区说明用。
 */
const SECTIONS = [
  {
    id: 'thesis',
    label: '毕业论文',
    short: '论文',
    blurb: '本科毕业设计：基于借阅大数据的图书推荐系统的设计与实现',
    /**
     * 配套项目（跨区互链的唯一来源）。值必须是 `src/data/projects.json` 里的项目 id ——
     * 项目名与入口都由前端从那份数据里现取，这里不写死名字（改名时只改数据）。
     * 论文每页的页头会显示「配套项目：BookRecommendation →」，指向主页项目区 `#projects`。
     */
    relatedProject: 'book-recommendation',
  },
  { id: 'theory', label: 'UE 理论', short: '理论', blurb: '引擎总览、界面操作、蓝图体系 —— 上手虚幻引擎要看的部分' },
  { id: 'combat', label: 'UE 实战', short: '实战', blurb: '完整案例：把理论串成能跑起来的东西' },
]

/**
 * 源清单。`order` 是分区内顺序，也是建议阅读顺序。
 *
 * `split.levels` 是**允许下钻的标题层级**（从浅到深）。下钻只在"整块塞不进预算"时发生，
 * 所以给到 h4 不会让小页变碎，只会让大块有得拆。
 * `group` 只用于侧栏在分区内再分小段留白。
 */
const SOURCES = [
  {
    // ⚠️ `id` 必须等于 md 源文件去掉后缀的文件名 —— 笔记里的互链写的是 `](./ue5-window-base.md)`，
    //    解析器只做「去 ./ 去 .md」两步，id 对不上就会全部降级成「待导入」的死文字。
    id: 'thesis',
    section: 'thesis',
    file: 'thesis/source/thesis.html',
    format: 'html',
    title: '基于借阅大数据的图书推荐系统的设计与实现',
    subtitle: '本科毕业设计 · 数据科学与大数据技术 · 2023',
    order: 1,
    split: { levels: [1, 2, 3, 4] },
  },

  {
    id: 'unreal5-notes',
    section: 'theory',
    file: 'theory/source/unreal5-notes.md',
    format: 'md',
    title: '虚幻引擎总览',
    subtitle: '环境准备、Fab、项目模板、界面与快捷键',
    order: 1,
    group: '入门',
    split: { levels: [2, 3] },
  },
  {
    id: 'ue5-window-base',
    section: 'theory',
    file: 'theory/source/ue5-window-base.md',
    format: 'md',
    title: '界面基础操作',
    subtitle: '菜单栏、标签页、主工具栏、视口工具栏、大纲视图、底边栏',
    order: 2,
    group: '界面',
    prereq: 'unreal5-notes',
    split: { levels: [2, 3] },
  },
  {
    id: 'ue5-window-advanced',
    section: 'theory',
    file: 'theory/source/ue5-window-advanced.md',
    format: 'md',
    title: '界面进阶操作',
    subtitle: '菜单栏、视口工具栏、大纲视图、内容侧滑菜单',
    order: 3,
    group: '界面',
    prereq: 'ue5-window-base',
    split: { levels: [2, 3, 4] },
  },
  {
    id: 'blueprint-base',
    section: 'theory',
    file: 'theory/source/blueprint-base.md',
    format: 'md',
    title: '蓝图基础',
    subtitle: '蓝图类、父类体系与 UE 对象模型',
    order: 4,
    group: '蓝图',
    prereq: 'unreal5-notes',
    split: { levels: [2, 3, 4] },
  },
  {
    id: 'blueprint-program-base',
    section: 'theory',
    file: 'theory/source/blueprint-program-base.md',
    format: 'md',
    title: '蓝图编程基础',
    subtitle: '增强输入、角色与视角移动、自动门、第三人称运动与动画',
    order: 5,
    group: '蓝图',
    prereq: 'blueprint-base',
    split: { levels: [2, 3, 4] },
  },

  {
    id: 'fps-game-notes',
    section: 'combat',
    file: 'combat/source/fps-game-notes.md',
    format: 'md',
    title: 'FPS 游戏实战',
    subtitle: '从零做一个可玩的第一人称射击关卡',
    order: 1,
    group: '实战案例',
    split: { levels: [2, 3, 4] },
  },
  {
    id: 'challenge-game-notes',
    section: 'combat',
    file: 'combat/source/challenge-game-notes.md',
    format: 'md',
    title: '挑战游戏实战',
    subtitle: '玩法挑战与关卡设计记录',
    order: 2,
    group: '实战案例',
    prereq: 'fps-game-notes',
    split: { levels: [2, 3, 4] },
  },
]

/**
 * UE 笔记共用一个图片根（理论与实战同源），论文单独一个。
 *
 * ⚠️ 页面 HTML 统一落在 `public/docs/pages/<区>/`，**与图片资产分开**。
 *    早先把页面直接写在 `public/docs/<区>/` 下，而论文配图正好在 `public/docs/thesis/images/` ——
 *    构建开头那句 `rmSync(public/docs/thesis)` 会把 41 张论文配图一起删掉（实测踩过，
 *    表现为自检报 38 处「配图缺失」）。现在两者不同目录，整目录重建才是安全的。
 */
const IMAGE_ROOTS = {
  md: { fsRoot: join(root, 'public', 'docs', 'ue5', 'images'), urlBase: 'docs/ue5/images' },
  html: { fsRoot: join(root, 'public', 'docs', 'thesis', 'images'), urlBase: 'docs/thesis/images' },
}

const OUT_ROOT = join(root, 'public', 'docs', 'pages')
const MANIFEST_PATH = join(root, 'src', 'data', 'docs.json')

/* ============================ 工具 ============================ */

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const escapeAttr = (s) => escapeHtml(s).replace(/'/g, '&#39;')

/** 标题 → 锚点 id。中文不音译，直接保留（与 GitHub 风格一致，也便于人工写深链）。 */
function slugify(text) {
  const s = String(text)
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\p{Script=Han}\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return s || 'section'
}

/** 行内标记 → 纯文本（用于把链接文本塞进 title/alt 这类属性位置，以及大纲标签）。 */
const stripInline = (s) =>
  String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()

/** 读 WebP 的真实像素尺寸（只解析文件头，不解码像素）。 */
function webpSize(file) {
  try {
    const b = readFileSync(file)
    if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
    const fourCC = b.toString('ascii', 12, 16)
    if (fourCC === 'VP8X') {
      return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }
    }
    if (fourCC === 'VP8 ') {
      return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff }
    }
    if (fourCC === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) }
    }
    return null
  } catch {
    return null
  }
}

/* ============================ markdown → 块 ============================ */

/** 笔记里的图片路径 → 站点路径。反斜杠换正斜杠、去 `images/` 前缀、后缀换 .webp。 */
function mdImageSrc(raw) {
  const rel = String(raw).replace(/\\/g, '/').replace(/^\.?\//, '')
  const withoutPrefix = rel.startsWith('images/') ? rel.slice('images/'.length) : rel
  const webp = withoutPrefix.replace(/\.(png|jpe?g)$/i, '.webp')
  return { file: withoutPrefix, url: `${IMAGE_ROOTS.md.urlBase}/${webp}` }
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

function makeInline(ctx) {
  return function inline(text) {
    const stash = []
    const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`

    let out = text.replace(/`([^`\n]+)`/g, (_m, code) => keep(`<code>${escapeHtml(code)}</code>`))

    // markdown 图片
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => {
      const { url } = mdImageSrc(src)
      return keep(ctx.figure(url, alt))
    })

    // 链接
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
      const clean = stripInline(label)
      const labelHtml = escapeHtml(clean)
      if (/^https?:/i.test(url)) {
        const shown = /^https?:/i.test(clean) ? escapeHtml(shortUrl(clean)) : labelHtml
        return keep(`<a class="doc-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">${shown}</a>`)
      }
      // 文档互链：先占位，等全部页拆完再回填真实路由（页结构此刻还不知道）
      return keep(ctx.docLink(url, labelHtml))
    })

    // 行内 HTML 图片（本批笔记的主力写法）。注意先 escape，标签已变成 &lt;img …&gt;
    out = escapeHtml(out)
    out = out.replace(/&lt;img\s+([^&]*?)\/?&gt;/g, (_m, attrs) => {
      const src = (attrs.match(/src="([^"]*)"/) ?? [])[1]
      if (!src) return ''
      const alt = (attrs.match(/alt="([^"]*)"/) ?? [])[1] ?? ''
      const { url } = mdImageSrc(src)
      return ctx.figure(url, alt)
    })
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => stash[Number(i)])
  }
}

/** markdown → { level, title, bodyLines }[]（按标题行切段） */
function splitMarkdownByHeading(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const segs = []
  let cur = null
  for (const line of lines) {
    const h = line.trim().match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      cur = { level: h[1].length, title: h[2].trim(), bodyLines: [] }
      segs.push(cur)
    } else if (cur) {
      cur.bodyLines.push(line)
    }
    // 第一个标题之前的行直接丢弃：笔记都以 `# 标题` 开头
  }
  return segs
}

/** 一段 markdown 正文 → HTML（标题/列表/表格/分隔线/段落/图片） */
function renderMarkdownBody(lines, ctx, inline) {
  const html = []
  const para = []
  const flush = () => {
    if (!para.length) return
    html.push(`<p>${inline(para.join(' '))}</p>`)
    para.length = 0
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flush()
      i++
      continue
    }

    // 内联 HTML 图片（整行）
    if (/^<img\b/i.test(trimmed)) {
      flush()
      const src = (trimmed.match(/src="([^"]*)"/) ?? [])[1]
      if (src) {
        const { url } = mdImageSrc(src)
        html.push(ctx.figure(url, (trimmed.match(/alt="([^"]*)"/) ?? [])[1] ?? ''))
      }
      i++
      continue
    }

    if (/^-{3,}$/.test(trimmed)) {
      flush()
      html.push('<hr class="doc-hr" />')
      i++
      continue
    }

    // pipe 表格（GFM）
    if (/^\|.*\|$/.test(trimmed) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      flush()
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(trimmed)
      i += 2
      const rows = []
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        rows.push(cells(lines[i].trim()))
        i++
      }
      html.push(
        `<div class="doc-table-wrap"><table class="doc-table"><thead><tr>${head
          .map((c) => `<th>${inline(c)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
      continue
    }

    // 列表
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flush()
      const items = []
      const baseIndent = line.length - line.trimStart().length
      while (i < lines.length) {
        if (lines[i].trim() === '') {
          const next = lines[i + 1]
          if (next && (/^\s*[-*]\s+/.test(next) || /^\s*\d+\.\s+/.test(next))) {
            i++
            continue
          }
          break
        }
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        if (!m) break
        if (m[1].length > baseIndent + 1) {
          // 嵌套：挂到上一个条目内部（早先 push 成兄弟节点，视觉上不再缩进）
          const sub = []
          let j = i
          while (j < lines.length) {
            const sm = lines[j].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
            if (!sm || sm[1].length <= baseIndent) break
            sub.push(`<li>${inline(sm[3].trim())}</li>`)
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
        items.push(`<li>${inline(m[3].trim())}</li>`)
        i++
      }
      html.push(`<ul class="doc-ul">${items.join('')}</ul>`)
      continue
    }

    para.push(trimmed)
    i++
  }
  flush()
  return html.join('\n')
}

/* ============================ 块模型 ============================ */

/** 统一的块：`{ level, title, id, ownHtml, children, chars, imgPx }`（chars/imgPx 含子孙） */
const makeBlock = (level, title, ownHtml, id) => ({ level, title, id, ownHtml, children: [], chars: 0, imgPx: 0 })

/** 从一段 HTML 里统计正文汉字数与图片占高。 */
function measureHtml(html) {
  const imgPx = []
  const imgRe = /<img\b[^>]*>/gi
  let m
  while ((m = imgRe.exec(html))) {
    const w = Number((m[0].match(/\bwidth="(\d+)"/) ?? [])[1] ?? 0)
    const h = Number((m[0].match(/\bheight="(\d+)"/) ?? [])[1] ?? 0)
    if (w > 0 && h > 0) imgPx.push((h * MOBILE_COL_PX) / w + FIGURE_EXTRA_PX)
  }
  const text = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/\u0002L\d+\u0002/g, '') // 互链占位符不算字数
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, '')
  return { chars: text.length, imgPx: imgPx.reduce((a, b) => a + b, 0), images: imgPx.length }
}

/** 由「标题层级 + 顺序」的扁平列表建树。 */
function buildTree(nodes) {
  const top = []
  const stack = []
  for (const n of nodes) {
    while (stack.length && stack[stack.length - 1].level >= n.level) stack.pop()
    if (stack.length) stack[stack.length - 1].children.push(n)
    else top.push(n)
    stack.push(n)
  }
  return top
}

/** 自底向上累计 chars / imgPx / images。 */
function accumulate(nodes) {
  for (const n of nodes) {
    accumulate(n.children)
    const own = measureHtml(n.ownHtml)
    n.ownChars = own.chars
    n.ownImgPx = own.imgPx
    n.ownImages = own.images
    n.chars = own.chars + n.children.reduce((a, c) => a + c.chars, 0)
    n.imgPx = own.imgPx + n.children.reduce((a, c) => a + c.imgPx, 0)
    n.images = own.images + n.children.reduce((a, c) => a + c.images, 0)
  }
}

/* ============================ 装箱 ============================ */

/**
 * 块自身的正文 + 全部子孙的正文。
 *
 * ⚠️ 页面渲染必须用它，**不能用 `b.ownHtml`**。踩过的坑：只取 ownHtml 时，
 *    一个「只有标题、正文都在子标题里」的小节被装进页面后渲染出来是**空的** ——
 *    实测 theory 下有 12 个页文件只有 46 字节（一个空 span），而清单里的字数还是对的
 *    （字数是自底向上累计的），于是"清单说有 390 字、打开页面什么都没有"。
 */
const fullHtml = (n) => (n.children?.length ? `${n.ownHtml}\n${n.children.map(fullHtml).join('\n')}` : n.ownHtml)

/**
 * 贪心装箱：整块塞得下就与后面的块继续凑；塞不下且还有更深的层级可下钻，就先收尾当前页、
 * 再对子块递归。下钻时**父块自己的标题与正文**会并进第一个子页（而不是自己单开一页），
 * 所以既不会丢掉章节标题，也不会多出一堆"0 屏"的空页。
 *
 * `canDescend` 的判据是**标题层级**而不是递归深度：`levels` 里存在比本块更深的层级就能下钻。
 * ⚠️ 早先写成 `depth + 1 < levels.length`（按递归深度限流），后果是 levels=[2,3] 的源
 *    只能下钻一层 —— 「二、学习记录」这一节（9 个 h3、8.3 屏）永远拆不开，稳超预算。
 */
function pack(nodes, levels, budget, depth = 0, trail = []) {
  const pages = []
  let cur = []
  let curChars = 0
  let curImgPx = 0
  const cost = () => screens(curChars, curImgPx)
  const flush = () => {
    if (cur.length) pages.push({ blocks: cur, chars: curChars, imgPx: curImgPx, cost: cost(), crumbs: trail })
    cur = []
    curChars = 0
    curImgPx = 0
  }

  for (const node of nodes) {
    const c = screens(node.chars, node.imgPx)
    const canDescend =
      depth < 12 && node.children.length > 0 && levels.some((l) => l > node.level) && node.level < 4
    if (c > budget && canDescend) {
      flush()
      const selfBlock =
        node.ownChars > 0 || node.ownImgPx > 0
          ? Object.assign(makeBlock(node.level, node.title, node.ownHtml, node.id), {
              chars: node.ownChars,
              imgPx: node.ownImgPx,
              images: node.ownImages,
              // 标记「这是下钻时父块自己的标题块」。它是**祖先**，不是页面主题 ——
              // 左栏的层级与页面标题全靠这个标记来区分（见页面构造处的 topic/ancestors）。
              isSelf: true,
            })
          : null
      const sub = pack(node.children, levels, budget, depth + 1, [...trail, stripInline(node.title)])
      /**
       * 父块自己的标题与正文**并进第一个子页**，绝不单独成页。
       *
       * ⚠️ 早先是把 selfBlock 塞进 `inner` 再交给递归，然后在递归返回后又并了一次 ——
       *    于是父标题在页面上出现**两遍**（实测 `虚幻引擎界面基础操作` 这份 h1 出现了 2 次，
       *    右栏大纲里同一个标签连着列 3 条）。现在父块根本不参与装箱，只做"贴到第一页前面"。
       */
      if (selfBlock) {
        const selfCost = screens(selfBlock.chars, selfBlock.imgPx)
        if (!sub.length) {
          pages.push({ blocks: [selfBlock], chars: selfBlock.chars, imgPx: selfBlock.imgPx, cost: selfCost, crumbs: trail })
        } else if (selfCost < budget) {
          const first = sub[0]
          const chars = first.chars + selfBlock.chars
          const imgPx = first.imgPx + selfBlock.imgPx
          sub[0] = { blocks: [selfBlock, ...first.blocks], chars, imgPx, cost: screens(chars, imgPx), crumbs: first.crumbs }
        } else {
          pages.push({ blocks: [selfBlock], chars: selfBlock.chars, imgPx: selfBlock.imgPx, cost: selfCost, crumbs: trail })
        }
      }
      for (const p of sub) pages.push(p)
      continue
    }
    if (cur.length && cost() + c > budget) flush()
    cur.push(node)
    curChars += node.chars
    curImgPx += node.imgPx
  }
  flush()
  return pages
}

/**
 * 收尾合并：把相邻的"小页"并起来。
 *
 * 为什么需要：装箱是**按父块递归**的，两个各自很小的小节只要分属不同的父块，
 * 就永远没机会坐在同一个箱子里 —— 实测会产出 0.4–0.7 屏的碎片页
 * （如「1.定义」0.7 屏 与「步骤」0.7 屏各自成页）。这里做一遍线性扫尾：
 * 相邻两页合并后仍不超预算、且至少有一页小于 1.2 屏，就合并。
 */
function mergeSmall(pages, budget) {
  for (let i = 0; i < pages.length - 1; ) {
    const a = pages[i]
    const b = pages[i + 1]
    if (a.cost + b.cost <= budget && (a.cost < 1.2 || b.cost < 1.2)) {
      const chars = a.chars + b.chars
      const imgPx = a.imgPx + b.imgPx
      pages.splice(i, 2, {
        blocks: [...a.blocks, ...b.blocks],
        chars,
        imgPx,
        cost: screens(chars, imgPx),
        crumbs: a.crumbs,
      })
      if (i > 0) i--
    } else {
      i++
    }
  }
  return pages
}

/* ============================ 渲染 ============================ */

/** 图片统一包 figure。width/height 必填 —— 原因见文件头第 4 条。 */
function makeFigure(url, alt, index) {
  const size = webpSize(join(root, 'public', url))
  const dim = size ? ` width="${size.w}" height="${size.h}"` : ''
  // 只有第一张懒加载，其余 eager + 低优先级：懒加载会让文档高度随滚动继续增长，
  // 靠后的锚点就永远跳不到（见文件头第 4 条）。
  const loading = index === 0 ? ' loading="lazy"' : ' fetchpriority="low"'
  const caption = alt && String(alt).trim() ? `<figcaption>${escapeHtml(stripInline(alt))}</figcaption>` : ''
  return (
    `<figure class="doc-figure">` +
    `<img data-doc-image src="${escapeAttr(url)}" alt="${escapeAttr(stripInline(alt ?? ''))}"${dim}${loading} decoding="async" />` +
    `${caption}</figure>`
  )
}

/** 给标题打上 doc-hN 类、保留/生成 id；**不输出 `#` 锚点**（见文件头第 3 条）。 */
function decorateHeadings(html, used) {
  const toc = []
  const out = html.replace(/<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/g, (_m, lvl, attrs, inner) => {
    const text = stripInline(inner)
    const level = Number(lvl)
    let id = (attrs.match(/\bid="([^"]*)"/) ?? [])[1] || slugify(text)
    let uniq = id
    let n = 2
    while (used.has(uniq)) uniq = `${id}-${n++}`
    used.add(uniq)
    toc.push({ id: uniq, label: text, level })
    return `<h${level} id="${escapeAttr(uniq)}" class="doc-h${level}">${inner}</h${level}>`
  })
  return { html: out, toc }
}

/**
 * 去掉正文开头的 n 个标题元素（n = 开头的祖先块数）。
 *
 * ⚠️ 为什么是"n 个"而不是"第一个"（2026-09 修）：拆出来的页常常以 **1~3 个祖先标题块**开头 ——
 *    下钻时父块的标题会并进第一个子页，父的父也会。只删第一个的后果：
 *      · 祖先有两层时只删一层 → 正文从**上一级**开始，与页头倒挂
 *        （5.1.1 用户行为日志获取页的正文从「5.1 协同过滤的实现」开始）
 *      · 而且「被抽去当页头标题的那一个」会比同级兄弟高一级（见下面的注释）
 *    现在统一成：**祖先标题全部去掉**（层级由页头面包屑表达），**主题标题留在正文里**。
 */
function dropLeadingHeadings(html, n) {
  let out = html
  for (let i = 0; i < n; i++) out = out.replace(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>\s*/, '')
  return out
}

/* ============================ 主流程 ============================ */

const warnings = []
const parsed = new Map()

/* --- 1) 解析所有源 → 块树 --- */
for (const src of SOURCES) {
  const abs = join(root, 'docs', src.file)
  if (!existsSync(abs)) {
    warnings.push({ title: `缺少源文件 ${src.file}`, chars: 0, images: 0, cost: 0 })
    parsed.set(src.id, [])
    continue
  }
  const raw = readFileSync(abs, 'utf8')

  if (src.format === 'html') {
    const marks = []
    const re = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/g
    let m
    while ((m = re.exec(raw))) {
      marks.push({ level: Number(m[1]), start: m.index, end: re.lastIndex, title: stripInline(m[3]) })
    }
    const nodes = marks.map((mk, i) => {
      const segEnd = i + 1 < marks.length ? marks[i + 1].start : raw.length
      return makeBlock(mk.level, mk.title, raw.slice(mk.start, segEnd), slugify(mk.title))
    })
    const tree = buildTree(nodes)
    accumulate(tree)
    parsed.set(src.id, tree)
  } else {
    const links = []
    const ctx = {
      images: new Set(),
      imgIndex: 0,
      figure(url, alt) {
        if (url.startsWith(IMAGE_ROOTS.md.urlBase)) {
          ctx.images.add(url.slice(IMAGE_ROOTS.md.urlBase.length + 1).replace(/\.webp$/, '.png'))
        }
        return makeFigure(url, alt, ctx.imgIndex++)
      },
      docLink(url, labelHtml) {
        links.push({ url, label: labelHtml })
        return `\u0002L${links.length - 1}\u0002`
      },
    }
    const inline = makeInline(ctx)
    const nodes = splitMarkdownByHeading(raw).map((s) => {
      const id = slugify(s.title)
      const body = renderMarkdownBody(s.bodyLines, ctx, inline)
      // ⚠️ 标题元素必须自己补出来。与论文源不同：pandoc 的 HTML 段落是**从 <hN> 开始切**的，
      //    标题天然在里面；而这里的 markdown 段落只存了正文，标题在 `s.title` 上。
      //    漏掉这一行时，md 源的页面里**一个标题都没有** —— 正文糊成一片，
      //    右栏大纲也空（只剩合成的那条「回到本篇开头」）。实测踩过。
      const heading = `<h${s.level} id="${escapeAttr(id)}">${inline(s.title)}</h${s.level}>`
      return makeBlock(s.level, s.title, `${heading}\n${body}`, id)
    })
    const tree = buildTree(nodes)
    accumulate(tree)
    parsed.set(src.id, { tree, links })
    // 图片自检：引用了但没转出来的直接报出来（避免上线后 404）
    for (const f of ctx.images) {
      const webp = join(IMAGE_ROOTS.md.fsRoot, f.replace(/\.(png|jpe?g)$/i, '.webp'))
      if (!existsSync(webp)) warnings.push({ title: `图片缺失 ${f}`, chars: 0, images: 0, cost: 0 })
    }
  }
}

/** 每份源自己的 H1 文本（只有单个顶层标题时才是"文档标题"）。记录它是为了对账时能**显式**放行，
 *  而不是让"故意不渲染文档标题"和"不小心丢了内容"在自检里长得一模一样。 */
const docTitles = {}

/* --- 2) 装箱 → 页面 --- */
const pages = []
for (const src of SOURCES) {
  const entry = parsed.get(src.id)
  const tree = entry?.tree ?? entry ?? []
  const totalChars = tree.reduce((a, n) => a + n.chars, 0)
  const totalImages = tree.reduce((a, n) => a + n.images, 0)
  // 「只有标题、没有正文」也算待导入：实战笔记目前就是这种占位（`# FPS游戏实战` 一行）
  if (!tree.length || (totalChars < 40 && totalImages === 0)) {
    pages.push({
      id: src.id,
      section: src.section,
      source: src.id,
      chapter: src.title,
      title: src.title,
      subtitle: src.subtitle,
      order: src.order,
      group: src.group ?? null,
      prereqId: src.prereq ?? null,
      status: 'pending',
      toc: [],
      blocks: null,
      stats: { chars: 0, images: 0, screens: 0 },
    })
    continue
  }
  const budget = src.split?.budget ?? DEFAULT_BUDGET
  const packed = mergeSmall(pack(tree, src.split?.levels ?? [2, 3], budget, 0, []), budget)
  /**
   * 「文档标题」那一层不进左栏。
   *
   * 一份源如果只有**一个**顶层标题，那就是文档自己的名字（如「虚幻引擎界面基础操作」），
   * 它和源标题（配置里的「界面基础操作」）说的是同一件事 —— 再占一层分组只是重复。
   * 而毕业论文有 10 个顶层标题（摘要 / 1 绪论 / 2 系统相关技术介绍 …），
   * 那些是**章**，必须留着当分组。
   */
  const docTitle = tree.length === 1 ? stripInline(tree[0].title) : null
  docTitles[src.id] = docTitle

  packed.forEach((p, idx) => {
    /**
     * 页面的**主题** = 第一个非「祖先块」的标题。
     *
     * ⚠️ 踩过的坑（用户直接反馈「左栏标题很乱」）：以前直接取 `blocks[0].title`，
     *    而拆出来的页往往以**容器标题**开头 —— 于是「2 系统相关技术介绍」这一页
     *    实际内容是 2.1 大数据平台 + 2.1.1~2.1.4，标题却写成了章名；
     *    「二、学习记录」这一页实际内容是 1.虚幻引擎和Fab，标题也写成了节名。
     *    左栏于是看不到真正的主题，层级也被压平。
     */
    const topicBlock = p.blocks.find((b) => !b.isSelf) ?? p.blocks[0]
    const topic = stripInline(topicBlock.title)
    const ancestors = (p.crumbs ?? []).filter((t, i) => !(i === 0 && t === docTitle))
    /**
     * 本页**实际装了哪几节**（去掉祖先块）。装箱会把相邻的小节并成一页，
     * 页标题只取得下第一个 —— 剩下的靠这个字段在左栏的悬停提示里说清楚
     * （「2. 标签页」这一页其实还装着「3. 主工具栏」）。
     */
    const labels = p.blocks.filter((b) => !b.isSelf).map((b) => stripInline(b.title))
    pages.push({
      id: slugify(topic),
      section: src.section,
      source: src.id,
      chapter: src.title,
      title: topic,
      /** 左栏层级：源 → ...ancestors → 本页 */
      ancestors,
      labels,
      subtitle: idx === 0 ? src.subtitle : null,
      order: idx + 1,
      group: src.group ?? null,
      prereqId: idx === 0 ? (src.prereq ?? null) : null,
      status: 'ready',
      blocks: p.blocks,
      stats: {
        chars: p.chars,
        images: p.blocks.reduce((a, b) => a + (b.images ?? 0), 0),
        screens: Number(p.cost.toFixed(1)),
      },
    })
  })
}

/* --- 3) 页 id 在分区内去重 --- */
{
  const seen = new Set()
  for (const p of pages) {
    const base = p.id
    let n = 2
    while (seen.has(`${p.section}/${p.id}`)) p.id = `${base}-${n++}`
    seen.add(`${p.section}/${p.id}`)
  }
}

/* --- 4) 源 → 页面映射（互链与前置都用它） --- */
const pagesOfSource = new Map()
for (const p of pages) {
  if (!pagesOfSource.has(p.source)) pagesOfSource.set(p.source, [])
  pagesOfSource.get(p.source).push(p)
}
const firstReady = (sourceId) => (pagesOfSource.get(sourceId) ?? []).find((p) => p.status === 'ready') ?? null

/* --- 5) 渲染正文 --- */
/** 把整段 HTML 里的标题层级整体平移 delta（用于把页面主题标题归一到 h2） */
function relevelHtml(html, delta) {
  if (!delta) return html
  return html.replace(/<(\/?)h([1-6])\b/g, (m, slash, n) => `<${slash}h${Math.min(6, Math.max(1, Number(n) + delta))}`)
}

const usedIds = new Set()
for (const p of pages) {
  if (!p.blocks) continue
  /**
   * 去掉几个标题：**只去开头的祖先块**（isSelf）。
   *
   * ⚠️ 主题标题**留在正文里**（2026-09 改，用户提案）。以前连主题标题一起删、再由页头显示它，
   *    后果是「被抽出来的那一个标题」比同级的兄弟高一级：论文 2.2 页实际装着
   *    2.2 / 2.3 / 2.4 三个**平行**小节，2.2 被提到页头当 h1，2.3、2.4 留在正文是 h2
   *    —— 同级看起来像父子。现在标题归位：正文从主题标题本身开始、**保持源里的相对层级**，
   *    页头只剩「我在哪」（来源文档 + 面包屑），于是 2.2 / 2.3 / 2.4 都是 h2。
   */
  const dropCount = (() => {
    const i = p.blocks.findIndex((b) => !b.isSelf)
    return i < 0 ? p.blocks.length : i
  })()
  /**
   * ⚠️ **层级归一化：页面主题标题一律是 h2**（2026-09，用户反馈"摘要、绪论字体不一致"）。
   *
   * 论文原文里**章是 h1、节是 h2**。标题归位到正文之后，"页面标题"就跟着源层级走了：
   *   章页（摘要 / 1 绪论）标题 = h1 → 得意黑 30px
   *   节页（2.1 / 2.2）    标题 = h2 → 黑体 700 24px
   * 同一个角色长得不一样。这里把整页标题**按同一差值平移**，使主题标题恒为 h2：
   *   摘要 / 绪论：h1→h2、h2→h3 ✓ 章与节的层级仍在
   *   2.1 / 2.2 ：本来就是 h2，delta=0，一动不动 ✓
   *   2.2 页内的 2.2 / 2.3 / 2.4 仍然同为 h2 ✓（不会退回"看起来像父子"那个问题）
   * 平移整页而不是只改主题标题，是为了保住页内的相对层级。
   */
  const topicLevel = p.blocks[dropCount]?.level ?? 2
  const raw = relevelHtml(p.blocks.map(fullHtml).join('\n'), 2 - topicLevel)
  // ⚠️ 用 fullHtml（含子孙），不是 ownHtml —— 原因见 fullHtml 的注释
  const { html, toc } = decorateHeadings(raw, usedIds)
  p.content = dropLeadingHeadings(html, dropCount)
  /**
   * 大纲仍从**主题标题之下**开始：主题标题就是本页标题，列进大纲会与页首那条 `doc-top` 重复。
   * 所以这里比正文多跳过一条。
   */
  p.toc = [{ id: 'doc-top', label: p.title, level: 1 }, ...toc.slice(dropCount + 1).filter((t) => t.level <= 3)]
  p.allIds = new Set(toc.map((t) => t.id))
  // 被去掉的标题仍要能被 `./x.md#锚点` 定位到本页（运行时找不到就回落到页首）
  p.droppedIds = toc.slice(0, dropCount).map((t) => t.id)
}
/** 源内锚点 → 落在哪一页（供 `./x.md#锚点` 精确定位） */
const anchorPage = new Map()
for (const p of pages) {
  if (!p.allIds) continue
  for (const id of p.allIds) anchorPage.set(`${p.source}#${id}`, p)
  if (p.droppedIds?.length) for (const id of p.droppedIds) anchorPage.set(`${p.source}#${id}`, p)
}

/* --- 6) 回填文档互链 --- */
for (const src of SOURCES) {
  const entry = parsed.get(src.id)
  if (!entry?.links) continue
  const hrefs = entry.links.map(({ url, label }) => {
    const [path, hash] = url.split('#')
    /**
     * 互链目标 → 源 id。
     *
     * ⚠️ 笔记里的写法**不统一**，实测三种混用：`./ue5-window-base.md`、
     *    `.\theory\ue5-window-base.md`（Windows 反斜杠 + 子目录）、`./x`（省 .md）。
     *    所以这里统一：反斜杠换正斜杠 → 取**最后一段** → 去 .md。
     *    源 id 就等于文件名（见 SOURCES 的注释），取 basename 是最稳的对法。
     *    早先只做了「去 ./ 去 .md」，Windows 写法的链接全部降级成「待导入」死文字（实测踩过）。
     */
    const target = path
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .split('/')
      .pop()
      .replace(/\.md$/, '')
    const list = pagesOfSource.get(target)
    if (!list || !list.length) {
      // 指向一个本站没有的源：保持不可点，避免死链
      return `<span class="doc-link-pending" title="该篇尚未导入本站">${label}</span>`
    }
    if (list.every((p) => p.status !== 'ready')) {
      return `<span class="doc-link-pending" title="该篇尚未导入本站">${label}<span class="doc-pending-badge">待导入</span></span>`
    }
    const page = (hash && anchorPage.get(`${target}#${decodeURIComponent(hash)}`)) || list.find((p) => p.status === 'ready')
    return `<a class="doc-link" href="#/docs/${page.section}/${encodeURIComponent(page.id)}">${label}</a>`
  })
  for (const p of pages) {
    if (p.source !== src.id || !p.content) continue
    p.content = p.content.replace(/\u0002L(\d+)\u0002/g, (_m, i) => hrefs[Number(i)] ?? '')
  }
}

/* --- 7) 落盘 --- */
// 页面目录整体重建；图片资产在 public/docs/<区>/images 与 public/docs/ue5/images，与此无关
rmSync(OUT_ROOT, { recursive: true, force: true })
// 老布局（public/docs/ue5/*.html）里的页文件已迁走，顺手清掉残留的 .html，只删 .html 不碰 images/
for (const entry of existsSync(join(root, 'public', 'docs')) ? readdirSync(join(root, 'public', 'docs'), { withFileTypes: true }) : []) {
  if (!entry.isDirectory() || entry.name === 'pages') continue
  for (const f of readdirSync(join(root, 'public', 'docs', entry.name))) {
    if (f.endsWith('.html')) rmSync(join(root, 'public', 'docs', entry.name, f), { force: true })
  }
}

const manifestPages = []
for (const p of pages) {
  const relHtml = `${p.section}/${p.id}.html`
  if (p.content != null) {
    mkdirSync(join(OUT_ROOT, p.section), { recursive: true })
    // 页首放一个可锚定的空 span：大纲第一项「回到本篇开头」指向它
    writeFileSync(join(OUT_ROOT, relHtml), `<span id="doc-top" aria-hidden="true"></span>\n${p.content}`, 'utf8')
  }
  const pre = p.prereqId ? firstReady(p.prereqId) : null
  manifestPages.push({
    id: p.id,
    section: p.section,
    source: p.source,
    chapter: p.chapter,
    title: p.title,
    /** 左栏的分组层级（源 → 这些标题 → 本页）。空数组 = 直接挂在源下面 */
    ancestors: p.ancestors ?? [],
    /** 本页实际装了哪几节（>1 时左栏悬停提示「还包含…」） */
    labels: p.labels ?? [],
    /** 最近两级祖先（面包屑用；`ancestors` 是完整链） */
    crumbs: (p.crumbs ?? []).slice(-2),
    subtitle: p.subtitle,
    order: p.order,
    group: p.group,
    prereq: pre ? { id: pre.id, title: pre.title } : null,
    status: p.status,
    toc: p.toc,
    // 相对 public/ 的路径：前端 fetch 时前面补 `docs/`（见 Docs.tsx 的 DOC_BASE）
    html: p.status === 'ready' ? `pages/${relHtml}` : null,
    stats: p.stats,
  })
}

/* --- 8) 篇尾「下一篇」：按**清单顺序**串（源顺序 → 源内页序） ---
 *
 * ⚠️ **不要按 `order` 排序**。`order` 是「页在**源内**的序号」，每个源都从 1 开始；
 *    对整个分区按它排会把各源的"第 01 页"排到一起，于是 `next` 永远指向
 *    **下一个文档的同一序号页**。实测：
 *      `[theory/unreal5-notes] #1 一、概况说明 -> next: 1. 菜单栏`（跨到了「界面基础操作」）
 *      `[theory/unreal5-notes] #2 1.虚幻引擎和Fab -> next: 2. 标签页`
 *    论文只有一份源，所以那一档是唯一正确的 —— 这类 bug 只在多源的区里露头。
 *    左栏（Docs.tsx 的 pages useMemo）早先犯过同一个错，这里当初漏改了。
 *
 * 同一份文档里翻页 → 用**页标题**（"下一节：编写双向自动门"）；
 * 跨文档 → 用**源标题**（"下一篇：蓝图编程基础"），因为下一页的标题只是那一篇的第一节，
 * 拿它当"下一篇"的名字会让人以为还是同一份文档。
 */
for (const s of SECTIONS) {
  const list = manifestPages.filter((p) => p.section === s.id) // 保持清单顺序，不排序
  for (let i = 0; i < list.length; i++) {
    if (list[i].status !== 'ready') continue
    const next = list.slice(i + 1).find((d) => d.status === 'ready')
    if (!next) continue
    const sameDoc = next.source === list[i].source
    list[i].next = { id: next.id, title: sameDoc ? next.title : next.chapter, sameDoc }
  }
}

const manifest = {
  _note: '由 scripts/build-docs.mjs 生成，请勿手改，也不进 git（见 .gitignore）。源在 docs/<区>/source/。',
  /**
   * 每份源自己的 H1（只有单个顶层标题时才算"文档标题"）。
   *
   * 这一层**故意不进正文、也不进左栏**：它与配置里的源标题（`sections`/`SECTIONS`）说的是同一件事，
   * 再渲染一遍就是重复。记录在这里是为了让 `check-docs.mjs` 的「源↔产物对账」能显式放行它 ——
   * 否则"故意不渲染"和"不小心丢了"在自检里长得一模一样。
   */
  docTitles,
  sections: SECTIONS.map((s) => {
    const list = manifestPages.filter((p) => p.section === s.id)
    return {
      ...s,
      ready: list.filter((p) => p.status === 'ready').length,
      total: list.length,
      chars: list.reduce((a, p) => a + p.stats.chars, 0),
      images: list.reduce((a, p) => a + p.stats.images, 0),
    }
  }),
  pages: manifestPages,
}
mkdirSync(dirname(MANIFEST_PATH), { recursive: true })
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

/* ============================ 报告 ============================ */

const ready = manifestPages.filter((p) => p.status === 'ready')
if (!QUIET) {
  console.log('')
  console.log(`文档区构建完成 · 预算 ${DEFAULT_BUDGET} 屏/页（手机口径：1 屏 ≈ 440 字）`)
  console.log('')
  for (const s of manifest.sections) {
    const list = manifestPages.filter((p) => p.section === s.id)
    const ok = list.filter((p) => p.status === 'ready')
    const pending = list.length - ok.length
    console.log(`  【${s.label}】${ok.length} 篇${pending ? ` · ${pending} 篇待导入` : ''}`)
    let lastChapter = null
    for (const p of ok) {
      if (p.chapter !== lastChapter) {
        console.log(`    ── ${p.chapter}`)
        lastChapter = p.chapter
      }
      const bar = '█'.repeat(Math.min(24, Math.round(p.stats.screens)))
      const flag = p.stats.screens > DEFAULT_BUDGET ? '  ⚠ 超预算' : ''
      console.log(
        `      ${String(p.order).padStart(2, '0')}  ${p.title}  —  ${p.stats.screens} 屏 · ${p.stats.chars} 字 · ${p.stats.images} 图  ${bar}${flag}`,
      )
    }
    console.log('')
  }
  const avg = ready.reduce((a, p) => a + p.stats.screens, 0) / Math.max(1, ready.length)
  console.log(
    `  合计 ${ready.length} 篇 · 平均 ${avg.toFixed(1)} 屏/篇 · 正文 ${ready.reduce((a, p) => a + p.stats.chars, 0)} 字 · 图 ${ready.reduce((a, p) => a + p.stats.images, 0)} 张`,
  )
  const over = ready.filter((p) => p.stats.screens > DEFAULT_BUDGET)
  if (over.length) {
    console.log(`  超预算 ${over.length} 篇（单块拆不动 —— 原文这一节里没有子标题，补几个 ### 就能继续拆）：`)
    for (const o of over) {
      console.log(`    · [${o.section}] ${o.chapter} › ${o.title} — ${o.stats.screens} 屏 / ${o.stats.chars} 字 / ${o.stats.images} 图`)
    }
  }
  console.log('')
}
if (warnings.length) {
  console.log(`[warn] ${warnings.length} 条：`)
  for (const w of warnings.slice(0, 30)) {
    console.log(`  · ${w.title}${w.cost ? `（${w.cost.toFixed(1)} 屏 / 字${w.chars} 图${w.images}）` : ''}`)
  }
}

/* --- 左栏层级预览（`--nav`）：按「源 → 祖先标题 → 页」把树打出来，用来核对导航结构 --- */
if (args.includes('--nav')) {
  console.log('\n左栏层级（源 → 分组 → 页）\n')
  for (const s of manifest.sections) {
    const list = manifestPages.filter((p) => p.section === s.id)
    if (!list.length) continue
    console.log(`【${s.label}】`)
    const stack = []
    for (const p of list) {
      if (p.status !== 'ready') {
        console.log(`  ${p.title}（待导入）`)
        continue
      }
      const path = [p.chapter, ...(p.ancestors ?? [])]
      let i = 0
      while (i < stack.length && i < path.length && stack[i] === path[i]) i++
      stack.length = i
      for (let k = i; k < path.length; k++) {
        console.log(`${'  '.repeat(k + 1)}▸ ${path[k]}`)
        stack.push(path[k])
      }
      console.log(`${'  '.repeat(path.length + 1)}· ${p.title}  —  ${p.stats.screens} 屏`)
    }
    console.log('')
  }
}
