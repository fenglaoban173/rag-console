/*!
 * 静态控制台的 API 基址解析
 *
 * 同一份页面有两个去处，请求的写法不能一样：
 *
 *   1. API 服务自己发页面（http://主机:8090/）
 *      页面和 API 同源 —— 请求走相对路径就行，一个字都不用改。
 *   2. GitHub Pages 静态托管（https://<账号>.github.io/<仓库>/）
 *      页面和 API **不同源**，相对路径会打到 Pages 自己的域名上（404）。
 *      这时得有一个真实地址，所有请求都得拼上它。
 *
 * 取值优先级（先到先得）：
 *   1. URL 上的 ?api=<地址>   —— 分享链接最顺手，优先级最高
 *   2. localStorage 里存的      —— 在同一个浏览器里填一次就记住
 *   3. 同源（默认，空串）      —— 由 API 服务发页面时就是对的
 *
 * 注意（真要连内网 API 时）：Pages 站点是 **HTTPS**，浏览器会拦掉
 * 页面发起的 HTTP 请求（混合内容）。API 前面得挂一层 TLS 终结
 * （nginx / Caddy），用 https:// 地址。
 */
(function () {
  'use strict';

  var KEY = 'kb.api.base';

  function fromQuery() {
    try {
      var q = new URLSearchParams(location.search).get('api');
      return q === null ? null : q.trim();
    } catch (e) {
      return null;
    }
  }

  function fromStore() {
    try {
      return (localStorage.getItem(KEY) || '').trim();
    } catch (e) {
      return '';   // 无痕模式 / 存储被禁：不报错，按没存过算
    }
  }

  var q = fromQuery();
  if (q !== null) {
    try { localStorage.setItem(KEY, q); } catch (e) {}
  }

  var base = (q !== null ? q : fromStore()).replace(/\/+$/, '');

  /** API 基址（空串 = 同源） */
  window.KB_API_BASE = base;

  /** 把 /ask/stream 这样的路径拼成完整地址 */
  window.KB_URL = function (path) {
    if (!path) return base || '/';
    return base + (path.charAt(0) === '/' ? path : '/' + path);
  };
})();
