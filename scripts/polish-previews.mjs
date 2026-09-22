// 预览页演示美化注入 v9（按项目风格配色 + 内容区内横条）：
//   - 每个预览项目配置专属配色（适配其品牌/主题，而非统一色）
//   - 错误提示元素出现 → 就地替换为同色说明横条
//   - 无错误提示时 → 在主内容区顶部插入同色横条
//   - 幂等：重跑即覆盖；各项目重新构建复制进 preview 后重跑本脚本即可。
// 用法：node scripts/polish-previews.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const previewDir = join(root, 'public', 'preview')

// 各项目配色（浅/深两态，边框/文字/背景）：适配品牌风格与各自深浅色切换机制
//   MiLuStudio: html[data-theme="dark"] ｜ XiaoLouAI: html.dark ｜ console: html.dark-mode
const THEMES = {
  'sylab-ai': {
    light: { border: 'rgba(59,130,246,.5)', color: '#3b82f6', bg: 'rgba(59,130,246,.07)' },
    dark: { border: 'rgba(96,165,250,.5)', color: '#60a5fa', bg: 'rgba(96,165,250,.08)' },
  },
  'xiao-lou-ai': {
    light: { border: 'rgba(217,119,6,.5)', color: '#d97706', bg: 'rgba(217,119,6,.08)' },
    dark: { border: 'rgba(251,191,36,.45)', color: '#fbbf24', bg: 'rgba(251,191,36,.08)' },
  },
  'milu-assistant-web': {
    light: { border: 'rgba(147,51,234,.45)', color: '#9333ea', bg: 'rgba(147,51,234,.07)' },
    dark: { border: 'rgba(192,132,252,.4)', color: '#c084fc', bg: 'rgba(192,132,252,.08)' },
  },
  'milu-studio': {
    light: { border: 'rgba(71,85,105,.45)', color: '#475569', bg: 'rgba(100,116,139,.07)' },
    dark: { border: 'rgba(148,163,184,.5)', color: '#cbd5e1', bg: 'rgba(148,163,184,.08)' },
  },
  'book-recommendation': {
    light: { border: 'rgba(64,158,255,.5)', color: '#409eff', bg: 'rgba(64,158,255,.08)' },
    dark: { border: 'rgba(96,165,250,.5)', color: '#60a5fa', bg: 'rgba(96,165,250,.08)' },
  },
}

// 主内容区候选（可见且非弹层；优先内容容器，避开侧栏/导航/外层壳）：
//   1) 工作台主区 2) 应用内容区 3) 页面内容区 4) 布局内容 5) 其它 main/section（跳过 app-shell 类外壳）
const HOST_CANDIDATES = [
  '.workspace-main',
  '.app-content',
  '.page-content',
  '.ant-layout-content',
  '.workspace-project-main',
  '.workspace',
  'main',
  'section',
]

// iframe 防护（反爬 L4）：预览页与主站同源，默认允许被任意站点 <frame>/<iframe> 嵌套，
// 等于把自己的静态资源变成别人的免费门面。这里做客户端纵深防御：
//   1) frame-ancestors CSP（对现代浏览器生效；GitHub Pages 无法下发 HTTP 头，只能靠 meta）
//   2) frame-busting 脚本兜底（老浏览器 / CSP 被忽略时）
// 主站本体的 5 个预览页相互之间不使用 iframe（均为直达链接），所以不会误伤。
//
// 注意：本块包含**两个**元素，所以清理时 meta 与 script 要分别擦除。
// 只擦 script 会导致重复运行时 meta 不断累积（实测跑到第 2 轮就出现两份 CSP）。
const FRAME_GUARD_META =
  `<meta id="frame-guard-csp" http-equiv="Content-Security-Policy" content="frame-ancestors 'self'">`
const FRAME_GUARD = `<script id="frame-guard">
(function () {
  try {
    if (window.self === window.top) return;
    var top;
    try { top = window.top.location.href } catch (e) { top = null }
    // 同源嵌入（本站自己的页面）放行
    if (top && top.indexOf(window.location.origin) === 0) return;
    try { window.top.location.replace(window.self.location.href) } catch (e) {}
    document.documentElement.innerHTML =
      '<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;' +
      'font:500 15px/1.8 system-ui,-apple-system,PingFang SC,Microsoft YaHei,sans-serif;color:#536c70;' +
      'background:#f6faf9;text-align:center;padding:2rem">' +
      '<div><strong style="display:block;font-size:17px;color:#0f2e36;margin-bottom:.5rem">' +
      '此页面不允许被嵌入</strong>' +
      '请访问原始地址：<a href="' + window.location.href + '" style="color:#0f574f">' +
      window.location.href + '</a></div></body>';
  } catch (e) {}
})();
</script>`

let done = 0

/** 预览页入口预热（2026-09 新增）：把入口 chunk 与样式表提前到 HTML 解析阶段请求。
 *
 *  为什么需要：预览页是各项目**自己的**构建产物（Vite/Rspack），主站这边唯一能改的就是这个注入脚本。
 *  这些产物里运行时懒加载的 chunk 有几十个（如 xiao-lou-ai 约 65 个），而预览页又和主站同源，
 *  全部走 GitHub Pages。跨境/弱网下每个请求都要多付一次往返，入口 chunk 迟到 = 白屏时间被拉长。
 *  给入口加 `rel="modulepreload"` / `rel="preload" as="style"` 能把这两次请求挪到解析 HTML 时发起，
 *  不改动产物本身、不改行为，失败也没有副作用（浏览器只是忽略掉未使用的预载）。
 *
 *  ⚠️ 幂等：注入前先擦掉上一轮插入的预热标签（带 data-preload-injected 标记），
 *     否则重跑一次就多一组，而本文件是「重跑即覆盖」的设计。
 *  ⚠️ 只预热**入口 chunk 与样式**：不要顺手把懒加载的业务 chunk 也塞进来，
 *     那会把「按需」变成「首屏全下载」，反而更慢。 */
function previewPreloadLinks(html) {
  const links = []
  // 样式：Vite 产出 <link rel="stylesheet" href="...">（file:// 与 http 都可能）
  const cssFiles = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)]
    .map((m) => (m[0].match(/href=["']([^"']+)["']/) || [])[1])
    .filter(Boolean)
  for (const href of cssFiles.slice(0, 2)) {
    links.push(`<link rel="preload" as="style" href="${href}" data-preload-injected>`)
  }
  // 入口脚本：老版 Vite 用 modulepreload 已经声明过，跳过；否则取第一个 type="module" 的 src
  const hasModulePreload = /<link[^>]+rel=["']modulepreload["']/.test(html)
  if (!hasModulePreload) {
    const moduleScript = [...html.matchAll(/<script[^>]*>/g)]
      .map((m) => m[0])
      .find((tag) => /type=["']module["']/.test(tag))
    const entry = moduleScript && (moduleScript.match(/src=["']([^"']+)["']/) || [])[1]
    if (entry) links.push(`<link rel="modulepreload" href="${entry}" data-preload-injected>`)
  }
  return links
}

for (const name of Object.keys(THEMES)) {
  const file = join(previewDir, name, 'index.html')
  if (!existsSync(file)) {
    console.log(`skip: ${name} (no index.html)`)
    continue
  }
  const t = THEMES[name]
  const replaceOnly = name === 'xiao-lou-ai' ? 'true' : 'false' // XiaoLouAI：错误元素容器窄，仅隐藏、顶部统一全宽条
  // MiLuConsole：Chat 页 header 高 64px（含新建会话/模型选择按钮），横条需下移让位，否则遮挡交互
  const chatHeaderOffset = name === 'milu-assistant-web' ? 'true' : 'false'
  // 流式页面（普通文档流、可滚动）：横条改为占流插入（不浮层），内容自然下移不被遮挡。
  // 绝对定位浮层只适合固定视口布局（chat/工作台），流式页会盖住内容（如 Book 首页系统公告卡）。
  // 注意：这里必须是**布尔值**，不能是字符串 'true'/'false' —— 字符串 'false' 是真值，
  // 会让下面 `flowMode ? ... : ...` 判断反向（本文件历史上踩过一次）。
  const flowMode = name === 'book-recommendation'
  // 固定视口页面（不可滚动）：横条若只是浮层，会压住应用自己的内容区。
  // 实测 milu-studio 1440×900：横条 66–131，而应用线程壳 54–900 —— 顶部 65px 被盖住。
  // 这类页面按「为横条预留空间」处理（RESERVE_MODE），而不是让它浮在上面。
  const reserveSpace = !flowMode
  const noteCss = (c) =>
    `border:1px dashed ${c.border};border-radius:10px;color:${c.color};background:${c.bg};` +
    `font:500 13px/1.6 system-ui,-apple-system,sans-serif`
  const STYLE = `<style id="demo-pollish">
.demo-pollish-note{margin:12px 14px;padding:9px 14px;${noteCss(t.light)}}
html[data-theme="dark"] .demo-pollish-note,html.dark .demo-pollish-note,html.dark-mode .demo-pollish-note{${noteCss(t.dark)}}
/* 预留空间模式：宿主容器按 CSS 变量让出横条高度，其「参与文档流」的子元素自然下移。
   只影响流式子元素的起始位置，绝对定位的分栏/输入区不受影响；box-sizing 一并锁定，
   避免 content-box 宿主因 padding 而增高被裁切。 */
.demo-note-reserved{box-sizing:border-box!important;padding-top:var(--demo-note-space,0px)!important}
</style>`
  const SCRIPT = `<script id="demo-pollish">
(function () {
  var NOTE_HTML = '<div class="demo-pollish-note" style="align-self:flex-start;flex:0 0 auto">演示模式 · 后端未部署：此处界面为在线美化展示，完整功能见 GitHub 仓库</div>';
  var REPLACE_ONLY = ${replaceOnly};
  var CHAT_HEADER_OFFSET = ${chatHeaderOffset};
  var FLOW_MODE = ${flowMode};
  var RESERVE_MODE = ${reserveSpace};
  var KEYWORDS = /未连接|未部署|未加载|加载.{0,15}失败|无法连接|请先启动后端|Control API|上下文加载失败|不能连接|连接失败|服务不可用|请求失败|There isn't a GitHub Pages|Site not found|404/i;

  function apply() {
    document.querySelectorAll('[role="alert"],[role="status"],[class*="alert"],[class*="error"],[class*="warning"],[class*="banner"],[class*="notice"],[class*="message-box"]').forEach(function (el) {
      if (!el || el.__demoHandled) return;
      var t2 = (el.textContent || '');
      if (t2.length < 4 || t2.length > 20000) return;
      if (!KEYWORDS.test(t2)) return;
      var el2 = el.closest('[role="alert"],[role="status"],[class*="alert"],[class*="warning"],[class*="banner"]') || el;
      if (el2.__demoHandled) return;
      el2.__demoHandled = true;
      el2.style.display = 'none';
      var inTransient = !!el2.closest('[class*="notice"],[class*="message"],[class*="toast"]');
      if (!inTransient && !REPLACE_ONLY) {
        el2.insertAdjacentHTML('afterend', NOTE_HTML);
        var nb = el2.nextElementSibling;
        if (nb) nb.__demoHandled = true;
      }
    });
  }

  function findHost() {
    var sels = ${JSON.stringify(HOST_CANDIDATES)};
    var candidates = sels.map(function (s) { return document.querySelector(s); });
    candidates = candidates.concat(Array.prototype.slice.call(document.querySelectorAll('[class*="content"], [class*="main"], [class*="shell"]')));
    return candidates.find(function (el) {
      if (!el) return false;
      var cls = String(el.className || '');
      if (/notice|message|toast|popover|mask|overlay|modal|dropdown|popper|float/i.test(cls)) return false;
      // 跳过外层壳（如 syLabAI 的 main.app-shell）与侧栏/导航，避免横条插到菜单左侧
      if (/app-shell|side-rail|shell|sidebar|nav|sider|menu/i.test(cls)) return false;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 100 && rect.height > 40;
    }) || null;
  }

  // 顶部横条（独立 id）：容器出现前不插入；容器变化后自动归位（避免应用挂载时机的时序问题）
  function positionNote(n, host) {
    if (!n) return;
    // 流式页面（普通文档流、可滚动）：横条占流插入，内容自然下移不被遮挡
    if (FLOW_MODE) {
      host.classList.remove('demo-note-reserved');
      host.style.removeProperty('--demo-note-space');
      n.style.position = '';
      n.style.top = '';
      n.style.left = '';
      n.style.right = '';
      n.style.zIndex = '';
      host.style.position = '';
      return;
    }
    // 固定视口布局：横条仍然浮层（不把内容挤出可视区），但**为它预留出空间**，
    // 避免盖住应用自己的工具栏/内容区。预留量 = 横条高度 + 上下留白。
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    n.style.position = 'absolute';
    var topOffset = 12;
    if (CHAT_HEADER_OFFSET) {
      // MiLuConsole：chat 页 header 高 64px（新建会话/模型选择），横条下移让位避免遮挡交互
      var chatHeader = host.querySelector('[class*="chat-anywhere-header"],[class*="default-header"],[class*="page-header"]');
      if (chatHeader) {
        var hr = chatHeader.getBoundingClientRect();
        if (hr.height > 0) topOffset = hr.height + 12;
      }
    }
    n.style.top = topOffset + 'px';
    n.style.left = '12px';
    n.style.right = '12px';
    n.style.zIndex = '30';

    if (RESERVE_MODE) {
      // 横条高度随文案与视口变化（实测 65px @1440、86px @390），所以先移除预留量再量净高度，
      // 否则会把上一次的 padding 算进去，逐次累加。
      host.style.setProperty('--demo-note-space', '0px');
      var hr2 = n.getBoundingClientRect().height;
      host.style.setProperty('--demo-note-space', Math.ceil(hr2 + topOffset) + 'px');
      host.classList.add('demo-note-reserved');
    }
  }

  function ensureTopNote() {
    if (!REPLACE_ONLY && document.querySelector('.demo-pollish-note')) return; // 已有错误替换横条，不再重复
    var existing = document.getElementById('demo-mode-note');
    var host = findHost();
    if (host && existing && existing.parentElement !== host) {
      existing.remove();
      existing = null;
    }
    if (!host) return;
    if (existing) { positionNote(existing, host); return; }
    var n = document.createElement('div');
    n.id = 'demo-mode-note';
    n.innerHTML = NOTE_HTML;
    var first = host.firstElementChild;
    if (first) host.insertBefore(n, first); else host.appendChild(n);
    positionNote(n, host);
  }

  apply();
  setTimeout(ensureTopNote, 1200);
  setInterval(function () { apply(); ensureTopNote(); }, 1200);
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`

  let html = readFileSync(file, 'utf8')
  html = html.replace(/<style id="demo-pollish">[\s\S]*?<\/style>[\s]*/g, '')
  html = html.replace(/<script id="demo-pollish">[\s\S]*?<\/script>[\s]*/g, '')
  html = html.replace(/<script id="frame-guard">[\s\S]*?<\/script>[\s]*/g, '')
  // CSP meta 单独擦除：它是独立元素，且要兼容早期没有 id 的注入版本
  html = html.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>\s*/g, '')
  // 入口预热也要先擦后插（同名幂等，见 previewPreloadLinks 的注释）
  html = html.replace(/<link[^>]*data-preload-injected[^>]*>\s*/g, '')
  const preloadLinks = previewPreloadLinks(html)
  html = html
    .replace('</head>', preloadLinks.join('\n') + (preloadLinks.length ? '\n' : '') + FRAME_GUARD_META + '\n' + STYLE + '</head>')
    .replace('</body>', SCRIPT + '\n' + FRAME_GUARD + '</body>')
  writeFileSync(file, html)
  done++
  console.log(`injected: ${name}（浅色 ${t.light.color} / 深色 ${t.dark.color}｜预热 ${preloadLinks.length} 项）`)
}
console.log(`完成：${done} 个预览页已注入/更新演示美化与 iframe 防护`)
