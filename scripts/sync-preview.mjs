#!/usr/bin/env node
/**
 * 把一个**本地源工程**的生产构建产物同步成站内的在线预览。
 *
 * 为什么需要它（2026-09 建立）：
 *   `public/preview/book-recommendation/` 原来是**development 构建**（webpack `eval` devtool、
 *   未压缩），`js/` 约 4.67MB；而站点还提供了项目区入口与截图，读者点进去要下这一坨。
 *   生产构建后是 1.05MB（chunk-vendors 2281KB → 563KB），**体积降到约 1/4.5**。
 *   手工拷贝容易漏步骤（尤其是"补 apple-touch-icon"这一步），所以做成脚本。
 *
 * 用法：
 *   node scripts/sync-preview.mjs <源工程 dist 目录> <public/preview/<名字> 目录> [--dry]
 * 例：
 *   node scripts/sync-preview.mjs ../BookRecommendation/frontend/dist public/preview/book-recommendation
 *
 * ⚠️ 源工程的构建命令（顺序不能反）：
 *   cd <源工程>/frontend
 *   VUE_APP_EMBEDDED_DEMO 由 `.env.embedded` 提供 → 必须 `--mode embedded`，否则 publicPath 会是
 *   `/BookRecommendation/`（绝对路径），放进站内预览会**整页 404**。
 *   ⚠️ 还必须同时给 `NODE_ENV=production`：只写 `--mode embedded` 时 `NODE_ENV` 会变成 `embedded`，
 *      webpack 就不是 production 模式（实测仍带 `eval` devtool、不压缩，体积几乎不变）。
 *   完整命令（PowerShell）：
 *     $env:NODE_ENV='production'; npm run build -- --mode embedded; Remove-Item Env:\NODE_ENV
 *
 * 本脚本做三件事：
 *   1. 清空目标目录并复制源 dist（**不含** .map —— 源工程要配 productionSourceMap: false）；
 *   2. 给 index.html 的 </head> 前补 `<link rel="apple-touch-icon" ...>`；
 *   3. 打印前后体积对比，并校验资源引用是相对路径（`./` 开头或裸相对路径）。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const [srcArg, dstArg, ...flags] = process.argv.slice(2)
const dry = flags.includes('--dry')
if (!srcArg || !dstArg) {
  console.error('用法: node scripts/sync-preview.mjs <源 dist> <目标 preview 目录> [--dry]')
  process.exit(1)
}
const src = resolve(srcArg)
const dst = resolve(dstArg)
const root = resolve(import.meta.dirname, '..')

if (!existsSync(src)) {
  console.error(`[error] 源目录不存在：${src}`)
  process.exit(1)
}

/** 递归统计文件数与总字节 */
function walk(dir) {
  let files = 0
  let bytes = 0
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      const sub = walk(p)
      files += sub.files
      bytes += sub.bytes
    } else {
      files++
      bytes += st.size
    }
  }
  return { files, bytes }
}

const before = existsSync(dst) ? walk(dst) : { files: 0, bytes: 0 }
const after = walk(src)
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'

console.log(`源   ${relative(root, src)}  ${after.files} 个文件  ${mb(after.bytes)}`)
console.log(`目标 ${relative(root, dst)}  现有 ${before.files} 个文件  ${mb(before.bytes)}`)
if (before.bytes > 0) {
  const pct = Math.round((1 - after.bytes / before.bytes) * 100)
  console.log(`体积变化：${mb(before.bytes)} → ${mb(after.bytes)}（${pct >= 0 ? '减少' : '增加'} ${Math.abs(pct)}%）`)
}

// 1) 复制（排除 .map）
const mapFiles = []
function copyFiltered(from, to) {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const s = join(from, name)
    const d = join(to, name)
    const st = statSync(s)
    if (st.isDirectory()) copyFiltered(s, d)
    else if (name.endsWith('.map')) mapFiles.push(relative(src, s))
    else cpSync(s, d)
  }
}
if (dry) {
  console.log('[dry] 跳过实际写入')
} else {
  rmSync(dst, { recursive: true, force: true })
  mkdirSync(dst, { recursive: true })
  copyFiltered(src, dst)
  console.log(`已同步（跳过 ${mapFiles.length} 个 .map 文件）`)

  // 2) 补 apple-touch-icon
  const indexPath = join(dst, 'index.html')
  let html = readFileSync(indexPath, 'utf8')
  if (html.includes('apple-touch-icon')) {
    console.log('index.html 已有 apple-touch-icon，跳过')
  } else if (!existsSync(join(dst, 'apple-touch-icon.png'))) {
    console.warn('[warn] 目标目录没有 apple-touch-icon.png，不注入声明')
  } else {
    const tag = '<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png?v=1">'
    html = html.replace('</head>', `  ${tag}\n</head>`)
    writeFileSync(indexPath, html, 'utf8')
    console.log('已给 index.html 注入 apple-touch-icon（站点 README 要求"每个预览页均声明"）')
  }

  // 3) 校验资源是相对路径
  const abs = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1])
  if (abs.length) {
    console.error(`[error] index.html 里有 ${abs.length} 个绝对路径引用，放进站内预览会 404：`)
    abs.slice(0, 5).forEach((u) => console.error(`   ${u}`))
    console.error('   原因通常是构建时漏了 `--mode embedded`（publicPath 会变成 /BookRecommendation/）')
    process.exitCode = 1
  } else {
    console.log('✔ 资源引用均为相对路径（嵌入模式正确）')
  }
}
