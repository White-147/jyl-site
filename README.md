# 蒋宇龙 · 个人作品集网站

个人求职作品集单页应用：AI 应用平台型全栈工程师 —— 数据工程、业务系统交付与 Windows 原生桌面端工程化。

- **技术栈**：React 19 + TypeScript + Vite + Tailwind CSS 4
- **特性**：单页滚动式布局、浅色/深色模式切换、项目按岗位方向筛选（AI 应用 / 企业系统 / 大数据）、简历 PDF 下载、移动端适配
- **部署**：Vercel（免费）

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
  avatars/                #   证件照原图
  certs/                  #   证书/成绩单/奖牌原图
  project-screenshots/    #   项目截图原图
  resumes/                #   简历 PDF 原件
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

## 部署到 Vercel

1. 推送到 GitHub（仓库名如 `portfolio`）
2. 打开 https://vercel.com/new ，导入该仓库
3. Framework Preset 选择 **Vite**，其余默认，点 Deploy
4. 部署完成后获得 `*.vercel.app` 域名，可在 Settings → Domains 绑定自定义域名

> 注意：`vercel.app` 域名在国内访问可能不稳定，如需稳定国内访问可考虑绑定已备案域名，或使用 GitHub Pages 作为备选部署方式（`npm run build` 后把 `dist/` 推到 `gh-pages` 分支）。
