/** 全站区块注册表：导航、滚动侦测、移动端 Tab Bar、右侧导航共用同一数据源。
 *  新增/调整区块只需修改此处。 */

export interface SectionDef {
  id: string
  /** 完整描述（右侧玻璃管导航用，无歧义） */
  label: string
  /** 短名（顶部导航/底部 Tab Bar 用，节省空间） */
  shortLabel: string
  /** 图标 path（底部 Tab Bar 用） */
  icon: string
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'about',
    label: '关于我',
    shortLabel: '关于',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  },
  {
    id: 'projects',
    label: '项目作品',
    shortLabel: '项目',
    icon: 'M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm0 12H4V8h16v10zM9 10h2v2H9v-2zm0 4h6v2H9v-2z',
  },
  {
    id: 'skills',
    label: '专业技能',
    shortLabel: '技能',
    icon: 'M13 2 3 14h7l-1 8 10-12h-7l1-8z',
  },
  {
    id: 'experience',
    label: '工作经历',
    shortLabel: '经历',
    icon: 'M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z',
  },
  {
    id: 'education',
    label: '教育背景',
    shortLabel: '教育',
    icon: 'M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5',
  },
  {
    id: 'contact',
    label: '联系我',
    shortLabel: '联系',
    icon: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
  },
]

/** 区块 id 列表（滚动侦测共用） */
export const SECTION_IDS = SECTIONS.map((s) => s.id)
