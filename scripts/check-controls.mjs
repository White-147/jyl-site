// 控件文字对比度检查：顶栏按钮 / 筛选芯片 / 站点名 / 标题 / 正文，在**两档 × PC+手机**下的实测对比度
//
// 为什么需要它：本轮踩过一个真坑 —— 让顶栏按钮在两档取**同一个十六进制值**（slate-800 #29251f），
// 深色档实测只剩 **1.23:1，几乎看不见**（深底上压深墨）。
// 跨主题要统一的是"**语义槽位**"，不是色值；而这个区别只有把两档都量一遍才看得出来。
// 所以任何改 `--chip-text` / 控件色的改动，跑一遍这个脚本再提交。
//
// 用法：node scripts/check-controls.mjs        （读 dist，需先 npm run build）
// 判定：正文级 ≥4.5:1，大字级 ≥3:1；低于阈值会标 ✗ 并以退出码 1 结束。
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(root, 'dist')
const OUT = join(root, '.dsh-chk')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = join(DIST, url)
  if (!existsSync(file) || url.endsWith('/')) file = join(DIST, url, 'index.html')
  if (!existsSync(file)) file = join(DIST, 'index.html')
  try { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)) } catch { res.writeHead(404).end('not found') }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}/`
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const profile = join(process.env.TEMP ?? root, '.dsh-s800')
mkdirSync(profile, { recursive: true })
mkdirSync(OUT, { recursive: true })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
const wsUrl = await new Promise((resolve, reject) => {
  let buf = ''
  const t = setTimeout(() => reject(new Error('Chrome 启动超时')), 20000)
  chrome.stderr.on('data', (d) => { buf += String(d); const m = buf.match(/ws:\/\/[^\s]+/); if (m) { clearTimeout(t); resolve(m[0]) } })
  chrome.on('exit', (c) => reject(new Error(`Chrome 退出 code=${c}`)))
})
const ws = new WebSocket(wsUrl)
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
let msgId = 0
const pending = new Map()
ws.addEventListener('message', (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result) } })
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++msgId; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const call = (m, p) => send(m, p, sessionId)
await call('Page.enable'); await call('Runtime.enable')
const evaluate = async (expression) => {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate 抛错')
  return r.result.value
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PROBE = `
(() => {
  const rgbOf = (s) => { const m = String(s).match(/[\\d.]+/g); return m ? m.slice(0, 3).map(Number) : null }
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const ratio = (a, b) => Math.round(((Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)) * 100) / 100
  // 逐级向上找第一个不透明底
  const bgOf = (el) => {
    let n = el
    while (n && n !== document.documentElement) {
      const m = String(getComputedStyle(n).backgroundColor).match(/[\\d.]+/g)
      if (m && (m.length === 3 || Number(m[3]) > 0.85)) return m.slice(0, 3).map(Number)
      n = n.parentElement
    }
    return rgbOf(getComputedStyle(document.body).backgroundColor) ?? [251, 248, 243]
  }
  const row = (label, el) => {
    if (!el) return { 项: label, 说明: '未找到' }
    const c = getComputedStyle(el)
    const fg = rgbOf(c.color), bg = bgOf(el)
    return { 项: label, 文字: (el.textContent || '(图标)').trim().slice(0, 8), 色: c.color, 实底: 'rgb(' + bg.join(' ') + ')', 对比度: ratio(fg, bg), 字号: parseFloat(c.fontSize), 字重: c.fontWeight }
  }
  return {
    主题: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    chipText: getComputedStyle(document.documentElement).getPropertyValue('--chip-text').trim(),
    表: [
      row('顶栏按钮·文字', (() => { const b = document.querySelector('.bar-control'); return b ? [...b.children].find((x) => x.tagName === 'SPAN' && !x.classList.contains('bar-sheen')) : null })()),
      row('顶栏按钮·图标色', document.querySelector('.bar-control')),
      row('筛选芯片', document.querySelector('.glass-chip')),
      row('顶栏站点名', (() => { const h = document.querySelector('header'); return h ? h.querySelector('span.font-display') : null })()),
      row('章节标题 h2', document.querySelector('h2')),
      row('正文段落', document.querySelector('#about p')),
    ],
  }
})()`

for (const theme of ['light', 'dark']) {
  for (const [w, h, mob, tag] of [[1440, 900, false, 'PC'], [390, 844, true, '手机']]) {
    await call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: mob })
    await call('Page.navigate', { url: BASE })
    for (let i = 0; i < 90; i++) { if (await evaluate(`!!document.querySelector('.bar-control')`)) break; await sleep(130) }
    await evaluate('document.fonts.ready.then(() => true)')
    await evaluate(`(() => { try { localStorage.clear() } catch {}; try { localStorage.setItem('theme', ${JSON.stringify(theme)}) } catch {}; document.documentElement.classList.toggle('dark', ${theme === 'dark'}); return true })()`)
    await sleep(900)
    const r = await evaluate(PROBE)
    console.log(`\n════ ${theme === 'dark' ? '深色' : '浅色'} · ${tag} ════  --chip-text=${r.chipText}`)
    for (const x of r.表) {
      if (x.说明) { console.log(`  ${x.项.padEnd(14)} ${x.说明}`); continue }
      const pass = x.对比度 >= 4.5 ? 'AA✓' : x.对比度 >= 3 ? '仅大字' : '✗'
      console.log(`  ${x.项.padEnd(14)} ${String(x.对比度).padStart(6)} ${pass.padEnd(6)} ${x.色}  底=${x.实底}`)
    }
    if (tag === 'PC') {
      const clip = await evaluate(`(() => { const bs = [...document.querySelectorAll('.bar-control')]; const a = bs[0].getBoundingClientRect(), z = bs[bs.length-1].getBoundingClientRect(); return { x: Math.floor(a.left) - 8, y: Math.floor(a.top) - 8, width: Math.ceil(z.right - a.left) + 16, height: Math.ceil(a.height) + 16 } })()`)
      const { data } = await call('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 3 }, captureBeyondViewport: true })
      writeFileSync(join(OUT, `s800-${theme}.png`), Buffer.from(data, 'base64'))
      console.log(`  → .dsh-chk/s800-${theme}.png`)
    }
  }
}
chrome.kill(); server.close(); process.exit(0)
