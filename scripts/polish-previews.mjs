// 预览页演示美化注入 v5（SyLabAI 式内容内横条）：
//   1) 错误提示元素出现 → 就地替换为「演示模式」说明横条（与 SyLabAI 同款样式）
//   2) 无错误提示时 → 在主内容区顶部插入同款横条（不遮挡页头/角落，无 fixed 浮标）
//   幂等：重跑即覆盖旧注入；各项目重新构建复制进 preview 后重跑本脚本即可。
// 用法：node scripts/polish-previews.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const previewDir = join(root, 'public', 'preview')

const NOTE_CSS = `border:1px dashed rgba(94,234,212,.55);border-radius:10px;color:#5eead4;background:rgba(20,184,166,.07);font:500 13px/1.6 system-ui,-apple-system,sans-serif`

const STYLE = `<style id="demo-pollish">
.demo-pollish-note{margin:12px 14px;padding:9px 14px;${NOTE_CSS}}
</style>`

const SCRIPT = `<script id="demo-pollish">
(function () {
  var NOTE_HTML = '<div class="demo-pollish-note">演示模式 · 后端未部署：此处界面为在线美化展示，完整功能见 GitHub 仓库</div>';
  var KEYWORDS = /未连接|未部署|未加载|加载.{0,15}失败|无法连接|请先启动后端|Control API|上下文加载失败|不能连接|连接失败|服务不可用|请求失败|There isn't a GitHub Pages|Site not found|404/i;

  function apply() {
    document.querySelectorAll('[role="alert"],[role="status"],[class*="alert"],[class*="error"],[class*="warning"],[class*="banner"],[class*="notice"],[class*="message-box"]').forEach(function (el) {
      if (!el || el.__demoHandled) return;
      var t = (el.textContent || '');
      if (t.length < 4 || t.length > 20000) return;
      if (!KEYWORDS.test(t)) return;
      var el2 = el.closest('[role="alert"],[role="status"],[class*="alert"],[class*="warning"],[class*="banner"]') || el;
      if (el2.__demoHandled) return;
      el2.__demoHandled = true;
      el2.style.display = 'none';
      // 瞬态弹层（message/notice/toast）内的错误只隐藏：插入的横条会随弹层消失，
      // 持久说明由 ensureTopNote 负责插入主内容区
      var inTransient = !!el2.closest('[class*="notice"],[class*="message"],[class*="toast"]');
      if (!inTransient) {
        el2.insertAdjacentHTML('afterend', NOTE_HTML);
        var nb = el2.nextElementSibling;
        if (nb) nb.__demoHandled = true;
      }
    });
  }

  // 无错误替换横条时：在主内容区顶部插入同款横条（候选容器需可见，避免误插隐藏弹层）
  function ensureTopNote() {
    if (document.querySelector('.demo-pollish-note')) return;
    var candidates = [
      document.querySelector('main'),
      document.querySelector('.ant-layout-content'),
      document.querySelector('.page-content'),
      document.querySelector('.workspace'),
      document.querySelector('.app-content'),
      document.querySelector('section'),
    ];
    candidates = candidates.concat(Array.prototype.slice.call(document.querySelectorAll('[class*="content"], [class*="main"]')));
    var host = candidates.find(function (el) {
      if (!el) return false;
      var cls = String(el.className || '');
      if (/notice|message|toast|popover|mask|overlay|modal|dropdown|popper|float/i.test(cls)) return false;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 100 && rect.height > 40;
    }) || document.body;
    var note = document.createElement('div');
    note.innerHTML = NOTE_HTML;
    var first = host.firstElementChild;
    if (first) host.insertBefore(note, first); else host.appendChild(note);
  }

  apply();
  setTimeout(ensureTopNote, 1200);
  setInterval(function () { apply(); ensureTopNote(); }, 1200);
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`

let done = 0
for (const name of ['sylab-ai', 'xiao-lou-ai', 'milu-assistant-web', 'milu-studio', 'book-recommendation']) {
  const file = join(previewDir, name, 'index.html')
  if (!existsSync(file)) {
    console.log(`skip: ${name} (no index.html)`)
    continue
  }
  let html = readFileSync(file, 'utf8')
  html = html.replace(/<style id="demo-pollish">[\s\S]*?<\/style>[\s]*/g, '')
  html = html.replace(/<script id="demo-pollish">[\s\S]*?<\/script>[\s]*/g, '')
  html = html.replace('</head>', STYLE + '</head>').replace('</body>', SCRIPT + '</body>')
  writeFileSync(file, html)
  done++
  console.log(`injected: ${name}`)
}
console.log(`完成：${done} 个预览页已注入/更新演示美化`)
