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

// 各项目配色（边框/文字/背景，浅深两态）：适配品牌风格
const THEMES = {
  'sylab-ai': {
    border: 'rgba(59,130,246,.5)', color: '#3b82f6', bg: 'rgba(59,130,246,.07)',
    darkColor: '#60a5fa',
  },
  'xiao-lou-ai': {
    border: 'rgba(217,119,6,.55)', color: '#d97706', bg: 'rgba(217,119,6,.08)',
    darkColor: '#fbbf24',
  },
  'milu-assistant-web': {
    border: 'rgba(147,51,234,.5)', color: '#9333ea', bg: 'rgba(147,51,234,.08)',
    darkColor: '#c084fc',
  },
  'milu-studio': {
    border: 'rgba(148,163,184,.5)', color: '#64748b', bg: 'rgba(148,163,184,.08)',
    darkColor: '#cbd5e1',
  },
  'book-recommendation': {
    border: 'rgba(64,158,255,.5)', color: '#409eff', bg: 'rgba(64,158,255,.08)',
    darkColor: '#60a5fa',
  },
}

// 主内容区候选（可见且非弹层）；milu-studio 特指工作台主区
const HOST_CANDIDATES = [
  'main',
  '.ant-layout-content',
  '.page-content',
  '.workspace-main',
  '.workspace-project-main',
  '.workspace',
  '.app-content',
  'section',
]

let done = 0
for (const name of Object.keys(THEMES)) {
  const file = join(previewDir, name, 'index.html')
  if (!existsSync(file)) {
    console.log(`skip: ${name} (no index.html)`)
    continue
  }
  const t = THEMES[name]
  const replaceOnly = name === 'xiao-lou-ai' ? 'true' : 'false' // XiaoLouAI：错误元素容器窄，仅隐藏、顶部统一全宽条
  const NOTE_CSS =
    `border:1px dashed ${t.border};border-radius:10px;color:${t.color};background:${t.bg};` +
    `font:500 13px/1.6 system-ui,-apple-system,sans-serif`
  const STYLE = `<style id="demo-pollish">\n.demo-pollish-note{margin:12px 14px;padding:9px 14px;${NOTE_CSS}}\n</style>`
  const SCRIPT = `<script id="demo-pollish">
(function () {
  var NOTE_HTML = '<div class="demo-pollish-note" style="align-self:flex-start;flex:0 0 auto">演示模式 · 后端未部署：此处界面为在线美化展示，完整功能见 GitHub 仓库</div>';
  var REPLACE_ONLY = ${replaceOnly};
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
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 100 && rect.height > 40;
    }) || null;
  }

  // 顶部横条（独立 id）：容器出现前不插入；容器变化后自动归位（避免应用挂载时机的时序问题）
  function ensureTopNote() {
    if (!REPLACE_ONLY && document.querySelector('.demo-pollish-note')) return; // 已有错误替换横条，不再重复
    var existing = document.getElementById('demo-mode-note');
    var host = findHost();
    if (host && existing && existing.parentElement !== host) {
      existing.remove();
      existing = null;
    }
    if (existing || !host) return;
    var n = document.createElement('div');
    n.id = 'demo-mode-note';
    n.innerHTML = NOTE_HTML;
    var first = host.firstElementChild;
    if (first) host.insertBefore(n, first); else host.appendChild(n);
    // 工作台类主内容区（自身 relative）：垂直居中布局下横条改为绝对定位贴主区顶部
    if (/workspace-main/.test(String(host.className || ''))) {
      n.style.position = 'absolute';
      n.style.top = '12px';
      n.style.left = '12px';
      n.style.right = '12px';
    }
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
  html = html.replace('</head>', STYLE + '</head>').replace('</body>', SCRIPT + '</body>')
  writeFileSync(file, html)
  done++
  console.log(`injected: ${name} (${t.color})`)
}
console.log(`完成：${done} 个预览页已注入/更新演示美化`)
