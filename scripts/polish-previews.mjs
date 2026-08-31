// 预览页演示美化注入：向 jyl-site/public/preview/*/index.html 注入
//   1) 右上角「演示模式 · 后端未部署」徽章（固定浮标）
//   2) 运行时美化规则：隐藏各项目自身"缺后端"报错提示并替换为演示说明
//   幂等（含 marker 则跳过）；各项目重新构建复制进 preview 后重跑本脚本即可。
// 用法：node scripts/polish-previews.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const previewDir = join(root, 'public', 'preview')
const MARKER = 'demo-pollish:v1'

const STYLE = `<style id="demo-pollish">
#demo-mode-badge{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:999999;display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 16px;border-radius:9999px;background:linear-gradient(90deg,rgba(15,118,110,.95),rgba(13,148,136,.95));color:#fff;font:500 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.04em;box-shadow:0 3px 14px rgba(15,46,54,.22);backdrop-filter:blur(6px);pointer-events:none}
#demo-mode-badge .dot{width:6px;height:6px;border-radius:9999px;background:#5eead4;box-shadow:0 0 6px #5eead4}
@media (max-width:640px){#demo-mode-badge{top:8px;font-size:11px;height:26px;padding:0 12px}}
</style>`

const SCRIPT = `<script id="demo-pollish">
(function () {
  var badge = document.createElement('div');
  badge.id = 'demo-mode-badge';
  badge.innerHTML = '<span class="dot"></span>演示模式 · 后端未部署';
  (document.body || document.documentElement).appendChild(badge);

  var NOTE = '<div style="margin:10px 0;padding:9px 14px;border:1px dashed rgba(94,234,212,.55);border-radius:10px;color:#5eead4;background:rgba(20,184,166,.07);font:500 13px/1.6 system-ui,-apple-system,sans-serif">演示模式 · 后端未部署：此处界面为在线美化展示，完整功能见 GitHub 仓库</div>';
  var KEYWORDS = /未连接|未部署|未加载|加载.{0,15}失败|无法连接|请先启动后端|Control API|上下文加载失败|不能连接|连接失败|服务不可用|请求失败|There isn't a GitHub Pages|Site not found|404/i;

  function apply() {
    var hits = document.querySelectorAll('[role="alert"],[role="status"],[class*="alert"],[class*="error"],[class*="warning"],[class*="banner"],[class*="notice"],[class*="message-box"]');
    hits.forEach(function (el) {
      if (!el || el.__demoHandled || el.id === 'demo-mode-badge') return;
      var t = (el.textContent || '');
      if (t.length < 4 || t.length > 20000) return;
      if (!KEYWORDS.test(t)) return;
      var el2 = el.closest('[role="alert"],[role="status"],[class*="alert"],[class*="warning"],[class*="banner"]') || el;
      if (el2.__demoHandled) return;
      el2.__demoHandled = true;
      el2.style.display = 'none';
      el2.insertAdjacentHTML('afterend', NOTE);
      var nb = el2.nextElementSibling;
      if (nb) nb.__demoHandled = true;
    });
    // 若 body 尚无徽章（被 SPA 路由重绘移除）则补回
    if (!document.getElementById('demo-mode-badge')) {
      var b = document.createElement('div');
      b.id = 'demo-mode-badge';
      b.innerHTML = '<span class="dot"></span>演示模式 · 后端未部署';
      (document.body || document.documentElement).appendChild(b);
    }
  }
  apply();
  setInterval(apply, 1200);
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
  // 清除旧版注入（幂等升级，规则更新后重跑即生效）
  html = html.replace(/<style id="demo-pollish">[\s\S]*?<\/style>[\s]*/g, '')
  html = html.replace(/<script id="demo-pollish">[\s\S]*?<\/script>[\s]*/g, '')
  html = html.replace('</head>', STYLE + '</head>').replace('</body>', SCRIPT + '</body>')
  writeFileSync(file, html)
  done++
  console.log(`injected: ${name}`)
}
console.log(`完成：${done} 个预览页已注入/更新演示美化`)
