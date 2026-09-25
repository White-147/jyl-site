// 部署后核实：从线上实际产物里核对关键改动是否生效
//
// 为什么需要它：`npm run docs:verify` 检查的是**本地构建**；
// 而 GitHub Pages 的部署是异步的（push 后 CI 要跑 1–3 分钟），
// 这期间线上仍是旧产物 —— 只测本地会误判"已经上线了"。
// 这个脚本按"产物里的特征串 / 资源可达性"逐条核对，可反复跑到全部命中为止。
//
// 用法：
//   node scripts/check-deploy.mjs                 # 免费托管站（默认）
//   node scripts/check-deploy.mjs <base-url>      # 自建域名
//   node scripts/check-deploy.mjs <base-url> 40   # 最多轮询次数（默认 20，每轮隔 20s）
//
// 新增检查项：往 CHECKS 里加一条 ——
//   kind: 'text' 在 css/js 产物里找 needle（negate: true = 必须不存在）
//   kind: 'asset' 直接请求该资源，要求 200
const BASE = (process.argv[2] ?? 'https://white-147.github.io/jyl-site/').replace(/\/?$/, '/')
const MAX = Number(process.argv[3] ?? 20)
const SLEEP_MS = 20_000

const CHECKS = [
  { label: '暖 ink（全站标题色）', kind: 'text', where: 'css', needle: '#221f1a' },
  { label: '暖 ink-light（深色正文）', kind: 'text', where: 'css', needle: '#ece7df' },
  { label: '顶栏按钮取 --bar-text（浅 = 正文 ink #221f1a）', kind: 'text', where: 'css', needle: '--bar-text:var(--color-ink)' },
  { label: '顶栏按钮取 --bar-text（深 slate-200）', kind: 'text', where: 'css', needle: '--bar-text:#cdc2b1' },
  { label: '顶栏按钮已改走变量', kind: 'text', where: 'css', needle: 'color:var(--bar-text)' },
  { label: '筛选胶囊仍留在 --chip-text（浅 slate-800）', kind: 'text', where: 'css', needle: '--chip-text:#29251f' },
  { label: '顶栏字形已提到面光之上（z 序修复）', kind: 'text', where: 'css', needle: '.bar-control>:not(.bar-sheen)' },
  { label: '旧冷灰 #333a3d 已清除', kind: 'text', where: 'css', needle: 'color:#333a3d', negate: true },
  { label: '旧的中间值 #3d3830 已清除', kind: 'text', where: 'css', needle: '--chip-text:#3d3830', negate: true },
  { label: '文档区横栏已去掉发光滤镜', kind: 'text', where: 'css', needle: '.docs-subbar{filter:', negate: true },
  { label: '文档区横栏有可读性底（浅）', kind: 'text', where: 'css', needle: '.docs-subbar{text-shadow' },
  { label: '印章深色档已转米白（内外同一条链路）', kind: 'text', where: 'css', needle: '.dark .seal-mark-layer{filter:invert()sepia()brightness(1.9)' },
  { label: '手机端教育卡图标与校名并排', kind: 'text', where: 'css', needle: 'max-sm\\:flex-row' },
  { label: '手机首屏纹样 .hero-cao-mark', kind: 'text', where: 'css', needle: 'hero-cao-mark' },
  { label: '手机页脚印章 .footer-seal-mark', kind: 'text', where: 'css', needle: 'footer-seal-mark' },
  { label: '卷草纹资源可达', kind: 'asset', path: 'assets/cao-mark.webp' },
  { label: '忍冬印章资源可达', kind: 'asset', path: 'assets/seal-rendong.webp' },
]

const bust = () => `?cb=${Date.now()}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

async function probe() {
  const html = await fetchText(BASE + bust())
  const refs = [...html.matchAll(/(?:src|href)="([^"]*assets\/index-[^"]+\.(?:js|css))"/g)].map((m) => m[1])
  const cssRef = refs.find((u) => u.endsWith('.css'))
  const jsRef = refs.find((u) => u.endsWith('.js'))
  const [css, js] = await Promise.all([
    cssRef ? fetchText(new URL(cssRef, BASE).href + bust()) : '',
    jsRef ? fetchText(new URL(jsRef, BASE).href + bust()) : '',
  ])
  return { css, js, cssRef, jsRef }
}

async function runCheck(c, src) {
  if (c.kind === 'asset') {
    try {
      const r = await fetch(new URL(c.path, BASE).href + bust(), { method: 'GET', cache: 'no-store' })
      return r.ok
    } catch { return false }
  }
  const present = src[c.where].includes(c.needle)
  return c.negate ? !present : present
}

for (let round = 1; round <= MAX; round++) {
  let src
  try {
    src = await probe()
  } catch (e) {
    console.log(`[${round}/${MAX}] 取不到：${e.message}`)
    await sleep(SLEEP_MS)
    continue
  }
  const results = []
  for (const c of CHECKS) results.push({ c, pass: await runCheck(c, src) })
  const failed = results.filter((x) => !x.pass)

  console.log(`[${round}/${MAX}] ${src.cssRef ?? '?'} + ${src.jsRef ?? '?'}`)
  for (const x of results) console.log(`   ${x.pass ? 'OK  ' : 'WAIT'} ${x.c.label}`)

  if (failed.length === 0) {
    console.log(`\n全部通过 —— 线上已是本次构建（${BASE}）`)
    process.exit(0)
  }
  if (round < MAX) { console.log(`   ${failed.length} 项未生效，${SLEEP_MS / 1000}s 后重试…\n`); await sleep(SLEEP_MS) }
}

console.error('\n超时仍未全部生效。可能 CI 还在排队/构建，或构建失败 —— 去看仓库的 Actions 页面。')
process.exit(1)
