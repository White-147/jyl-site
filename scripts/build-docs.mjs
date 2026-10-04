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
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs'
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
    /**
     * 面包屑里显示的**文档名**（比 `title` 短）。
     *
     * 为什么需要它（2026-10 定稿）：面包屑在手机上被收成**恒定一行**，而这一篇的文档名
     * 「基于借阅大数据的图书推荐系统的设计与实现」15 字 ≈ 220px（11px 字号），
     * 加上序号与本页标题就顶到 390px 的眼睛上了 —— 实测它是全站**唯一**会被省略号截断的文档名。
     * 用户定向：「像这种实际看着会很长的都可以单独处理」。
     *
     * ⚠️ 只影响**页头面包屑那一段**，论文正文标题、左栏、清单都不受影响；
     *    完整名字仍进面包屑的 `title` 属性（悬停可看）与读屏文本。
     */
    displayName: '借阅大数据图书推荐系统',
    subtitle: '本科毕业设计 · 数据科学与大数据技术 · 2023',
    order: 1,
    split: { levels: [1, 2, 3, 4] },
    /**
     * 按**标题原文**覆盖页头的显示标题（键是构建期算出来的页标题）。
     *
     * ⚠️ 为什么用标题原文当键而不是页 id：页 id 是 slug 产物（`摘-要-abstract`），
     *    改一次标题就静默失配；标题原文改了本来就要重新确认，失配会**看得见**。
     *    目前只有这一条：`摘 要 / Abstract` 混了中英文，在窄屏上是全站最长的一个标题。
     */
    pageDisplayTitles: { '摘 要 / Abstract': '摘要' },
  },

  {
    id: 'unreal5-notes',
    section: 'theory',
    // ⚠️ 2026-10 起源按类型分区：`source/md/` 放 markdown，`source/pdf/` 放原件（见 docs/联动维护点.md 13.9-F）
    file: 'theory/source/md/unreal5-notes.md',
    format: 'md',
    title: '虚幻引擎总览',
    subtitle: '环境准备、Fab、项目模板、界面与快捷键',
    order: 1,
    group: '入门',
    split: { mode: 'per-heading' },
    /**
     * ⚠️ **不配 `download`**（用户 2026-10 定向）：这一篇后续还要继续更新，
     *    捆绑一份会过期的 PDF 反而更糟。其余四篇已定稿，才配原件下载。
     */
  },
  {
    id: 'blueprint-base',
    section: 'theory',
    file: 'theory/source/md/blueprint-base.md',
    format: 'md',
    title: '蓝图基础',
    subtitle: '蓝图类、父类体系与 UE 对象模型',
    order: 2,
    group: '蓝图',
    prereq: 'unreal5-notes',
    split: { mode: 'per-heading' },
    download: { file: 'theory/source/pdf/blueprint-base.pdf' },
  },
  {
    id: 'ue5-window-base',
    section: 'theory',
    file: 'theory/source/md/ue5-window-base.md',
    format: 'md',
    title: '界面基础操作',
    subtitle: '菜单栏、标签页、主工具栏、视口工具栏、大纲视图、底边栏',
    order: 3,
    group: '界面',
    prereq: 'unreal5-notes',
    split: { mode: 'per-heading' },
    download: { file: 'theory/source/pdf/ue5-window-base.pdf' },
  },
  {
    id: 'ue5-window-advanced',
    section: 'theory',
    file: 'theory/source/md/ue5-window-advanced.md',
    format: 'md',
    title: '界面进阶操作',
    subtitle: '菜单栏、视口工具栏、大纲视图、内容侧滑菜单',
    order: 4,
    group: '界面',
    prereq: 'ue5-window-base',
    split: { mode: 'per-heading' },
    download: { file: 'theory/source/pdf/ue5-window-advanced.pdf' },
  },
  {
    id: 'blueprint-program-base',
    section: 'theory',
    file: 'theory/source/md/blueprint-program-base.md',
    format: 'md',
    title: '蓝图编程基础',
    subtitle: '增强输入、角色与视角移动、自动门、第三人称运动与动画',
    order: 5,
    group: '蓝图',
    prereq: 'blueprint-base',
    split: { mode: 'per-heading' },
    download: { file: 'theory/source/pdf/blueprint-program-base.pdf' },
  },

  {
    id: 'fps-game-notes',
    section: 'combat',
    file: 'combat/source/md/fps-game-notes.md',
    format: 'md',
    title: 'FPS 游戏实战',
    subtitle: '从零做一个可玩的第一人称射击关卡',
    order: 1,
    group: '实战案例',
    split: { mode: 'per-heading' },
  },
  {
    id: 'challenge-game-notes',
    section: 'combat',
    file: 'combat/source/md/challenge-game-notes.md',
    format: 'md',
    /* 用户 2026-09：这一篇是「闯关游戏实战」，不是「挑战游戏实战」（源里的 H1 就是「闯关游戏实战」） */
    title: '闯关游戏实战',
    subtitle: '从零搭一个可玩的闯关关卡：项目准备、角色移动与跳跃、动画蓝图',
    order: 2,
    group: '实战案例',
    prereq: 'fps-game-notes',
    split: { mode: 'per-heading' },
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
/** 站点静态根（`public/` 里的 `docs/`）—— 原件 PDF 的**复制目标**也在这里。 */
const PUB_DOCS = join(root, 'public', 'docs')
const MANIFEST_PATH = join(root, 'src', 'data', 'docs.json')

/**
 * LQIP（低清占位图）表：`库内相对路径 → data:image/webp;base64,…`
 *
 * 由 `python scripts/gen_lqip.py` 生成（**要提交**，构建才对所有人可复现）。
 * 缺项不报错、退化成原来的深色底 —— 但 `check-docs.mjs` 会把缺项判为失败，
 * 所以"加了新图忘了重跑"会在验证阶段被拦住，而不是悄悄退回黑框。
 */
const LQIP_TABLE = (() => {
  const p = join(root, 'src', 'data', 'doc-lqip.json')
  if (!existsSync(p)) {
    // 不静默：提示一句，构建照常（首次 checkout 后还没跑过 gen_lqip.py 的情况）
    console.warn('  ⚠️ 缺少 src/data/doc-lqip.json —— 配图会退回深色空框。跑：python scripts/gen_lqip.py')
    return {}
  }
  return JSON.parse(readFileSync(p, 'utf8'))
})()

/**
 * 从 `<img data-doc-image>` 的 `src` 反查 LQIP 键。
 *
 * 键的口径 = **库内相对路径带前缀**（`ue5/<子目录>/<名>.webp` / `thesis/<名>.webp`），
 * 与 `gen_lqip.py` 写出的表一致。`src` 是百分号编码的站点路径，先解码再去掉 `docs/` 前缀。
 *
 * ⚠️ 反查而不是"渲染时传下来"，是因为 LQIP 的注入点被**统一放在页面装配阶段**
 *    （见 `decoratePageImages`）：论文源走 pandoc HTML、不经过 `makeFigure`，
 *    渲染期传参会漏掉一整批图（实测漏了 41 张论文配图）。
 */
function lqipKeyFromSrc(src) {
  let s = src
  try { s = decodeURIComponent(s) } catch { /* 保留原文 */ }
  /**
   * ⚠️ 要同时剥掉 `docs/` 与 `images/` 两段 —— 表里的键是
   *    `ue5/<子目录>/<名>.webp` / `thesis/<名>.webp`（以**图片根**为基准），
   *    而 src 是 `docs/ue5/images/<子目录>/<名>.webp`（以站点根为基准）。
   *    少剥一段的后果是**静默漏配**：正则改了、优先级也打上了（看起来"跑过了"），
   *    只有 LQIP 一个都查不到，自检报 41 条缺项才暴露出来（2026-10 实测）。
   */
  if (s.startsWith('docs/')) s = s.slice('docs/'.length)
  if (s.startsWith('ue5/images/')) s = 'ue5/' + s.slice('ue5/images/'.length)
  else if (s.startsWith('thesis/images/')) s = 'thesis/' + s.slice('thesis/images/'.length)
  return s
}

/* ============================ 工具 ============================ */

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const escapeAttr = (s) => escapeHtml(s).replace(/'/g, '&#39;')

/** 标题 → 锚点 id。中文不音译，直接保留（与 GitHub 风格一致，也便于人工写深链）。 */
/** 去掉标题开头的序号前缀（`2. 自助答疑方法` → `自助答疑方法`），用于锚点的宽松匹配 */
const NO_NUM = (s) => String(s).replace(/^[0-9]+(?:[.．][0-9]+)*[.．、,，:：]?\s*/, '')

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

/**
 * 笔记里的图片路径 → 站点路径（**站点根相对**，任何页面地址下都能解析）。
 *
 * ⚠️⚠️ 这里必须**归一化前缀**，不能只认死一种写法。历史上有过两种源写法：
 *   ① 旧：`images/<子目录>/<名>.png`
 *   ② 新（2026-10 第十八轮起）：`../../../../public/docs/ue5/images/<子目录>/<名>.png`
 *      —— 改成磁盘相对路径是为了**在编辑器里能直接预览**，这个好处要保留。
 *
 * 但第一版 `mdImageSrc()` 只剥 `images/`，剥不掉 ② 的 `../../../../public/`，却**照样**
 * 在前面硬拼 `docs/ue5/images/`，于是产出的 src 变成：
 *   `docs/ue5/images/../../../../public/docs/ue5/images/x.webp`   ← 双前缀
 * 这条路径：
 *   · 在 `public/docs/pages/<区>/` 里 `existsSync` **居然为真**（`..` 按字面解析会退回仓库根，
 *     再进 public/docs/ue5/images 命中真文件）→ **自检长期报"配图全部落位"**；
 *   · 在浏览器里由页面 URL 解析 → `/jyl-site/docs/ue5/images/../../../../public/...` → **404**。
 * 结果线上 250/288 张配图全裂（论文那 38 张恰好是正确形态，所以只有 UE 部分坏）。
 *
 * 所以现在的口径是：**先归一化到"库内相对路径"，再统一拼一次 urlBase。**
 * 兜底逻辑写成"取 `docs/ue5/images/` 之后的片段"，因此 ①② 两种写法、以及将来可能
 * 又变的写法，只要路径里出现过这个资源根，就都能落到正确位置。
 */
const MD_IMAGE_ROOT_SEG = 'docs/ue5/images/'

function mdImageSrc(raw) {
  // 反斜杠换正斜杠
  let rel = String(raw).replace(/\\/g, '/')

  // ① 若路径里出现过资源根，取它之后的片段（兼容任意前缀写法）
  const at = rel.indexOf(MD_IMAGE_ROOT_SEG)
  if (at >= 0) {
    rel = rel.slice(at + MD_IMAGE_ROOT_SEG.length)
  } else {
    // ② 否则按"相对源文件目录"的写法剥前缀：去 ./ ../ 与开头/结尾的 /
    rel = rel.replace(/^(?:\.{1,2}\/)+/, '').replace(/^\/+/, '')
    // `public/` 也一并剥掉（`public/docs/...` 这种漏网的写法）
    rel = rel.replace(/^public\//, '')
    if (rel.startsWith('images/')) rel = rel.slice('images/'.length)
  }

  // 去掉可能残留的 ./ 段，压掉重复斜杠
  rel = rel.split('/').filter((s) => s && s !== '.').join('/')

  const webp = rel.replace(/\.(png|jpe?g)$/i, '.webp')
  return { file: rel, url: `${IMAGE_ROOTS.md.urlBase}/${encodeUrlPath(webp)}` }
}

/**
 * 逐段 URL 编码（保留 `/` 分隔符）。
 * ⚠️ 有 7 个真实文件名带**空格**（如 `Filp Flop.webp`）。裸空格在 `src` 里虽然多数浏览器
 *    会容忍，但它是非法 URL 字符，也会干扰自检里的字符串匹配 —— 统一编码更稳。
 * ⚠️ 只编码"输出的 URL"，**不动磁盘路径**（`file` 仍是原始相对路径，供 makeFigure 读尺寸用）。
 */
function encodeUrlPath(p) {
  return String(p)
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
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
      const { url, file } = mdImageSrc(src)
      return keep(ctx.figure(url, file, alt))
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
      const { url, file } = mdImageSrc(src)
      return ctx.figure(url, file, alt)
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
        const { url, file } = mdImageSrc(src)
        html.push(ctx.figure(url, file, (trimmed.match(/alt="([^"]*)"/) ?? [])[1] ?? ''))
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
 * 树节点 → **只含自身**的块（`children` 恒为空）。
 *
 * ⚠️ 页面正文用 `fullHtml`（**含子孙**）渲染，而"块"有时直接就是**树节点本身** ——
 *    它的 `children` 还挂着整棵子树，于是那一页会把整篇文档渲染一遍
 *    （实测「虚幻5引擎学习笔记」第 1 页装下 15 个标题、9280 字节）。
 *    字段**显式取**，绝不 `{ ...node }`。
 */
function toLeaf(n, extra = {}) {
  const b = makeBlock(n.level, n.title, n.ownHtml, n.id)
  b.chars = n.ownChars
  b.imgPx = n.ownImgPx
  b.images = n.ownImages
  return Object.assign(b, extra)
}

/**
 * 「这个标题带序号吗」—— 按序号切页时决定分不分页（用户口径：不带序号的并进上一页）。
 *
 * ⚠️⚠️ **不能简单写 `/^[一二三四五六七八九十百]+[、.．]/`** —— 那会把**以中文数字字开头的普通词**
 *    误判成序号（实测踩过，后果严重）：
 *      `引擎的下载和安装`（"引"像"九"）、`界面的…`（"界"里含"八"）、
 *      `大纲视图`（"大"像"十"）、`项目启动快捷键`（"项"里含"工"，但 `十`/`百` 类同）
 *    被当成"带序号标题"→ 该并进上一页的 H4 被当成边界 → 判据自相矛盾、整节内容消失。
 *
 * 所以中文数字只认**带明确分隔符**的写法（`一、`、`二.`、`三．`、`四，`、`五：`），
 * 阿拉伯数字则要求**数字后面紧跟分隔符**（`1.`、`1、`、`1，`）或**是纯数字标题**（`1 版本说明`）。
 * 覆盖：`1. 菜单栏`、`1.菜单栏`、`5.大纲视图`、`一、概况说明`、`第 3 章 …`、`3.1.1 …`。
 */
function isNumberedHeading(title) {
  const t = stripInline(String(title)).trim()
  /* 阿拉伯数字：`1.` / `1、` / `1，` / `3.1.1 ` 这类（点号可带空格） */
  if (/^\d+(\.\d+)*\s*[.、，,:：]/.test(t)) return true
  /* 阿拉伯数字后直接空格（`1 版本说明`）：只在**下一段不是中文量词**时才认 */
  if (/^\d+\s+\S/.test(t) && !/^\d+\s*[个张条页行字张秒项种类层级步]/.test(t)) return true
  /* 中文数字：必须带分隔符（`一、`、`二.`、`三．`、`四，`、`五：`），且后面不能再跟汉字（防"界/引/大"误判） */
  if (/^[一二三四五六七八九十百千]+\s*[、.．,，:：]/.test(t)) return true
  /* `第 3 章` / `第三节` */
  if (/^第\s*[0-9一二三四五六七八九十百]+\s*[章节篇部课]/.test(t)) return true
  return false
}

/**
 * 按序号节切页（`split.mode === 'per-heading'`，2026-09 用户定向）。
 *
 * 用户口径（逐条确认过）：
 *   · **H3 是实际内容**，带序号的 H3 **各自成页**；
 *   · **H2 不单独成页** —— 「h2 的正文就是 h3 的正文」，它在左栏里只是"可展开/收缩的条目"
 *     （点它不跳转，正文在各 H3 页里）；
 *   · H1 是文档名，不参与分页（`docTitle` 会把它从祖先链首过滤掉）；
 *   · 不带序号的标题（`### 步骤`、`#### 功能`）并进上一页当分隔。
 *
 * ⚠️⚠️ **祖先链必须在这里显式累积**（上一版最大的坑）：
 *    返回的页里带 `crumbs: string[]`（不含文档名的完整祖先链），
 *    页构造处据此算 `ancestors`。早先用 `pack` 的 `trail` 兜底，
 *    而 `pack` 传给它的 trail 是**空的** → 所有页 `ancestors=[]`、左栏层级全塌。
 */
/**
 * **按序号标题切页**（文档区的主力拆分模式，`split.mode === 'per-heading'` 的源走这里）。
 *
 * 与 `pack`（4 屏贪心装箱）的分工：
 *   · `pack` 只服务**论文**（外部 Word 稿，标题不带序号、层级也不规整）；
 *   · 本站自己的 UE 笔记全部走**按序号切页** —— 每个标题各自成页，页标题就是标题原文。
 *
 * ⚠️⚠️ **`ancestors` 只能由这里产出**：左栏的层级（`一、` → `1.` → `1.1`）完全依赖
 *    每页记下的祖先标题链 `chain`；`pack` 传进来的 trail 是**空的** →
 *    所有页 `ancestors=[]`、左栏层级全塌（实测过）。
 *    所以任何"让论文也走这条路径"的改动，都要先把 `chain` 一起补上。
 *
 * ⚠️ 页的 `id` 由 `slugify(标题原文)` 生成，标题改了 id 就变 —— 锚点与互链会一起失效，
 *    见 `docs/联动维护点.md` 的 13.9-B。
 */
function splitByNumberedHeading(tree, budget) {
  /**
   * ⚠️ h1 的待遇分两种情况（早先写漏了 `multiH1`，构建直接 ReferenceError）：
   *   · 一个源里有**多个 h1** → 它们是**章**（毕业论文：摘要 / 1 绪论 / 2 系统相关技术介绍…），各自成页；
   *   · 只有**一个 h1** → 它就是**文档名**（`# 虚幻5引擎学习笔记`），不参与分页，下钻到 h2/h3。
   */
  const multiH1 = tree.filter((n) => n.level === 1).length > 1

  /** 展平成线性序列，同时把祖先链累积到每一项上 */
  const seq = []
  const walk = (nodes, chain) => {
    for (const node of nodes) {
      /**
       * 分页边界（用户 2026-09 最终口径）：
       *   · 多 h1 的源：每个 h1 都是章，各自成页；单 h1 的源里 h1 是文档名，不参与分页；
       *   · **h3 一律成页** —— 不管带不带序号。用户实测：「创建蓝图里面步骤和各父类讲解是平级的，
       *     都是 H3，视口同理，不应该进行合并」；
       *   · **h4 及以下并进它所属的 h3 页**（`Actor`/`Pawn`/`角色`/`输入引脚`… 不单独成页）；
       *   · 带序号的 h2 仍是边界（它有正文就是页，没正文就作分组头）。
       * 实测影响：UE 两区 49 → 约 92 页（界面基础 8→17、界面进阶 6→19、蓝图编程 18→34）。
       */
      const splits =
        node.level === 1
          ? multiH1
          : node.level === 3 ||
            node.level === 4 ||
            (node.level === 2 && isNumberedHeading(node.title))
      seq.push({ node, chain, splits })
      /* ⚠️ 无论是不是分页边界都要递归：早先"边界不展开"，导致 h3 边界永远访问不到 */
      if (node.children.length) walk(node.children, [...chain, stripInline(node.title)])
    }
  }
  walk(tree, [])

  /**
   * 分组：一个边界节点 = 一页；它到下一个边界之前的正文并进这一页。
   *
   * ⚠️ 两处细节都是踩出来的：
   *   · 边界块用 `toLeaf`（不带子树）。否则 `fullHtml` 会把子树整个渲染出来，
   *     而子树里的 h3 又各自成页 → **同一节出现两遍**；
   *   · **只有标题、没有直属正文**的边界（如「一、概况说明」）**整条不建页** ——
   *     它是 H2，按用户口径本来就不该有独立页（正文都在 H3）；
   *     建页会得到一堆"只有一行标题"的空壳。
   */
  /**
   * 「这一节该不该占一个页」—— 用户口径：**空白的可点击页要收干净**。
   *
   * 判据（实测三类都要收）：
   *   · **只有标题、没有正文**的（`虚幻5引擎学习笔记`、`蓝图基础知识`：1 个标题、0 字）→ 整条不收；
   *   · **正文 < 40 字且没有子孙承载内容**的（`1.虚幻引擎和Fab`：0 字 0 标题；
   *     `3.运行配置`：28 字 0 标题）→ 整条不收 / 并进上一页；
   *   · **有正文、或子孙承载内容**的 → 是页。
   * ⚠️ 判据必须**自底向上**算（`carries`）：`1.虚幻引擎和Fab` 自己 0 字，
   *    但它的 H4「引擎的下载和安装」有正文 —— 那种情况它**不该自己成页**（内容在子节里），
   *    所以 `carries` 用来判断"它上面还有没有内容"，而不是判断"它自己是不是页"。
   */
  const TINY = 40
  /**
   * 这一节自己能不能撑起一页（用户口径："甲"）。
   *
   * ⚠️ 判据分两层，**不能只用自己的字数**：
   *   · **有子节**（`node.children.length > 0`）时：只有"自己确实有正文"（≥ TINY 字或有图）
   *     才算撑得起 —— 否则它是**纯容器**（如 `1.虚幻引擎和Fab` 10 字、内容全在 H4 里），
   *     不建页、只作分组头，让子孙各自成页；
   *   · **没有子节**（叶子节）时：**只要有任何正文就算** —— 它自己那几行就是全部内容，
   *     哪怕只有 14 字（`6. 界面基础操作`）也必须成页。
   *     早先一刀切用 `ownChars >= TINY(40)`，把 `1.虚幻引擎和Fab`(10字)、
   *     `6. 界面基础操作`(14字)、`7.界面进阶操作`(14字)、`8.蓝图基础`(17字)、
   *     `9.蓝图实战`(19字) **整批 continue 掉了**（用户实测：「虚幻5引擎学习笔记的内容
   *     放到二级目录里面就又缺了」——缺的就是这批）。
   */
  const solidPage = (n) => {
    const hasBody = (n.ownChars ?? 0) > 0 || (n.ownImages ?? 0) > 0
    if (!hasBody) return false
    if ((n.children ?? []).length === 0) return true
    return (n.ownChars ?? 0) >= TINY || (n.ownImages ?? 0) > 0
  }

  const groups = []
  let cur = []
  let curChain = []
  const flush = () => {
    /**
     * ⚠️ `hasContent`：**只问"这一页有没有任何正文"，不拿 `TINY` 当门槛**。
     *
     * 早先写成 `!b.isSelf || b.chars >= TINY`，后果是**丢内容**（用户实测：几乎所有文档的实际
     * 内容都比原文少）：分页头块（`isSelf: true`）的 `chars` 只是它**自身**的正文（不含子孙），
     * 一个 H3 节自己有 20 字（< TINY=40）时它的块被算成"非内容块"；若那一页只有它 →
     * `hasContent=false` → **整页被丢**，那 20 字就没了。再加上 `solidPage` 用同一个阈值，
     * 成了**双重过滤**，小节被吃掉一大片。
     * 现在：阈值**只用来判断"要不要单独成页"，绝不用来丢内容**。
     */
    const hasContent = cur.some((b) => (b.chars ?? 0) > 0 || (b.images ?? 0) > 0 || b.level >= 3)
    /**
     * 「标题页」：整页**只有文档名那一行、没有任何三级及以下的正文**（用户：「先把标题收掉」）。
     *
     * ⚠️ 必须同时要求"**没有任何正文**"（`chars` 全为 0 / 无图）：只判 `level <= 2` 会误伤
     *    "H2 自己有正文"的页 —— 如 `蓝图基础` 的 `1.定义`（1748 字，整页就是一个 H2 块），
     *    它被当成标题页丢掉，正文就没了（实测保留率 90.9% → 85.5% 的元凶之一）。
     */
    const noProse = cur.every((b) => (b.chars ?? 0) === 0 && (b.images ?? 0) === 0)
    const isTitleOnly = noProse && cur.every((b) => b.level <= 2)
    if (cur.length && hasContent && !isTitleOnly) groups.push({ blocks: cur, chain: curChain })
    cur = []
    curChain = []
  }
  let lastWasBoundary = false
  for (const { node, chain, splits } of seq) {
    if (splits) {
      /**
       * 带序号的节分两种（用户口径："甲"，2026-09 再次确认）：
       *   · **自己有正文** → 这个 H2/H3 就是这一页的标题（`isSelf` 块），
       *     后面**不带序号**的子孙并进本页；
       *   · **自己没正文**（纯容器，如 `1.虚幻引擎和Fab`、`2.创建蓝图`）→ 不建页、只作**分组头**，
       *     但它**必须收尾上一页**，好让它下面的子孙从**新页**开始。
       *
       * ⚠️⚠️ 这里是本轮最大的坑，调过三版：
       *   ① `if (!solidPage(node)) continue`（不 flush）—— 容器的子孙没有落点：
       *      不带序号的 H3（`引擎的下载和安装`）会**并进上一个边界那一页**，
       *      而挂在它下面的 H4 更会整块消失（用户实测：`1.虚幻引擎和Fab`、
       *      `6. 界面基础操作`、`7.界面进阶操作`、`8.蓝图基础`、`9.蓝图实战` 全没了）；
       *   ② "每个边界都 flush" —— 容器也打断上一页，蓝图编程基础掉到 93.3%；
       *   ③ **现在**：`flush()` 放在最前（**先收尾，再决定要不要建页**）——
       *      有正文就建页，没正文就走人，但两种情况都保证"子孙从新页开始"。
       */
      if (cur.length) flush()
      if (!solidPage(node)) continue
      cur.push(toLeaf(node, { isSelf: true }))
      curChain = chain
      lastWasBoundary = true
      continue
    }
    /* 非边界（不带序号的标题）：并进当前页；若上一个块是边界，先收尾一次防重复渲染 */
    if (lastWasBoundary && cur.length) flush()
    cur.push(toLeaf(node))
    if (!curChain.length) curChain = chain
    lastWasBoundary = false
  }
  flush()

  /* 超预算的页才继续按 h3/h4 下钻（与 pack 同口径） */

  const out = []
  for (const g of groups) {
    const chars = g.blocks.reduce((a, b) => a + (b.chars ?? 0), 0)
    const imgPx = g.blocks.reduce((a, b) => a + (b.imgPx ?? 0), 0)
    if (screens(chars, imgPx) <= budget) {
      out.push({ blocks: g.blocks, chars, imgPx, cost: screens(chars, imgPx), crumbs: g.chain })
      continue
    }
    const head = g.blocks[0]
    const body = g.blocks.slice(1)
    const sub = body.length ? pack(body, [3, 4], budget, 0, g.chain) : []
    if (sub.length <= 1) {
      out.push({ blocks: g.blocks, chars, imgPx, cost: screens(chars, imgPx), crumbs: g.chain })
      continue
    }
    sub[0] = { ...sub[0], blocks: [head, ...sub[0].blocks] }
    for (const s of sub) out.push({ ...s, crumbs: s.crumbs?.length ? s.crumbs : g.chain })
  }
  return out
}

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

/** 图片统一包 figure。width/height 必填 —— 原因见文件头第 4 条。
 *
 *  ⚠️ `rel` 是**未编码**的库内相对路径（`<子目录>/<名>.webp`），用来读磁盘量尺寸；
 *     `url` 是**已编码**的站点路径，写进 `src`。两者必须分开：
 *     文件名带空格的那 7 张（如 `Filp Flop.webp`）编码后是 `%20`，
 *     拿它去 `join(root,'public',…)` 读文件会量不到尺寸 → 少了 width/height → 锚点跳转失准。 */
function makeFigure(url, rel, alt) {
  const size = rel ? webpSize(join(IMAGE_ROOTS.md.fsRoot, rel)) : webpSize(join(root, 'public', url))
  const dim = size ? ` width="${size.w}" height="${size.h}"` : ''
  const caption = alt && String(alt).trim() ? `<figcaption>${escapeHtml(stripInline(alt))}</figcaption>` : ''
  /**
   * ⚠️ 这里**只出结构**，不打 `loading` / `fetchpriority`，也不挂 LQIP ——
   *    全部交给装配阶段的 `decoratePageImages()`。两个原因（都是实测踩出来的）：
   *      ① 优先级：`makeFigure` 按**源**计数，而一个源会被切成十几页，
   *         于是只有每个源的第一页拿到高优先级（实测 119 页全是 low）。"首屏"是**页**的概念。
   *      ② LQIP：论文源走 pandoc HTML、**不经过这里**，在这挂会漏掉 41 张论文配图。
   */
  return (
    `<figure class="doc-figure">` +
    `<img data-doc-image src="${escapeAttr(url)}" alt="${escapeAttr(stripInline(alt ?? ''))}"${dim} decoding="async" />` +
    `${caption}</figure>`
  )
}

/**
 * 页面装配阶段的配图统一装饰（**必须在装箱之后**调用，一处覆盖所有源）。
 *
 * 干两件事：
 *   ① **LQIP**：从 `src` 反查低清占位图，挂到 `figure` 的 `background-image` 上。
 *      没有它，那块按 width/height 预留的区域在真图到达前就是一块**深色空盒** ——
 *      真机 Fast 3G 实测空窗 **约 5.9 秒**（4G 良好 1.9 秒），正是用户反馈的"图片默认黑屏"。
 *   ② **加载优先级**：每页前 2 张 `fetchpriority="high"`，其余 `loading="lazy" fetchpriority="low"`。
 *
 * ⚠️ 旧口径的错误（2026-10 第十九轮实测纠正）：原来是"只有第一张 `loading="lazy"`、
 *    其余 286 张全部 `fetchpriority="low"`" —— 首图被懒加载压后（文档内容是取回 HTML 后
 *    由 React 注入的，注入时布局未稳），其余被降级到文本/字体/脚本之后。
 * ⚠️ 别把"其余"也改成 eager：一页最多 11 张，全部 eager 会挤占正文与字体的带宽。
 * ⚠️ 别把 LQIP 挪回渲染期：那会漏掉论文源（见 makeFigure 的注释）。
 */
function decoratePageImages(html) {
  const EAGER = 2
  let i = 0
  /**
   * ⚠️ 正则要**宽容**（2026-10 实测踩过）：
   *    `doc-figure` 后面可能已经带了 ` style="…"`（上一轮构建留下的，或渲染期挂的），
   *    也允许 figure 与 img 之间有空白/换行 —— 绷得太紧会**一条都不匹配**，
   *    而且是"静默不匹配"（构建照常成功、只是占位图没了）。所以这里用 `[^>]*` + `\s*`。
   *    另外 `[^>]*?` 匹配 img 的属性时不会跨过 `>`，不会误吃下一个标签。
   */
  return html.replace(
    /<figure class="doc-figure"[^>]*>\s*<img\b([^>]*?)\bsrc="([^"]+)"/g,
    (_m, attrsBeforeSrc, src) => {
      const lqip = LQIP_TABLE[lqipKeyFromSrc(src)]
      const style = lqip ? ` style="background-image:url(&quot;${lqip}&quot;)"` : ''
      const prio = i++ < EAGER ? 'fetchpriority="high"' : 'loading="lazy" fetchpriority="low"'
      // 保留 img 上原有的其它属性（alt / width / height / decoding），去掉可能重复的优先级属性
      const rest = attrsBeforeSrc
        .replace(/\s*(?:loading|fetchpriority)="[^"]*"/g, '')
        .replace(/\s+$/, '')
      return `<figure class="doc-figure"${style}><img data-doc-image ${prio} src="${src}"${rest}`
    },
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
      figure(url, rel, alt) {
        // ⚠️ 存**未编码**的相对路径（`url` 现在是编码过的，拿它去查磁盘会因 %20 之类失配）
        if (rel) ctx.images.add(rel)
        return makeFigure(url, rel, alt)
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
    // ⚠️ `ctx.images` 存的是**库内相对路径**（未编码），与 `mdImageSrc().file` 同源
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
  const packed =
    src.split?.mode === 'per-heading'
      ? splitByNumberedHeading(tree, budget)
      : mergeSmall(pack(tree, src.split?.levels ?? [2, 3], budget, 0, []), budget)
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

/**
 * 源的「原件下载」信息 → 写进 manifest。
 *
 * ⚠️ 断言的是**复制之后**在 `public/docs/<download.file>` 的位置 —— 源在 `docs/<区>/source/pdf/`，
 *    由上面那段「PDF 复制」搬过去（两处路径必须一起改）。
 *
 * 为什么在**构建期 stat 一次**、而不是把大小写死在配置里：
 *   大小是文件的事实，写死就会漂移（换了 PDF 忘了改数，页面上写着 8.2 MB 实际 16 MB）。
 *   这里读不到文件时**直接抛**，让构建当场红掉 —— 否则会安静地生成一个 404 的下载按钮。
 *
 * `href` 是**相对 public/ 的路径**（与 `html` 字段同一口径），前端按 `import.meta.env.BASE_URL`
 * 补前缀、再补 `DOCS_FETCH_BASE`（`docs`）—— 见 `Docs.tsx` 里那条长注释与 `types.ts` 的提醒。
 */
function downloadInfo(srcCfg) {
  const rel = srcCfg.download.file
  const abs = join(PUB_DOCS, rel)
  if (!existsSync(abs)) {
    throw new Error(
      `[docs] ${srcCfg.id} 声明了原件下载，但 public/docs/${rel} 不存在。\n` +
        `        源应在 docs/${rel}（由 scripts/compress_attachments.py 生成），构建会把它复制过去。`,
    )
  }
  const bytes = statSync(abs).size
  return {
    href: rel, // 相对 public/：`theory/source/pdf/x.pdf`
    bytes,
    mb: Math.round((bytes / 1048576) * 10) / 10, // 一位小数，界面直接用
  }
}

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
  /**
   * ⚠️ 按**页**给配图打加载优先级，必须在这里（装箱之后、本页内容定稿之时）。
   *    放在 `makeFigure` 里是错的：那一步按**源**计数，而一个源会被切成十几页 ——
   *    详见 `decoratePageImages` 顶部注释（实测 119 页拿不到高优先级）。
   */
  p.content = decoratePageImages(dropLeadingHeadings(html, dropCount))
  /**
   * 大纲仍从**主题标题之下**开始：主题标题就是本页标题，列进大纲会与页首那条 `doc-top` 重复。
   * 所以这里比正文多跳过一条。
   */
  p.toc = [{ id: 'doc-top', label: p.title, level: 1 }, ...toc.slice(dropCount + 1).filter((t) => t.level <= 3)]
  p.allIds = new Set(toc.map((t) => t.id))
  // 被去掉的标题仍要能被 `./x.md#锚点` 定位到本页（运行时找不到就回落到页首）
  p.droppedIds = toc.slice(0, dropCount).map((t) => t.id)
}
/**
 * **源内锚点 → 它所在的那一页**，两种来源都要收：
 *   ① `p.allIds`：这一页**包含**的标题 id（页内小节）；
 *   ② `p.title` 的 slug：这个标题**自己就是一页**（切页把它切出去了）。
 *
 * ⚠️ 少了 ② 的后果（用户实测）：`界面基础操作` 里指向 `#2. 自助答疑方法`、
 *    `#4. 变换工具快捷键`、`#Fab插件的安装` 的互链**只能到文档第一页** ——
 *    因为那些标题已经是独立页、页内根本没有同名锚点，查不到就退回兜底了。
 *    按用户口径「跳转到对应页或者对应页的内部位置」，这种情况**该直接跳那一页**。
 */
/** 源内锚点 → 落在哪一页（供 `./x.md#锚点` 精确定位） */
const anchorPage = new Map()
/** 宽松匹配（去序号前缀）；值为 `null` 表示多个标题撞了同一个键，宁可不猜 */
const anchorLoose = new Map()
for (const p of pages) {
  if (!p.allIds) continue
  for (const id of p.allIds) anchorPage.set(`${p.source}#${id}`, p)
  /* ② 这个标题自己就是一页（切页切出去了）→ 锚点直接命中这一页 */
  anchorPage.set(`${p.source}#${slugify(p.title)}`, p)
  /**
   * 宽松匹配用的第二张表：**去掉标题里的序号前缀**再建一次键。
   *
   * ⚠️ 为什么需要（用户实测）：源笔记里写的锚点是 `#自助答疑方法`（**不带序号**），
   *    而标题实际是 `### 2. 自助答疑方法` → 页 id 是 `2-自助答疑方法` —— 两者不相等，
   *    链接于是落到兜底页（只能到文档、到不了标题）。用户用的是 Typora，它按**标题文字**
   *    生成锚点，序号本来就不该出现在锚点里，所以这是"锚点风格差异"，不是写错。
   * 规则：把锚点与键都去掉开头的序号（`2.` / `4.` / `3.1.1`）再比一次。
   */
  const noNum = NO_NUM
  for (const id of p.allIds ?? []) {
    const k = `${p.source}#${noNum(id)}`
    anchorLoose.set(k, anchorLoose.has(k) ? null : p) // 撞键就置 null（多义，不猜）
  }
  const k2 = `${p.source}#${noNum(slugify(p.title))}`
  anchorLoose.set(k2, anchorLoose.has(k2) ? null : p)
  if (p.droppedIds?.length) for (const id of p.droppedIds) anchorPage.set(`${p.source}#${id}`, p)
}

/**
 * 丢掉**纯文档标题页**（用户：「虚幻5引擎学习笔记 那个 H1 标题页」要收掉；并提醒
 * 「少于一屏全部去掉肯定会有连带的问题，不能只看这一篇」）。
 *
 * ⚠️⚠️ **必须放在渲染循环之后**：`toc` 是渲染时才填的（第 5 步），
 *    放在第 3 步时 `toc.length` 恒为 0，判据永远不命中（我因此白跑了一轮）。
 *
 * 判据**三个条件同时满足**（实测精准命中 6 张、零误伤）：
 *   · `title === docTitles[source]` —— 它就叫文档名（`虚幻5引擎学习笔记` 这种）；
 *   · `toc.length === 1` —— 页内只有它自己一个标题、没有任何下级标题；
 *   · `chars < 40` —— 没有实质正文（只有标题那一行）。
 * ⚠️ 试错记录（两版都误伤，别再犯）：
 *   · `prose < 40` → 误删"文档名 + 第一节"合并的那一页 → 第一节内容跟着没了；
 *   · `blocks.length === 1 && level === 1` → 论文走 pack、那个块带整棵子树 → 论文 19→14 页。
 * 关键在 `toc.length === 1`：并进了第一节的页 toc ≥ 2，会被排除。
 */
{
  const droppedTitles = []
  for (let i = pages.length - 1; i >= 0; i--) {
    const pg = pages[i]
    if (pg.status !== 'ready') continue
    if (pg.title !== docTitles[pg.source]) continue
    if ((pg.toc ?? []).length !== 1) continue
    if ((pg.stats?.chars ?? 0) >= 40) continue
    droppedTitles.push(`${pg.title}(${pg.stats?.chars ?? 0}字)`)
    pages.splice(i, 1)
  }
  if (droppedTitles.length) console.log('  纯标题页已收掉 %d 张：%s', droppedTitles.length, droppedTitles.join('、'))
}

/**
 * ⚠️ **丢掉纯文档标题页**（用户：「虚幻5引擎学习笔记 那个 H1 标题页」要收掉）。
 *
 * 判据三条同时满足（实测精准命中 6 张、零误伤）：
 *   · `title === docTitles[source]` —— 它就叫文档名；
 *   · `toc.length === 1` —— 页内只有它自己一个标题、没有下级标题；
 *   · `chars < 40` —— 没有实质正文。
 *
 * ⚠️⚠️ **必须在这里做**（渲染之后、生成 `manifestPages` 之前）：
 *    早先放在"页 id 去重"那一步（更早），结果 `pages` 里删了、而 `manifestPages`
 *    仍按 `pages` 的原始顺序生成 —— 于是**「下一篇」导航取到的第一页是被删掉的标题页**，
 *    生成 `#/docs/theory/蓝图编程基础` 这种**指向不存在页**的链接，点下去正文空白
 *    （用户实测：「新增前置操作里面的跳转是失效的」—— 那条正是该文档最后一页的"下一篇"）。
 *    两个数组必须看到同一份 pages。
 * 判据里 `toc` 是渲染阶段填的，所以也只能放在渲染之后。
 */
{
  const dropped = []
  for (let i = pages.length - 1; i >= 0; i--) {
    const pg = pages[i]
    if (pg.status !== 'ready') continue
    if (pg.title !== docTitles[pg.source]) continue
    if ((pg.toc ?? []).length !== 1) continue
    if ((pg.stats?.chars ?? 0) >= 40) continue
    dropped.push(`${pg.title}(${pg.stats?.chars ?? 0}字)`)
    pages.splice(i, 1)
  }
  if (dropped.length) console.log('  纯标题页已收掉 %d 张：%s', dropped.length, dropped.join('、'))
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
    /**
     * ⚠️ **互链落点**（2026-09 用户定向：「跳转到对应页或者对应页的内部位置」）。
     *
     * 两种落点：
     *   ① 目标标题**自己就是一页**（切页切到了它）→ 直接跳那一页，没有页内锚点；
     *   ② 目标标题**落在某一页内部**（如页内的 H4「输入引脚」）→ 跳那一页 **+ `?s=<锚点 id>`**，
     *      运行时据此滚到那个标题。
     *
     * ⚠️ 早先这里**只跳页、从不带 `?s=`**，于是所有"页内落点"的互链都停在文章顶部
     *    （实测 26 条互链里带锚点的是 **0** 条）—— 用户最初要求"把每个带序号的标题单独分出来"
     *    就是为了这个，页内定位必须补上。
     */
    const anchor = hash ? decodeURIComponent(hash) : null

    if (process.env.TRACE_A === '1' && anchor && src.id === 'ue5-window-base') {
      const key = `${target}#${slugify(anchor)}`
      console.log('A target=%s rawAnchor=%j slug=%j keyHit=%s keys=%j',
        target, anchor, slugify(anchor), anchorPage.has(key) ? anchorPage.get(key).id : 'NO',
        [...anchorPage.keys()].filter((k) => k.startsWith(target + '#')).slice(0, 6))
    }
    /**
     * ⚠️⚠️ **兜底不能再落到 `list[0]`**（2026-09 用户实测报出死链）。
     *
     * `list[0]` 是**文档标题页**（如「蓝图编程基础」这一页，整篇只有一行文档名），
     * 而构建期最后会把这类纯标题页**删掉** → 它已经不在 `pages` 里 →
     * 生成的 href 指向一个**不存在的页 id**，点下去**正文空白**。
     * 用户实测正是这条：`新增前置操作` 里的「蓝图编程基础…」点了没内容
     * （锚点 `#2.实现角色移动` 在笔记更新后改名了，解析失败 → 走兜底 → 死链）。
     *
     * 所以兜底改成：**取该源"删页之后"仍在的第一页**；若某源一页不剩，
     * 则退到**分区首页**（`#/docs/<section>`），绝不会出现"指向不存在页"的链接。
     */
    // ⚠️ 用**最终清单**（`pages`）过滤：早先用 `list[0]`，而 `list[0]` 是"文档标题页"（随后被删）
    const readyList = list.filter((p) => p.status === 'ready' && pages.includes(p))

    if (process.env.TRACE_LINK === '1') {
      console.log('LINK src=%s target=%s anchor=%j list=%d readyList=%d firstId=%j',
        src.id, target, anchor, list.length, readyList.length, readyList[0] ? readyList[0].id : '-')
    }
    /**
     * ⚠️⚠️ 查表**必须先用 `slugify(anchor)`** —— `anchorPage` 的键是**标题的 slug**
     *    （`5-实现角色移动`），而源里的锚点是**标题原文**（`5. 实现角色移动`）。
     *    早先拿原文直接查 → 永远不命中 → 每条互链都退回 `readyList[0]`
     *    （实测：`新增前置操作` 里那条本该落到「5. 实现角色移动」，却落到了文档第一页）。
     */
    const page =
      (anchor &&
        (anchorPage.get(`${target}#${slugify(anchor)}`) ||
          /* 宽松兜底：去掉序号前缀再找（`自助答疑方法` → `2. 自助答疑方法`）；撞键时值为 null，视为找不到 */
          anchorLoose.get(`${target}#${NO_NUM(slugify(anchor))}`))) ||
      readyList[0] ||
      null
    if (!page) {
      /* 目标源在本站一页都不剩（理论上不会发生，留个安全出口）→ 指向分区首页 */
      return `<a class="doc-link" href="#/docs/${list[0].section}">${label}</a>`
    }
    /* 目标锚点就是这一页的主题 → 不必再带页内锚点（`doc-top` 与主题标题是同一位置） */
    const needAnchor = anchor && page.allIds?.has(anchor) && slugify(page.title) !== anchor
    return `<a class="doc-link" href="#/docs/${page.section}/${encodeURIComponent(page.id)}${needAnchor ? `?s=${encodeURIComponent(anchor)}` : ''}">${label}</a>`
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

/**
 * 原件（PDF）**从 docs/ 复制到 public/**。
 *
 * ⚠️⚠️ 为什么必须有这一步（2026-10 实测踩过）：
 *    用户定向 B-2 要「md 与 pdf 分文件夹、都放在 docs/<区>/source/ 下」，
 *    所以 PDF 的**唯一来源**在 `docs/<区>/source/pdf/`（进 git）。
 *    但站点只能从 `public/` 出东西 —— PDF 不复制过去，浏览器拿到的是静态服务器
 *    兜底的 index.html（表现是"点下载得到一张网页"，实测就是这个）。
 *    `downloadInfo()` 的 `href` 断言的是**复制之后**在 public/ 里的位置，
 *    所以这一步必须排在 `manifestPages` 之前（下面 downloadInfo 会 stat 目标文件）。
 *    ⚠️ 与 `public/docs/pages/` 不同：那份是**产物**、不进 git（见 .gitignore），
 *       而这份复制品同样不进 git —— 源在 docs/ 里，是它进 git。
 */
for (const src of SOURCES) {
  if (!src.download) continue
  const from = join(root, 'docs', src.download.file)
  const to = join(PUB_DOCS, src.download.file)
  if (!existsSync(from)) continue // 交给 downloadInfo 抛，报错口径统一在一处
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
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
  const srcCfg = SOURCES.find((s) => s.id === p.source)
  manifestPages.push({
    id: p.id,
    section: p.section,
    source: p.source,
    chapter: p.chapter,
    title: p.title,
    /**
     * 页头显示用的短标题（可选）。键是源的 `pageDisplayTitles`，**按标题原文匹配**。
     * 没配就是 `title` 本身 —— 组件那边 `displayTitle ?? title`。
     */
    displayTitle: srcCfg?.pageDisplayTitles?.[p.title] ?? null,
    /** 文档名的短显示名（可选）。面包屑的根那一段用；没配就用 `docName`/`chapter`。 */
    docDisplayName: srcCfg?.displayName ?? null,
    /** 本源的「原件下载」（可选）。**构建期 stat 出真实字节数**，界面侧的 MB 数永不漂移。 */
    download: srcCfg?.download ? downloadInfo(srcCfg) : null,
    /** 左栏的分组层级（源 → 这些标题 → 本页）。空数组 = 直接挂在源下面 */
    ancestors: p.ancestors ?? [],
    /** 本页实际装了哪几节（>1 时左栏悬停提示「还包含…」） */
    labels: p.labels ?? [],
    /** 最近两级祖先（面包屑用；`ancestors` 是完整链） */
    crumbs: (p.crumbs ?? []).slice(-2),
    subtitle: p.subtitle,
    /**
     * 文档名（面包屑的根，源里的那个 H1，如 `虚幻5引擎学习笔记`）。
     *
     * ⚠️ **每一页都带**，不要靠序号判断"首页"：
     *    构建期会删掉"纯文档标题页"，而**序号不重排** —— 于是每篇的第一页 `order` 是
     *    **2 而不是 1**（实测踩过：写成 `order === 1` 时 docName 全是 null）。
     *    组件按当前页取自己的 `docName` 即可，没有"只给首页"的必要。
     * ⚠️ 论文（多 h1）的 `docTitles` 是 null —— 它没有单一文档名，面包屑的根退回 `chapter`。
     */
    docName: docTitles[p.source] ?? null,
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
}  /**
   * ⚠️ 丢掉**文档标题页**（用户：「虚幻5引擎学习笔记 那个 H1 标题页」要收掉）。
   *
   * 判据：`title` 就是**文档名**（`docTitles[source]`）、且**整页没有正文**。
   * 它是 `# 虚幻5引擎学习笔记` 那个 H1 自己成的一页（8 页里第 1 页，0 字 0 图）。
   * 左栏一级目录里已经有「虚幻引擎总览」这个名字了，页内在出现一次纯属重复。
   * ⚠️ 只有"没有正文"时才丢：若该页还并进了别的节（有正文），必须留着。
   */
  for (let i = pages.length - 1; i >= 0; i--) {
    const pg = pages[i]
    if (pg.status !== 'ready' || pg.title !== docTitles[pg.source]) continue
    const blocks = pg.blocks ?? []
    const prose = blocks.reduce((a2, b2) => a2 + (b2.chars ?? 0) + (b2.images ?? 0), 0)
    if (prose === 0) pages.splice(i, 1)
  }


