// 锚点跳转的端到端断言（真实浏览器 + CDP，零依赖）
//
// 用法：
//   npm run build
//   node scripts/check-anchors.mjs                 # 三档视口跑一遍
//   node scripts/check-anchors.mjs --shots         # 顺带截图到 .dsh-shots/
//   node scripts/check-anchors.mjs --page theory/1-菜单栏
//
// 为什么必须真跑浏览器：这一条**没法靠读代码保证**。文档区的滚动是两套机制
//   · 手机端：页面在滚，落点 = 元素位置 − `--docs-anchor-offset`
//   · ≥768px：页面被 `overflow: clip` 关掉，改成正文列容器在滚
// 而"点完到底停在哪"还受 sticky 顶栏、手机端吸顶目录条、图片懒加载导致的文档高度变化影响。
// 历史故障（本次修的就是它）：手机端落点按 96px 算，而顶栏下面压着一条 53px 的吸顶目录条
// （占 64..117），标题正好被盖住 —— 用户看到的就是"点了目录，跳过去位置还是不对"。
//
// 判定标准：
//   1. 落点误差 ≤ 6px（`--docs-anchor-offset` 或容器 scroll-padding）
//   2. 标题**不被任何吸顶元素遮住**：标题顶 ≥ 吸顶目录条底边
//   3. 跳转后 URL 的 `?s=` 跟着变（可分享）
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(root, 'dist')
const SHOTS = join(root, '.dsh-shots')
const args = process.argv.slice(2)
const argVal = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}
const WANT_SHOTS = args.includes('--shots')
const ONLY_PAGE = argVal('--page', null)

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('[error] 还没有 dist/，先跑 npm run build')
  process.exit(1)
}
if (!CHROME) {
  console.error('[error] 找不到 Chrome / Edge')
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
}

/* ---------- 静态服务（dist，hash 路由所以不需要重写） ---------- */
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = join(DIST, url)
  if (!existsSync(file) || url.endsWith('/')) file = join(DIST, url, 'index.html')
  if (!existsSync(file)) file = join(DIST, 'index.html')
  try {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(readFileSync(file))
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const PORT = server.address().port
const BASE = `http://127.0.0.1:${PORT}/`

/* ---------- 极简 CDP 客户端 ---------- */
const profile = join(root, '.dsh-shots', '.chrome-profile')
mkdirSync(profile, { recursive: true })
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    '--user-data-dir=' + profile,
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
)
const wsUrl = await new Promise((resolve, reject) => {
  let buf = ''
  const t = setTimeout(() => reject(new Error('Chrome 启动超时（没等到 DevTools 端口）')), 20000)
  chrome.stderr.on('data', (d) => {
    buf += String(d)
    const m = buf.match(/ws:\/\/[^\s]+/)
    if (m) {
      clearTimeout(t)
      resolve(m[0])
    }
  })
  chrome.on('exit', (c) => reject(new Error(`Chrome 退出，code=${c}`)))
})

const ws = new WebSocket(wsUrl)
await new Promise((r, j) => {
  ws.addEventListener('open', r, { once: true })
  ws.addEventListener('error', j, { once: true })
})
let msgId = 0
const pending = new Map()
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
})
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const call = (m, p) => send(m, p, sessionId)
await call('Page.enable')
await call('Runtime.enable')

const evaluate = async (expression) => {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate 抛错')
  return r.result.value
}

/** 打开某个 hash 路由并等到正文注入 + 字体就位（字体没就位时版面还会动几像素，量出来不准） */
const go = async (hash) => {
  await call('Page.navigate', { url: BASE + hash })
  for (let i = 0; i < 60; i++) {
    const ok = await evaluate(
      `(() => { const c = document.querySelector('.doc-content'); return !!c && (c.querySelector('h2,h3,p') !== null || c.textContent.includes('失败')) })()`,
    )
    if (ok) break
    await new Promise((r) => setTimeout(r, 120))
  }
  await evaluate('document.fonts.ready.then(() => true)')
  await new Promise((r) => setTimeout(r, 400))
}

/* ---------- 视口 ---------- */
const VIEWPORTS = [
  { name: '手机 390×844', width: 390, height: 844, mobile: true, scale: 3 },
  { name: '平板 1024×768', width: 1024, height: 768, mobile: false, scale: 2 },
  { name: '桌面 1440×900', width: 1440, height: 900, mobile: false, scale: 1 },
]

const manifest = JSON.parse(readFileSync(join(root, 'src', 'data', 'docs.json'), 'utf8'))
/** 挑几页覆盖三种形态：图多的 / 纯文字的 / 论文（含 33 个代码块与 4 张数据表） */
const TEST_PAGES = ONLY_PAGE
  ? manifest.pages.filter((p) => `${p.section}/${p.id}` === ONLY_PAGE)
  : [
      manifest.pages.find((p) => p.chapter === '界面基础操作' && p.order === 1),
      manifest.pages.find((p) => p.chapter === '蓝图编程基础' && p.order === 10),
      // 论文两页：一页正文+代码块，一页数据表（论文源的 chapter 是书名，
      // 章节名在 ancestors 里，所以按 title 选而不是按 chapter）
      manifest.pages.find((p) => p.section === 'thesis' && p.title.includes('用户行为日志获取')),
      manifest.pages.find((p) => p.section === 'thesis' && p.title.includes('数据库设计')),
    ].filter(Boolean)

const problems = []
const report = []
/** 「回到本篇开头」在 xl 以下没有入口而跳过的次数（不是失败，但要在报告里看得见） */
let skippedTop = 0
/** 右栏大纲被"标题太少就不显示"规则藏起来、因而没有入口可点的次数 */
let skippedNoOutline = 0

/** 在页面上执行一次「打开目录 → 点大纲项 → 量落点」 */
const CLICK_ANCHOR = (anchorId) => `
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
  const sel = 'a[href*="?s=' + encodeURIComponent(${JSON.stringify(anchorId)}) + '"]';
  let links = [...document.querySelectorAll(sel)].filter(visible);
  if (!links.length) {
    // 手机端大纲在抽屉里：先点开吸顶条上的入口
    const btn = document.querySelector('[data-docs-stickybar] button');
    if (btn) { btn.click(); await sleep(320); links = [...document.querySelectorAll(sel)].filter(visible); }
  }
  if (!links.length) return { error: '找不到可见的大纲链接' };  links[0].click();
  await sleep(450);
  const el = document.getElementById(${JSON.stringify(anchorId)});
  const sticky = document.querySelector('[data-docs-stickybar]');
  const stickyBottom = sticky && visible(sticky) ? sticky.getBoundingClientRect().bottom : 0;
  const scroller = document.getElementById('docs-scroll');
  const cs = getComputedStyle(document.documentElement);
  const offsetVar = parseFloat(cs.getPropertyValue('--docs-anchor-offset')) || 96;
  const pageScrolls = scroller ? scroller.scrollHeight <= scroller.clientHeight + 1 : true;
  const expected = pageScrolls
    ? offsetVar
    : scroller.getBoundingClientRect().top + (parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0);
  return {
    found: !!el,
    top: el ? el.getBoundingClientRect().top : null,
    expected,
    delta: el ? Math.abs(el.getBoundingClientRect().top - expected) : null,
    stickyBottom,
    covered: el ? el.getBoundingClientRect().top < stickyBottom - 1 : null,
    pageScrolls,
    hash: location.hash,
    windowScrollY: Math.round(window.scrollY),
    scrollerTop: scroller ? Math.round(scroller.scrollTop) : null,
    // 到底了没：落点差一点点、且已经贴底 —— 说明是"页面没有足够的收尾留白"，
    // 不是落点算错。这两个原因的修法完全不同，必须能区分开。
    atBottom: (() => {
      if (!pageScrolls) {
        const s = scroller;
        return s.scrollHeight - s.clientHeight - s.scrollTop < 2;
      }
      const doc = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      return doc - window.innerHeight - window.scrollY < 2;
    })(),
    tailRoom: Math.round(
      pageScrolls
        ? Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight - window.scrollY
        : scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
    ),
  };
})()
`

for (const vp of VIEWPORTS) {
  await call('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.scale,
    mobile: vp.mobile,
  })
  for (const page of TEST_PAGES) {
    const url = `${BASE}#/docs/${page.section}/${encodeURIComponent(page.id)}`
    await call('Page.navigate', { url })
    // 等正文真的注入进来（fetch 是异步的），别用固定 sleep 赌
    for (let i = 0; i < 60; i++) {
      const ok = await evaluate(
        `(() => { const c = document.querySelector('.doc-content'); return !!c && (c.querySelector('h2,h3,p') !== null || c.textContent.includes('失败')) })()`,
      )
      if (ok) break
      await new Promise((r) => setTimeout(r, 120))
    }
    /**
     * ⚠️ 必须等字体就位再开始量。
     *    子集化的中文字体是异步加载的，swap 之后行高会微调几个像素 ——
     *    实测不等它时，第一个视口的最后一项会差 7.1px，而且"已贴底=false、还剩 55px 可滚"，
     *    也就是**不是落点算错，是量完之后版式又动了**。等 `document.fonts.ready` 后偏差回到 0.5px。
     */
    await evaluate(`document.fonts.ready.then(() => true)`)
    await new Promise((r) => setTimeout(r, 400))

    const ids = page.toc.map((t) => t.id)
    /**
     * xl 及以上、且本篇实际标题 ≤2 条时，右栏大纲**故意不渲染**（见 Docs.tsx），
     * 而「当前页小节内联」是 `xl:hidden` —— 这一档确实没有任何可点的大纲入口。
     * 这是设计如此，不是缺陷，所以这些条目跳过而不是判失败。
     */
    const outlineHidden = page.toc.length <= 3 && vp.width >= 1280
    let worst = { delta: -1 }
    let covered = 0
    for (const id of ids) {
      const r = await evaluate(CLICK_ANCHOR(id))
      if (r.error) {
        // 「回到本篇开头」只在 xl 以上的右栏里有入口；xl 以下左栏只列本页小节，页首就在视线里
        if (id === 'doc-top' && vp.width < 1280) {
          skippedTop++
          continue
        }
        if (outlineHidden) {
          skippedNoOutline++
          continue
        }
        problems.push(`[${vp.name}] ${page.title} → #${id}：${r.error}`)
        continue
      }
      if (!r.found) {
        problems.push(`[${vp.name}] ${page.title} → #${id}：页面上找不到该标题元素`)
        continue
      }
      if (r.delta > 6) {
        problems.push(
          `[${vp.name}] ${page.title} → 「${id}」落点差 ${r.delta.toFixed(1)}px（期望 ${r.expected.toFixed(0)}，实际 ${r.top.toFixed(0)}）` +
            `｜已贴底=${r.atBottom} 剩余可滚=${r.tailRoom}px`,
        )
      }
      if (r.covered) {
        covered++
        problems.push(`[${vp.name}] ${page.title} → 「${id}」被吸顶条盖住（标题顶 ${r.top.toFixed(0)} < 吸顶条底 ${r.stickyBottom.toFixed(0)}）`)
      }
      if (!r.hash.includes('s=' + encodeURIComponent(id)) && !r.hash.includes('s=' + id)) {
        problems.push(`[${vp.name}] ${page.title} → 「${id}」地址栏没有写回 ?s=`)
      }
      if (r.delta > worst.delta) worst = { delta: r.delta, id, ...r }
    }
    report.push(
      `${vp.name}  ${page.chapter} › ${page.title}  ${ids.length} 项  最大偏差 ${worst.delta.toFixed(1)}px  被遮挡 ${covered} 项`,
    )

    if (WANT_SHOTS) {
      mkdirSync(SHOTS, { recursive: true })
      const shot = await call('Page.captureScreenshot', { format: 'png' })
      const { writeFileSync } = await import('node:fs')
      writeFileSync(join(SHOTS, `${vp.width}-${page.section}-${page.id}.png`), Buffer.from(shot.data, 'base64'))
    }
  }
}

/* ---------- 导航冒烟：分区入口 / 目录点页 / 分区切换 ---------- */
await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
const smoke = []
{
  const firstSection = manifest.sections[0]
  const firstPage = manifest.pages.find((p) => p.section === firstSection.id && p.status === 'ready')
  /** expect 可以是字符串（严格相等）或断言函数（返回 true/false）。
   *  顺带把**实测值**打出来：断言只给 ✓/✗ 时，调参（比如玻璃预算）没有依据。 */
  const check = async (label, expr, expect) => {
    const got = await evaluate(expr)
    const ok = typeof expect === 'function' ? !!expect(got) : got === expect
    smoke.push({ label, ok, got, expect: typeof expect === 'function' ? '(断言)' : expect })
    if (typeof got === 'string' && got.length <= 90) console.log(`      ↳ ${got}`)
  }

  // 1) 分区入口 `#/docs`（不带分区）应落到第一个分区，并渲染出正文
  await call('Page.navigate', { url: `${BASE}#/docs` })
  await new Promise((r) => setTimeout(r, 1000))
  await check(
    '#/docs 落到第一个分区且渲染出正文',
    `(() => {
       const h = document.querySelector('h1');
       const c = document.querySelector('.doc-content');
       return (h ? h.textContent.trim() : '(无 h1)') + ' | ' + (!!c && c.textContent.trim().length > 50);
     })()`,
    `${firstPage.title} | true`,
  )

  // 2) 目录里点一个页应换页（标题跟着变）——**必须在切到空分区之前做**，
  //    实战分区里全是「待导入」占位（不是 <a>），那时目录里一个可点的页都没有
  await check(
    '目录点页能换页',
    `(async () => {
       const a = [...document.querySelectorAll('aside a[href^="#/docs/"]')].find(x => !x.hasAttribute('aria-current'));
       if (!a) return 'no-link';
       const before = location.hash;
       a.click();
       await new Promise(r => setTimeout(r, 1000));
       return location.hash !== before && !!document.querySelector('.doc-content') ? 'navigated' : 'stuck';
     })()`,
    'navigated',
  )

  // 3) 分区切换：点「UE 实战」（原文只有标题、尚无正文）应显示空态而不是白屏
  await check(
    '切到 UE 实战显示空态',
    `(async () => {
       const btn = [...document.querySelectorAll('[role="tab"]')].find(b => b.textContent.includes('UE 实战'));
       if (!btn) return 'no-tab';
       btn.click();
       await new Promise(r => setTimeout(r, 700));
       return document.body.textContent.includes('还没有可以阅读的内容') ? 'empty-state' : 'no-empty-state';
     })()`,
    'empty-state',
  )

  // 4) 论文 → 项目：论文页头必须有「配套项目」入口，落点要**到具体那一行**（不是只到项目区）
  await call('Page.navigate', { url: `${BASE}#/docs/thesis` })
  await new Promise((r) => setTimeout(r, 1200))
  await check(
    '论文页头「配套项目」直接落到 BookRecommendation 那一行',
    `(async () => {
       const a = [...document.querySelectorAll('main header a')].find(x => x.textContent.includes('配套项目'));
       if (!a) return 'no-link';
       const href = a.getAttribute('href');
       a.click();
       await new Promise(r => setTimeout(r, 2400));
       const row = document.getElementById('project-book-recommendation');
       if (!row) return 'href=' + href + ' no-row';
       const top = Math.round(row.getBoundingClientRect().top);
       return 'href=' + href + ' top=' + top;
     })()`,
    (v) => {
      const m = /href=(\S+) top=(-?\d+)/.exec(v)
      if (!m) return false
      const top = Number(m[2])
      // 既要是正确的锚点，也要真的落在那一行的可视范围内
      return m[1] === '#project-book-recommendation' && top > -40 && top < 220
    },
  )

  // 6) 玻璃预算（DESIGN.md 的 Blur-Budget Rule）
  // ⚠️ 数的是**元素个数**，不是"元素种类" —— 早期版本按 className 去重，于是 8 个
  //    `.glass-panel` 只算 1 个，口径偏松、守不住规则。现在按真实 DOM 元素计数。
  await check(
    '全站 backdrop-filter 元素数在预算内（≤26）',
    `(async () => {
       let max = 0, worst = '';
       for (const hash of ['#top', '#projects', '#skills', '#experience', '#education', '#contact', '#about']) {
         location.hash = hash;
         await new Promise(r => setTimeout(r, 800));
         const hit = [];
         for (const el of document.querySelectorAll('*')) {
           const cs = getComputedStyle(el);
           const bf = cs.backdropFilter || cs.webkitBackdropFilter;
           if (!bf || bf === 'none') continue;
           const r = el.getBoundingClientRect();
           if (r.width < 8 || r.height < 8) continue;
           hit.push(el.tagName.toLowerCase() + (bf.includes('url') ? '(折射)' : '(模糊)'));
         }
         if (hit.length > max) { max = hit.length; worst = hash + '：' + hit.length + ' 个' }
       }
       return max + ' 个（峰值出现在 ' + worst + '）';
     })()`,
    (v) => Number.parseInt(v, 10) <= 26,
  )

  // 7) 项目 → 论文：book-recommendation 卡片必须有「毕业设计原文」入口
  await check(
    '项目卡片有「毕业设计原文」入口且指向 #/docs/thesis',
    `(async () => {
       location.hash = '#projects';
       await new Promise(r => setTimeout(r, 1200));
       const a = [...document.querySelectorAll('a')].find(x => x.textContent.includes('毕业设计原文'));
       return a ? a.getAttribute('href') : 'no-link';
     })()`,
    '#/docs/thesis',
  )
}

/* ---------- 跨文档互链：逐条点，断言真的换页 ----------
 *
 * 为什么单独列一条：正文里的文档互链是 `#/docs/<分区>/<页>` 这种**路由链接**，
 * 而内容区的点击委托是按 `a[href^="#"]` 抓的 —— 两者只差一个斜杠，
 * 一旦被当成页内锚点吃掉，表现是「既不换页也不报错，只是原地滚了一下」：
 * 构建成功、控制台干净、链接看着也在。实测这个 bug 让全站 9 条互链**全部失效**了很久。
 */
const linkProblems = []
{
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const withLinks = []
  for (const p of manifest.pages) {
    if (p.status !== 'ready' || !p.html) continue
    // manifest 的 html 是相对 `public/docs/` 的路径（前端 fetch 时补 `docs/`）
    const html = readFileSync(join(root, 'public', 'docs', p.html), 'utf8')
    const n = [...html.matchAll(/href="#\/docs\//g)].length
    if (n) withLinks.push({ page: p, count: n })
  }

  let clicked = 0
  for (const { page, count } of withLinks) {
    for (let i = 0; i < count; i++) {
      await go(`#/docs/${page.section}/${encodeURIComponent(page.id)}`)
      const r = await evaluate(`(async () => {
        const c = document.querySelector('.doc-content');
        const a = [...c.querySelectorAll('a[href^="#/docs/"]')][${i}];
        if (!a) return { error: 'no-link' };
        const before = { hash: location.hash, h1: document.querySelector('h1')?.textContent.trim() ?? '' };
        a.click();
        await new Promise(r => setTimeout(r, 1000));
        const after = { hash: location.hash, h1: document.querySelector('h1')?.textContent.trim() ?? '' };
        return { label: a.textContent.trim(), before, after, rendered: !!document.querySelector('.doc-content h2, .doc-content h3, .doc-content p') };
      })()`)
      if (r.error) {
        linkProblems.push(`[${page.title}] 第 ${i + 1} 条互链：${r.error}`)
        continue
      }
      clicked++
      const changed = r.after.hash !== r.before.hash && r.after.h1 !== r.before.h1
      if (!changed) {
        linkProblems.push(
          `[${page.title}] 点「${r.label}」没有换页（h1 仍是「${r.after.h1}」，hash=${r.after.hash.slice(0, 60)}）`,
        )
      } else if (!r.rendered) {
        linkProblems.push(`[${page.title}] 点「${r.label}」换页了但正文没渲染出来`)
      }
    }
  }
  for (const p of linkProblems) problems.push(`跨文档互链失效：${p}`)
  console.log('')
  console.log(`跨文档互链断言：${withLinks.reduce((a, x) => a + x.count, 0)} 条，点了 ${clicked} 条，${linkProblems.length ? `✗ ${linkProblems.length} 条失效` : '✓ 全部真的换了页'}`)
}

/* ---------- 文档区横栏不被顶栏吞 ----------
 *
 * 用户反馈（iPad 横屏 Safari）：「进毕业论文 → 跳 book → 再跳回毕业区，
 * 顶部『返回作品集』那一栏被顶栏吞掉，点不到」。
 *
 * 几何上本来是对的（横栏在顶栏占位之下、内容列之上），会出这一条只有一种可能：
 * **文档区的窗口被滚下去了**。`html.docs-shell { overflow: clip }` 是"页面不滚"的唯一保证，
 * 而 `clip` 是 Safari 16.4 才支持的取值，更早的 iOS 会整条丢弃；地址栏收放、橡皮筋回弹
 * 也会留下残留滚动量。窗口一滚，横栏（当时还不吸顶）就滑到 `position: fixed` 的顶栏底下。
 *
 * 现在三道防线：`overflow: clip` + `hidden` 回退（index.css）、横栏自己 sticky（Docs.tsx）、
 * 窗口滚动守卫（TopBar.tsx）。这一条断言**直接复现那个故障动作**（把窗口强行滚下去）并验证：
 *   1. 横栏与「返回作品集」始终在顶栏底边之下（几何）；
 *   2. 该位置 `elementFromPoint` 命中它自己（真的点得到，不是被别的层盖住）；
 *   3. 强行滚动之后窗口被压回 0（守卫真的在跑）；
 *   4. 切分区来回之后仍然成立（用户报的正是这个来回路径）。
 */
const subbarProblems = []
{
  for (const vp of VIEWPORTS.filter((v) => v.width >= 768)) {
    await call('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.scale,
      mobile: vp.mobile,
    })
    for (const hash of ['#/docs/thesis', '#/docs/theory', '#/docs/thesis']) {
      await go(hash)
      // 故意把窗口滚下去：正常实现下这里应该被压回 0
      await evaluate(`(() => { window.scrollTo(0, 220); return true })()`)
      await new Promise((r) => setTimeout(r, 250))
      const r = await evaluate(`(() => {
        const bar = document.querySelector('header.site-bar');
        const barBottom = bar ? bar.getBoundingClientRect().bottom : 0;
        const back = [...document.querySelectorAll('a')]
          .filter((a) => a.textContent.trim() === '返回作品集')
          .find((a) => a.getBoundingClientRect().width > 0);
        if (!back) return { error: '找不到可见的「返回作品集」' };
        const bb = back.getBoundingClientRect();
        const hit = document.elementFromPoint(Math.round(bb.left + 30), Math.round(bb.top + bb.height / 2));
        return {
          winY: Math.round(window.scrollY),
          barBottom: Math.round(barBottom),
          backTop: Math.round(bb.top),
          backBottom: Math.round(bb.bottom),
          hitSelf: hit === back || back.contains(hit),
          hitWhat: hit ? hit.tagName + '.' + String(hit.className || '').slice(0, 40) : null,
          sticky: (() => {
            const el = document.querySelector('.docs-subbar');
            return el ? getComputedStyle(el).position : null;
          })(),
        };
      })()`)
      const tag = `[${vp.name}] ${hash}`
      if (r.error) {
        subbarProblems.push(`${tag}：${r.error}`)
        continue
      }
      if (r.winY !== 0) {
        subbarProblems.push(`${tag}：窗口滚动守卫失效，window.scrollY=${r.winY}（应为 0）`)
      }
      if (r.backTop < r.barBottom - 0.5) {
        subbarProblems.push(
          `${tag}：横栏被顶栏吞掉（返回作品集 top=${r.backTop} < 顶栏底边 ${r.barBottom}）`,
        )
      }
      if (!r.hitSelf) {
        subbarProblems.push(`${tag}：返回作品集点不到，该位置命中的是 ${r.hitWhat}`)
      }
      if (r.sticky !== 'sticky') {
        subbarProblems.push(`${tag}：.docs-subbar 的 position 是 ${r.sticky}（应为 sticky，这是防吞的那道防线）`)
      }
    }
    console.log(`  · ${vp.name}：横栏贴顶 / 可点 / 窗口守卫 三项均已验`)
  }
  for (const p of subbarProblems) problems.push(`横栏被吞：${p}`)
  console.log('')
  console.log(
    `文档区横栏断言：${subbarProblems.length ? `✗ ${subbarProblems.length} 处` : '✓ 强行滚动窗口也不会被顶栏吞掉，且始终可点'}`,
  )

  /* ---------- 横栏材质与全局顶栏不漂移 ----------
   *
   * 用户 2026-09 第九轮：「把文档区的单独顶栏也和全局顶栏样式进行对齐」。
   * 做法是**复制同一组数值**（不是抽共用类 —— 两者定位/层叠差异太大，见 index.css 的注释），
   * 所以必须有一条断言盯着：`.docs-subbar` 与 `.site-bar` 的 `background-image` 与 `box-shadow`
   * 逐项相同（`background-color` 例外：横栏是 sticky，要多一层 72% 的底挡住下方正文）。
   * 漂移了会红，不要靠肉眼。 */
  const materialProblems = []
  {
    const text = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
    /* ⚠️ 数值要**量化**再比：顶栏的 box-shadow 有 320ms 过渡，读到的常是 `0.847` 这种
       还差最后一丝的插值（结束值是 `0.85`），逐字符比会报假失败。
       量化到 2 位小数即可 —— 真出现材质漂移时，差的一定是整档（0.85 vs 0.07 那种量级）。 */
    const q = (s) => text(s).replace(/\d+\.\d+/g, (m) => Number(m).toFixed(2))
    for (const theme of ['light', 'dark']) {
      await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
      await go(`#/docs/theory?s=${encodeURIComponent('版本说明')}`)
      const r = await evaluate(`(async () => {
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        /* ⚠️ 这一条踩过两个坑，都记下来：
           ① class 刚改完就 getComputedStyle，拿到的还是**上一套主题**的值
              （现象：浅色跑量出深色数值、深色跑出浅色数值）。所以要等两帧让样式重算落定。
           ② 顶栏有 .is-scrolled 状态（滚过一屏换成更重的内高光/投影），而横栏没有这个状态 ——
              比对的是**静置档**，所以先把滚动归零让那个状态自然退掉。
              ⚠️ 但归零之后顶栏还在跑 box-shadow 的 transition（320ms），
              中途量到的是插值（实测量到 rgba(255,255,255,0.518) 这种半路值）——
              所以还要**轮询到数值不再变化**再读。 */
        const sc = document.getElementById('docs-scroll');
        if (sc) sc.scrollTop = 0;
        window.scrollTo(0, 0);
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const barEl = document.querySelector('header.site-bar');
        const subEl = document.querySelector('.docs-subbar');
        const read = () => {
          const b = getComputedStyle(barEl);
          const s = getComputedStyle(subEl);
          return { barImg: b.backgroundImage, subImg: s.backgroundImage, barShadow: b.boxShadow, subShadow: s.boxShadow };
        };
        let prev = read();
        for (let i = 0; i < 40; i++) {
          await new Promise((res) => requestAnimationFrame(res));
          const now = read();
          if (now.barShadow === prev.barShadow && now.subShadow === prev.subShadow) break;
          prev = now;
        }
        const lens = document.querySelector('.docs-subbar-lens');
        return {
          ...prev,
          lensFilter: lens ? getComputedStyle(lens).backdropFilter : null,
          subBg: getComputedStyle(subEl).backgroundColor,
          htmlDark: document.documentElement.classList.contains('dark'),
          barClass: barEl.className,
        };
      })()`)
      const tag = `[${theme}]`
      if (q(r.barImg) !== q(r.subImg)) {
        materialProblems.push(`${tag} 横栏的渐变底与顶栏不一致\n      顶栏 ${q(r.barImg)}\n      横栏 ${q(r.subImg)}`)
      }
      if (q(r.barShadow) !== q(r.subShadow)) {
        const a = q(r.barShadow).split(/,(?![^(]*\))/).map((x) => x.trim())
        const b = q(r.subShadow).split(/,(?![^(]*\))/).map((x) => x.trim())
        const diff = []
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          if ((a[i] ?? '') !== (b[i] ?? '')) diff.push(`第 ${i + 1} 条：顶栏 ${a[i] ?? '（无）'} ／ 横栏 ${b[i] ?? '（无）'}`)
        }
        materialProblems.push(`${tag} 横栏的内高光/投影与顶栏不一致（${diff.length} 条不同）\n      ${diff.join('\n      ')}`)
      }
      if (!String(r.lensFilter ?? '').includes('lg-refract')) {
        materialProblems.push(`${tag} 横栏折射层没生效（backdrop-filter = ${r.lensFilter}）`)
      }
      if (q(r.subBg) !== 'rgba(0, 0, 0, 0)') {
        materialProblems.push(
          `${tag} 横栏的底不是全透明（background-color = ${r.subBg}）—— 第十轮起它与顶栏同源，` +
            `正文要从它下面穿过，任何实底都会把折射盖掉`,
        )
      }
    }
    for (const p of materialProblems) problems.push(`横栏材质：${p}`)
    console.log('')
    console.log(
      `横栏材质断言：${materialProblems.length ? `✗ ${materialProblems.length} 处` : '✓ 与全局顶栏的渐变底 / 内高光 / 折射层逐项一致（深浅色各验一遍）'}`,
    )
  }
}

/* ---------- 侧栏底部不被切 ----------
 *
 * 用户反馈过「左侧栏最底部文本显示不全」。根因是硬编码高度与 sticky 偏移对不上：
 * 左栏 `sticky top-16`（顶边在滚动容器顶下方 64px）+ `max-h-[calc(100dvh-4rem)]`（836px）
 * → 底边 = 64+64+836 = 964 > 视口 900，**最后 64px 永远在视口外**，滚到底也看不到。
 * 这一条只能靠真浏览器量，所以固化成断言。
 */
const railProblems = []
{
  for (const vp of VIEWPORTS.filter((v) => v.width >= 768)) {
    await call('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.scale,
      mobile: vp.mobile,
    })
    await go('#/docs/theory')
    const n = await evaluate(`[...document.querySelectorAll('aside')].filter(a => a.getBoundingClientRect().width > 0).length`)
    for (let i = 0; i < n; i++) {
      const r = await evaluate(`(async () => {
        const asides = [...document.querySelectorAll('aside')].filter(a => a.getBoundingClientRect().width > 0);
        const a = asides[${i}];
        const sc = a.querySelector('.docs-scroll') || a;
        sc.scrollTop = sc.scrollHeight;
        await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        const ar = a.getBoundingClientRect();
        const last = sc.lastElementChild;
        const lr = last ? last.getBoundingClientRect() : null;
        return {
          asideBottom: Math.round(ar.bottom), viewportH: innerHeight,
          maxScroll: Math.round(sc.scrollHeight - sc.clientHeight), at: Math.round(sc.scrollTop),
          lastBottom: lr ? Math.round(lr.bottom) : null,
          name: (a.textContent || '').trim().slice(0, 16),
        };
      })()`)
      const tag = `[${vp.name}] 第 ${i + 1} 个侧栏（${r.name}…）`
      if (r.asideBottom > r.viewportH + 1) {
        railProblems.push(`${tag} 底边 ${r.asideBottom} 超出视口 ${r.viewportH} —— 底部内容会被切掉`)
      }
      if (r.maxScroll > 0 && r.at < r.maxScroll - 1) {
        railProblems.push(`${tag} 滚不到底（${r.at}/${r.maxScroll}）`)
      }
      if (r.lastBottom !== null && r.lastBottom > r.viewportH + 1) {
        railProblems.push(`${tag} 滚到底后最后一项仍在视口外（bottom=${r.lastBottom} > ${r.viewportH}）`)
      }
    }
  }
  for (const p of railProblems) problems.push(`侧栏裁切：${p}`)
  console.log('')
  console.log(`侧栏底部断言：${railProblems.length ? `✗ ${railProblems.length} 处` : '✓ 滚到底后最后一项完整可见，侧栏不超出视口'}`)
}

/* ---------- 左栏折叠/展开 ----------
 * 折叠是纯前端状态（localStorage），构建与产物自检都碰不到它，只能在这里验。
 * 顺带验最重要的一条业务规则：**当前页所在的祖先分组不能被收起** ——
 * 否则刷新后左栏会被自己上次收起的分组挡住，出现"跳过去了但找不到自己在哪"。
 */
/* ---------- 左栏折叠/展开 ----------
 * 折叠是纯前端状态（localStorage），构建与产物自检都碰不到它，只能在这里验。
 * 2026-09 修过一次真 bug：渲染期加了"当前页所在分组强制展开"的守卫，
 * 后果是**当前页所在的那个源点了没反应**（15 个按钮里 1 个是死的，用户直接反馈）。
 * 现在守卫挪到了 effect 里（切页时自动展开），所以：**点击必须一律生效**，
 * 并且**跳进被收起的分组时它必须自动展开**。
 */
const collapseProblems = []
{
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const deep = manifest.pages.find((p) => p.source === 'blueprint-program-base' && p.ancestors.length > 0 && p.status === 'ready')

  // 甲：每一个折叠按钮都必须真的能收起再展开（含当前页所在的那个）
  for (const hash of ['#/docs/theory', `#/docs/${deep.section}/${encodeURIComponent(deep.id)}`]) {
    await go(hash)
    const r = await evaluate(`(async () => {
      const rail = [...document.querySelectorAll('aside')].find(a => a.getBoundingClientRect().width > 0);
      const sc = rail.querySelector('.docs-scroll') || rail;
      const count = () => sc.querySelectorAll('a[href^="#/docs/"]').length;
      const btns = [...sc.querySelectorAll('button[aria-expanded]')];
      const dead = [];
      let firstPair = null;
      for (let i = 0; i < btns.length; i++) {
        const b = [...sc.querySelectorAll('button[aria-expanded]')][i];
        const label = b.getAttribute('aria-label');
        const before = b.getAttribute('aria-expanded');
        const n0 = count();
        b.click();
        await new Promise(r => setTimeout(r, 90));
        const b2 = [...sc.querySelectorAll('button[aria-expanded]')][i];
        const after = b2.getAttribute('aria-expanded');
        const n1 = count();
        if (before === after) { dead.push(label); continue }
        if (!firstPair) firstPair = { label, n0, n1, after };
        b2.click();
        await new Promise(r => setTimeout(r, 90));
      }
      return { total: btns.length, dead, firstPair };
    })()`)
    if (r.dead.length) collapseProblems.push(`${hash} 下 ${r.dead.length}/${r.total} 个按钮点了没反应：${r.dead.slice(0, 3).join('、')}`)
    else console.log(`  · ${hash}：${r.total} 个按钮全部可收起可展开`)
  }

  // 乙：收起某个源之后跳进它，必须自动展开（否则"跳过去了却找不到自己在哪"）
  const deepHref = `#/docs/${deep.section}/${encodeURIComponent(deep.id)}`
  await go('#/docs/theory')
  const guard = await evaluate(`(async () => {
    const rail = [...document.querySelectorAll('aside')].find(a => a.getBoundingClientRect().width > 0);
    const sc = rail.querySelector('.docs-scroll') || rail;
    const targetHref = ${JSON.stringify(deepHref)};
    if (!sc.querySelector('a[href="' + targetHref + '"]')) return { error: '收起前就找不到目标页链接：' + targetHref };
    // 收起目标页所在的那个源
    const srcBtn = [...sc.querySelectorAll('button[aria-expanded]')].find(b => (b.getAttribute('aria-label')||'').includes('蓝图编程基础'));
    if (!srcBtn) return { error: '找不到「蓝图编程基础」的折叠按钮' };
    srcBtn.click();
    await new Promise(r => setTimeout(r, 250));
    const hiddenAfterCollapse = !sc.querySelector('a[href="' + targetHref + '"]');
    location.hash = targetHref;
    await new Promise(r => setTimeout(r, 1000));
    const rail2 = [...document.querySelectorAll('aside')].find(a => a.getBoundingClientRect().width > 0);
    const sc2 = rail2.querySelector('.docs-scroll') || rail2;
    const cur = sc2.querySelector('a[aria-current="page"]');
    return { hiddenAfterCollapse, currentVisible: !!cur, currentLabel: cur ? cur.textContent.trim() : null };
  })()`)
  if (guard.error) collapseProblems.push(guard.error)
  else {
    if (!guard.hiddenAfterCollapse) collapseProblems.push('收起源之后它下面的页仍可见 —— 折叠没生效')
    if (!guard.currentVisible) collapseProblems.push('跳进被收起的源之后，当前页在左栏仍不可见 —— 自动展开失效')
    else console.log(`  · 收起源 → 跳进去 → 自动展开并在左栏可见（${guard.currentLabel}）`)
  }

  for (const p of collapseProblems) problems.push(`左栏折叠：${p}`)
  console.log('')
  console.log(`左栏折叠断言：${collapseProblems.length ? `✗ ${collapseProblems.join('；')}` : '✓ 每个按钮都生效，跳转自动展开'}`)
}

/* ---------- 汇总 ---------- */
console.log('')
console.log('锚点跳转断言（真实浏览器）')
for (const r of report) console.log('  ' + r)
if (skippedTop) console.log(`  （xl 以下跳过「回到本篇开头」共 ${skippedTop} 次：那一档左栏只列本页小节，页首就在视线里）`)
if (skippedNoOutline) console.log(`  （跳过 ${skippedNoOutline} 次：该页实际标题 ≤2 条，xl 上右栏大纲按设计不显示）`)
console.log('')
console.log('导航冒烟')
for (const s of smoke) console.log(`  ${s.ok ? '✓' : '✗'} ${s.label}${s.ok ? '' : `（得到 ${JSON.stringify(s.got)}，期望 ${JSON.stringify(s.expect)}）`}`)
for (const s of smoke) if (!s.ok) problems.push(`导航冒烟失败：${s.label}（得到 ${JSON.stringify(s.got)}）`)
if (problems.length) {
  console.log(`\n  ✗ ${problems.length} 处问题：`)
  for (const p of problems.slice(0, 40)) console.log('    · ' + p)
} else {
  console.log('\n  ✓ 全部通过（落点误差 ≤6px，无标题被吸顶条遮挡，?s= 已写回）')
}

ws.close()
chrome.kill()
server.close()
process.exit(problems.length ? 1 : 0)
