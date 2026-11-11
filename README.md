# 知识库问答控制台（静态页）

内部知识库问答服务的**前端控制台**，只包含静态页面，由 GitHub Pages 自动部署。

- 站点：<https://fenglaoban173.github.io/rag-console/>
- 后端服务：内部部署，不公开（代码在私有仓库里）

## 这里有什么

| 文件 | 用途 |
| --- | --- |
| `site/index.html` | 全功能控制台（对话 / 上传 / 检索详情） |
| `site/admin.html` | 文档后台（列表、上传、删除、重建索引） |
| `site/embed.html` | 悬浮窗内嵌的紧凑对话页 |
| `site/demo.html` | 演示悬浮窗接入方式 |
| `site/widget.js` | 一行 `<script>` 接入任意系统页面（CRM / OA） |
| `site/config.js` | 决定请求往哪儿发（见下） |

**这里没有任何公司文档、密钥或内部地址** —— 页面只是壳，数据全部来自后端 API。

## 怎么连后端

页面和 API 不同源时，所有请求都要打到一个真实地址去。地址按这个顺序取：

1. URL 上的 `?api=<地址>` —— 例如
   `https://fenglaoban173.github.io/rag-console/?api=https://kb.example.com`
2. 浏览器里记住的上一次设置（`localStorage`）
3. 同源（默认）—— 由后端服务自己发页面时就是对的

注意：Pages 站点是 **HTTPS**，浏览器会拦掉页面发起的 HTTP 请求（混合内容）。
后端前面需要一层 TLS 终结（nginx / Caddy），用 `https://` 地址。

## 改了页面怎么同步过来

源文件在私有仓库里（`web/` 目录）。改完在私有仓库里跑：

```bash
python scripts/sync_console.py
```

它会把 `web/` 复制到本仓库的 `site/`，提交并推送；推完 GitHub Actions 自动重新部署。

## 部署链路

```
私有仓库 web/  ──scripts/sync_console.py──►  本仓库 site/  ──Actions──►  GitHub Pages
```
