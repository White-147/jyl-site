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
  /**
   * 特殊角色标记。
   * `hero` = 首屏：它排在第一位、参与滚动侦测与右侧导轨节点、会被高亮，
   *   但**不是正文章节** —— 不计入 `01/06` 编号、不进移动端底部 Tab Bar。
   *   同时它是页面的顶端锚点，导航到它等同于"回到顶部"。
   * 普通章节不带此字段。
   */
  role?: 'hero'
  /** 是否是一个「有正文的章节」。`false` 用于首屏这类只有背景没有正文的条目。 */
  isChapter?: boolean
}

/** 首屏的角色标记与 id，供各组件引用，避免各处硬编码字符串 */
export const HERO_ROLE = 'hero' as const
export const HERO_ID = 'top'

export const SECTIONS: SectionDef[] = [
  {
    // id 必须与 Hero.tsx 的 <section id="top"> 一致
    id: HERO_ID,
    role: HERO_ROLE,
    label: '首屏',
    shortLabel: '首屏',
    isChapter: false,
    icon: 'M12 3 2 12h4v9h12v-9h4L12 3z',
  },
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

/** 区块 id 列表（滚动侦测共用）。**包含首屏**，因为首屏也要在导轨上高亮。 */
export const SECTION_IDS = SECTIONS.map((s) => s.id)

/** 有正文的正文章节（不计首屏）。用于编号、底部 Tab Bar 等「按章节」的场景。 */
export const CHAPTERS = SECTIONS.filter((s) => s.isChapter !== false)

/** 正文章节 id 列表 */
export const CHAPTER_IDS = CHAPTERS.map((s) => s.id)