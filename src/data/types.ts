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

/** About 能力链路卡：数字引用 stats 数组下标（statIdx 与 stats 一一对应） */
export interface AboutLink {
  title: string
  tag: string
  desc: string
  /** [第 1 个数字, 第 2 个数字] 在 stats 中的下标 */
  statIdx: [number, number]
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
