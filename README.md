# 蒋宇龙 · 个人作品集网站

个人求职作品集单页应用：AI 应用平台型全栈工程师 —— 数据工程、业务系统交付与 Windows 原生桌面端工程化。

- **技术栈**：React 19 + TypeScript + Vite + Tailwind CSS 4
- **特性**：单页滚动式布局、浅色/深色模式切换、项目按岗位方向筛选（AI 应用 / 企业系统 / 大数据）、简历 PDF 下载、移动端适配
- **部署**：GitHub Pages（GitHub Actions 自动构建）

## 本地运行

```bash
npm install
npm run dev      # 开发预览 http://localhost:5173
npm run build    # 类型检查 + 生产构建（输出 dist/）
npm run preview  # 预览生产构建
```

## 目录结构

```
_archive/                 # ★ 原始素材归档（备份用，已随仓库上传 GitHub）
  avatars/                #   证件照原图（avatar-blue / avatar-white）
  certs/                  #   证书/成绩单/奖牌原图
  project-screenshots/    #   项目截图原图
  resumes/                #   简历 PDF 原件（保留中文原名）
database/
  portfolio.db            # ★ SQLite 内容库（内容源）
scripts/
  seed-db.mjs             #   JSON → 数据库（npm run db:seed）
  export-db.mjs           #   数据库 → JSON（npm run db:export）
public/
  resume.pdf              # 站点简历（最新版覆盖即可）
  projects/*.webp         # 项目截图（构建资源）
  images/ certificates/   # 头像、证书缩略图（构建资源）
src/
  data/*.json             # 构建数据（由数据库导出生成，勿手改）
  data/types.ts           # 数据类型定义
  components/             # 页面组件
```

## 内容维护（数据流）

**内容源头是 `database/portfolio.db`（SQLite）**，构建时自动从数据库导出 JSON：

```bash
npm run db:seed    # 用 src/data/*.json 重建/覆盖数据库（改内容时先改 JSON 再 seed）
npm run db:export  # 从数据库导出 JSON（npm run build 会自动执行）
npm run build      # = db:export + 类型检查 + 构建
```

日常改内容的两种方式：

1. **改 JSON → 入库**：编辑 `src/data/*.json`（或直接改数据库），执行 `npm run db:seed` 同步到库；
2. **改数据库 → 出 JSON**：直接用 SQLite 工具改 `database/portfolio.db`，执行 `npm run db:export` 重新生成 JSON。

换简历：覆盖 `public/resume.pdf`（原件归档在 `_archive/resumes/`）。
新增证书/头像：压缩后的 WebP 放 `public/` 对应目录，原图放入 `_archive/` 对应目录，再改 `education.json` 或相关数据。

## 图片与命名规范

- 站点图片统一放 `public/` 下，按类型分目录：`projects/`、`certificates/`、`images/`（头像）
- **命名规则**：小写 kebab-case（连字符分隔）；产品名保持紧凑（`milustudio`、`xiaolouai`），通用词用连字符（`milu-assistant-web`、`book-recommendation`、`cet-4`、`sanchuang-medal`）
- `_archive/` 归档文件与 `public/` 站点文件一一对应、命名一致（简历 PDF 除外，保留原名便于识别）
- 数据源为 SQLite（`database/portfolio.db`），其中存储的图片路径与 `public/` 实际文件名严格一致；新增/改名图片后执行 `npm run db:seed` 同步

## 部署到 GitHub Pages

仓库已配置 GitHub Actions（`.github/workflows/deploy.yml`），推送到 `main` 分支即自动构建并部署：

1. 构建流程：`npm ci` → `npm run build`（自动执行 `db:export` 从数据库导出 JSON，再做类型检查与打包）
2. 部署流程：`upload-pages-artifact` 上传 `dist/`，`deploy-pages` 发布到 GitHub Pages
3. 访问地址：https://white-147.github.io/jyl-site/

> 如需自定义域名：在仓库 Settings → Pages 中绑定已备案域名；如切换 Vercel/Netlify 部署，将根目录 `_redirects`/配置文件与 Actions 工作流一并调整即可。
