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
  highlight?: boolean
  /** 在线演示地址（部署的前端入口） */
  demoUrl?: string
  /** 演示提示（如测试账号），显示为按钮 title */
  demoNote?: string
  /** 下载地址（桌面安装包 Release 链接） */
  downloadUrl?: string
  /** 下载提示（如安装包说明），显示为按钮 title */
  downloadNote?: string
}

export interface SkillGroup {
  title: string
  items: string[]
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
