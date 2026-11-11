/*!
 * 知识助手悬浮窗 SDK —— 一行 script 接入任意系统页面（CRM / OA / 素材库）
 *
 *   <script src="http://rag.internal:8090/widget.js"
 *           data-title="销售知识助手"
 *           data-color="#2f6fed"
 *           data-source="crm"
 *           data-token="可选，Bearer key"
 *           data-position="right"></script>
 *
 * 设计取舍：
 * - 用 iframe 而不是把聊天 UI 内联进来：样式与宿主页面彻底隔离，
 *   宿主页面的全局 CSS（很多 OA 会有 *{...} 重置）不会把组件搞变形。
 * - 用 Shadow DOM 包 iframe：同理，防止宿主 CSS 影响按钮位置。
 * - 延迟到第一次点击才创建 iframe：不在页面加载时拖慢宿主系统。
 */
(function () {
  'use strict';
  if (window.__kbWidgetLoaded) return;
  window.__kbWidgetLoaded = true;

  var script = document.currentScript || (function () {
    var s = document.querySelectorAll('script[src*="widget.js"]');
    return s[s.length - 1];
  })();
  if (!script) return;

  var base = script.src.replace(/\/widget\.js.*$/, '');
  var cfg = {
    title: script.dataset.title || '知识助手',
    color: script.dataset.color || '#2f6fed',
    source: script.dataset.source || '',
    token: script.dataset.token || '',
    position: script.dataset.position === 'left' ? 'left' : 'right',
    bottom: script.dataset.bottom || '24px',
    placeholder: script.dataset.placeholder || '问我任何公司文档里的内容',
    // 页面挂在 GitHub Pages 上时，widget.js 和 API 不同源：
    // data-api 把真实 API 地址传给 iframe 里的页面（embed.html 会读 ?api=）。
    // 不给就是同源 —— 由 API 服务自己发 widget.js 时不用管这个。
    api: script.dataset.api || ''
  };

  var host = document.createElement('div');
  host.setAttribute('data-kb-widget', '');
  host.style.cssText = 'position:fixed;z-index:2147483000;inset:0;pointer-events:none;';
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var side = cfg.position;
  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}',
    '.wrap{position:fixed;bottom:' + cfg.bottom + ';' + side + ':24px;pointer-events:auto;display:flex;flex-direction:column;align-items:flex-end;gap:12px}',
    '.wrap.left{align-items:flex-start}',
    '.panel{width:392px;height:min(620px,calc(100vh - 120px));background:#fff;border-radius:16px;overflow:hidden;',
    'box-shadow:0 18px 60px rgba(16,24,40,.22),0 2px 8px rgba(16,24,40,.08);',
    'transform:translateY(12px) scale(.98);opacity:0;pointer-events:none;transition:transform .18s ease,opacity .18s ease;',
    'border:1px solid rgba(16,24,40,.08)}',
    '.panel.on{transform:none;opacity:1;pointer-events:auto}',
    '.panel iframe{width:100%;height:100%;border:0;display:block}',
    '.bubble{width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;color:#fff;',
    'background:' + cfg.color + ';box-shadow:0 8px 24px rgba(16,24,40,.22);display:grid;place-items:center;',
    'transition:transform .15s ease,box-shadow .15s ease;position:relative}',
    '.bubble:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(16,24,40,.28)}',
    '.bubble svg{width:26px;height:26px}',
    '.bubble .x{display:none}',
    '.bubble.open .chat{display:none}',
    '.bubble.open .x{display:block}',
    '.tip{position:absolute;bottom:8px;' + side + ':70px;background:#141a23;color:#fff;font-size:12px;',
    'padding:5px 10px;border-radius:8px;white-space:nowrap;opacity:0;transform:translateX(' + (side === 'right' ? '6px' : '-6px') + ');',
    'transition:all .2s;pointer-events:none}',
    '.wrap:hover .tip{opacity:1;transform:none}',
    '@media (max-width:520px){.panel{width:calc(100vw - 24px);height:calc(100vh - 110px)}}'
  ].join('');
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap ' + (cfg.position === 'left' ? 'left' : '');
  wrap.innerHTML =
    '<div class="panel" part="panel"></div>' +
    '<span class="tip">' + cfg.title + '</span>' +
    '<button class="bubble" aria-label="打开' + cfg.title + '">' +
      '<svg class="chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.9L3 21l1.9-4.5a8.4 8.4 0 0 1-.9-3.9 8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.3z"/>' +
      '</svg>' +
      '<svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
        '<path d="M18 6 6 18M6 6l12 12"/>' +
      '</svg>' +
    '</button>';
  root.appendChild(wrap);

  var panel = wrap.querySelector('.panel');
  var btn = wrap.querySelector('.bubble');
  var iframe = null;

  function build() {
    var p = new URLSearchParams({
      title: cfg.title, color: cfg.color, source: cfg.source, embed: '1'
    });
    if (cfg.token) p.set('token', cfg.token);
    if (cfg.api) p.set('api', cfg.api);
    iframe = document.createElement('iframe');
    // 用 /embed.html 而不是 /embed：静态托管（GitHub Pages）没有
    // 「无扩展名路由」这回事，只有 .html 文件。两个环境都认 .html。
    iframe.src = base + '/embed.html?' + p.toString();
    iframe.title = cfg.title;
    iframe.allow = 'clipboard-write';
    panel.appendChild(iframe);
  }

  var open = false;
  function toggle(next) {
    open = next === undefined ? !open : next;
    if (open && !iframe) build();
    panel.classList.toggle('on', open);
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-label', (open ? '关闭' : '打开') + cfg.title);
    if (open && iframe && iframe.contentWindow) {
      // 打开后把焦点交给 iframe，用户可以直接打字
      setTimeout(function () { try { iframe.contentWindow.focus(); } catch (e) {} }, 220);
    }
  }

  btn.addEventListener('click', function () { toggle(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) toggle(false);
  });
  window.addEventListener('message', function (e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    if (e.data && e.data.type === 'kb-widget-close') toggle(false);
  });

  // 供宿主系统调用：KBWidget.open() / close() / ask('问题')
  window.KBWidget = {
    open: function () { toggle(true); },
    close: function () { toggle(false); },
    ask: function (text) {
      toggle(true);
      var send = function () {
        try { iframe.contentWindow.postMessage({ type: 'kb-ask', text: text }, '*'); } catch (e) {}
      };
      setTimeout(send, iframe ? 400 : 900);
    },
    config: cfg
  };
})();
