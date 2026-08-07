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
public/
  resume.pdf              # 简历（替换为最新版即可）
  projects/*.webp         # 项目截图（来自各仓库 docs/assets/screenshots）
  favicon.svg
src/
  data/                   # ★ 所有内容都在这几个文件里改
    profile.ts            #   个人信息、关于我、关键数据、联系方式
    projects.ts           #   项目（名称/标签/时间/简介/要点/技术栈/链接/截图）
    skills.ts             #   技能分组
    experience.ts         #   工作经历
    education.ts          #   教育背景与证书
  components/             # 页面组件
```

## 内容维护

所有内容均为纯数据驱动：改 `src/data/*.ts` 后刷新页面即可，无需改动组件。

- 换简历：覆盖 `public/resume.pdf`
- 换项目截图：把新图放到 `public/projects/`，在 `projects.ts` 里改 `screenshot` 字段
- 新增岗位方向标签：改 `projects.ts` 的 `projectTags` 和 `ProjectTag` 类型

## 部署到 Vercel

1. 推送到 GitHub（仓库名如 `portfolio`）
2. 打开 https://vercel.com/new ，导入该仓库
3. Framework Preset 选择 **Vite**，其余默认，点 Deploy
4. 部署完成后获得 `*.vercel.app` 域名，可在 Settings → Domains 绑定自定义域名

> 注意：`vercel.app` 域名在国内访问可能不稳定，如需稳定国内访问可考虑绑定已备案域名，或使用 GitHub Pages 作为备选部署方式（`npm run build` 后把 `dist/` 推到 `gh-pages` 分支）。
