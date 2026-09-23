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
}

export interface AboutPara {
  /** 阶段标签（早期 / 近期 / 日常） */
  phase: string
  /** 该阶段下的自然段（段首由 phase 彩色强调） */
  texts: string[]
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

export interface SkillGroup {
  title: string
  items: string[]
}

/** 岗位技能画像：一个岗位一个模板（分组 + 词条） */
export interface SkillProfile {
  id: string
  label: string
  /** 岗位说明（如过渡兼职标注） */
  note?: string
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

export interface AwardItem {
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

/* ---------- UE5 学习笔记文档区（src/data/ue5-docs.json，由 scripts/import-ue-docs.mjs 生成） ---------- */

export interface DocHeading {
  /** 标题锚点 id（由转换器按标题文本生成，稳定且可分享） */
  id: string
  label: string
  /** 标题层级：1 篇名 / 2 大节 / 3 小节（4 级不进大纲） */
  level: number
}

export interface DocEntry {
  id: string
  title: string
  subtitle?: string
  /** 阅读顺序（01–05）。侧栏与正文头部都显示，依赖关系靠它表达 */
  order?: number
  /** 主题分组（界面 / 蓝图…）。侧栏在组间加留白，正文头部显示为徽标 */
  group?: string
  /** 前置文档（正文头部显示「前置：xxx」），无前置为 null */
  prereq?: { id: string; title: string } | null
  /** 下一篇（同组内按 order 推导；篇尾 CTA 用），本组最后一篇为 null */
  next?: { id: string; title: string } | null
  /** ready = 已导入并生成 HTML；pending = 只占位显示（笔记尚未导入本站） */
  status: 'ready' | 'pending'
  toc: DocHeading[]
  /** ready 时的 HTML 文件名（位于 public/docs/ue5/ 下） */
  html?: string
}

export interface Ue5DocsManifest {
  /** 生成说明（该文件为产物，勿手改） */
  _note: string
  docsRoot: string
  docs: DocEntry[]
}
