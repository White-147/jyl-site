// 数据类型的唯一来源（内容本体在 database/portfolio.db 与 src/data/*.json）

export interface Stat {
  value: string
  suffix?: string
  label: string
}

export type ProjectTag = 'AI 应用' | '企业系统' | '大数据'

export interface Project {
  id: string
  name: string
  tags: ProjectTag[]
  period: string
  summary: string
  details: string[]
  stack: string[]
  link: string
  screenshot?: string
  /** 在线演示地址（部署的前端入口） */
  demoUrl?: string
  /** 演示提示（如测试账号），显示为按钮 title */
  demoNote?: string
  /** 内嵌静态预览地址（jyl-site 内的前端静态产物，相对站点根路径） */
  previewUrl?: string
  /** 内嵌静态预览提示（如"界面预览，接口未部署"），显示为按钮 title */
  previewNote?: string
  /** 下载地址（桌面安装包 Release 链接） */
  downloadUrl?: string
  /** 下载提示（如安装包说明），显示为按钮 title */
  downloadNote?: string
  /** 下载动作可见文案提示（浅灰小字，与整体 meta 样式一致） */
  downloadHint?: string
  /**
   * 站内文档区的对应入口（如 `#/docs/thesis`）。有值时卡片上出现「毕业设计原文」按钮。
   * 与文档区那侧的 `DocSection.relatedProject` 互为反向入口，两边都由数据驱动、不在组件里判断 id。
   */
  docsUrl?: string
}

export interface AboutPara {
  /** 阶段分组名（早期 / 近期 / 日常）。**不直接上屏**，只用于把段落分组与做 key */
  phase: string
  /**
   * 该阶段下的自然段。两种写法：
   *  - `string`：普通段落，不带标签；
   *  - `{ label, text }`：带行内彩色标签的段落（如「日常」「目前」）。
   * 标签样式与阶段名一致（brand 色 + 半粗），四个标签竖排下来是齐的。
   * 见 About.tsx 的渲染分支 —— 改这里要同时改那边。
   */
  texts: (string | { label: string; text: string })[]
}

/** About 能力链路卡：数字**内联在卡内**，不再引用全局 stats 下标
 *  （下标式引用是漂移源：改 stats 顺序会静默串卡，见 docs/联动维护点.md 的约定）。 */
export interface AboutLink {
  title: string
  tag: string
  desc: string
  /** 卡片展示的两个数字（顺序即展示顺序） */
  stats: Stat[]
}

/** About 右侧多定位卡：一个岗位方向一条定位（结构与技能画像对齐） */
export interface AboutPosition {
  title: string
  desc: string
  keywords: string[]
}

interface SkillGroup {
  title: string
  items: string[]
}

/** 岗位技能画像：一个岗位一个模板（分组 + 词条） */
export interface SkillProfile {
  id: string
  label: string
  /** 岗位说明（如过渡兼职标注） */
  note?: string
  /**
   * 该画像的「高频常用」快捷筛选词（点击即填进搜索框）。空数组 = 不渲染那一行。
   *
   * ⚠️ 这个字段必须存在数据库的 `skill_profiles.quick_tags` 里，不能只写在 JSON：
   *    `npm run build` 会先跑 db:export 用数据库覆盖 `src/data/*.json`，
   *    只写在 JSON 里的 UI 配置会在下一次构建时静默消失。
   */
  quickTags?: string[]
  groups: SkillGroup[]
}

export interface Experience {
  company: string
  role: string
  period: string
  summary: string
  points: string[]
}

export interface CertItem {
  name: string
  image: string
  date?: string
}

interface AwardItem {
  name: string
  image: string
}

export interface EducationData {
  school: string
  degree: string
  period: string
  location: string
  certs: CertItem[]
  awards: AwardItem[]
}

/* ---------- 文档区（src/data/docs.json，由 scripts/build-docs.mjs 生成，不进 git） ---------- */

interface DocHeading {
  /** 标题锚点 id（由转换器按标题文本生成，稳定且可分享） */
  id: string
  label: string
  /** 标题层级：1 篇名 / 2 大节 / 3 小节（4 级不进大纲） */
  level: number
}

/** 文档分区（顺序即导航顺序：毕业论文 → UE 理论 → UE 实战） */
export interface DocSection {
  id: string
  /** 完整分区名（侧栏与分区切换用） */
  label: string
  /** 手机端分段控件的短名（论文 / 理论 / 实战） */
  short: string
  /** 分区说明（分区落地页用） */
  blurb: string
  /**
   * 配套项目 id（`src/data/projects.json` 里的 id）。有值时每页页头显示
   * 「配套项目：<项目名> →」，指向主页项目区 `#projects`。关系只在 build-docs.mjs 里声明一次。
   */
  relatedProject?: string
  /** 已导入的篇数 */
  ready: number
  /** 分区内的总条目数（含待导入） */
  total: number
  chars: number
  images: number
}

/**
 * 文档页。
 *
 * ⚠️ 一篇**源**会被拆成多页（见 scripts/build-docs.mjs 的装箱逻辑）：
 *    早期「一篇源 = 一页」时，最长的一篇在手机上要滚 56 屏。
 *    所以「文档」这个概念在数据上分两层：`source`（源，如 ue5-window-base）
 *    与 `id`（页，如「1. 菜单栏」）。路由用的是**页**：`#/docs/<分区>/<页 id>`。
 */
export interface DocPage {
  id: string
  section: string
  /** 所属源（一篇源拆出的多页共享它，用来在侧栏里成组） */
  source: string
  /** 源标题（侧栏的分组名，如「界面基础操作」） */
  chapter: string
  /**
   * 页面主题（= 页内第一个非「祖先块」的标题）。
   *
   * ⚠️ 不是「第一个块的标题」。拆出来的页往往以容器标题开头，
   *    直接取第一个块会把标题写成章名（「2 系统相关技术介绍」），
   *    而这一页实际装的是 2.1 大数据平台 —— 真正的主题反而看不到。
   */
  title: string
  /** 左栏层级：源 → ...ancestors → 本页。空数组 = 直接挂在源下面 */
  ancestors: string[]
  /** 本页实际装了哪几节（装箱会把相邻小节并成一页）；>1 时左栏提示「还包含…」 */
  labels: string[]
  /** 最近两级祖先（正文头部的面包屑用） */
  crumbs: string[]
  subtitle?: string | null
  /** 在本源内的页序（01、02…） */
  order?: number
  /** 分区内的主题分组（入门 / 界面 / 蓝图…） */
  group?: string | null
  /** 前置文档（正文头部显示「前置：xxx」），无前置为 null */
  prereq?: { id: string; title: string } | null
  /**
   * 下一篇（按**清单顺序**推导：源内下一页；源末页 → 下一个源的第一页）。
   * `sameDoc` 决定篇尾文案：true = 「下一节：<页标题>」，false = 「下一篇：<源标题>」。
   */
  next?: { id: string; title: string; sameDoc: boolean } | null
  /** ready = 已生成 HTML；pending = 只占位显示（笔记尚未导入本站） */
  status: 'ready' | 'pending'
  toc: DocHeading[]
  /** ready 时的 HTML 路径，相对 public/（前端 fetch 时前面补 `docs/`） */
  html?: string | null
  /** 体量统计（构建期算的，手机屏口径）—— 给自检与排查用，界面不依赖它 */
  stats: { chars: number; images: number; screens: number }
}

export interface DocsManifest {
  /** 生成说明（该文件为产物，勿手改） */
  _note: string
  /**
   * 每份源自己的 H1（只有单个顶层标题时才算「文档标题」）。
   * 这一层故意不渲染（与源标题重复），记录它是让自检能把「故意不渲染」和「丢了」区分开。
   */
  docTitles?: Record<string, string | null>
  sections: DocSection[]
  pages: DocPage[]
}
