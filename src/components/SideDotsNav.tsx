import { useScrollSpy } from '../hooks/useScrollSpy'
import ThemeToggle from './ThemeToggle'

const sections = [
  { id: 'about', label: '关于' },
  { id: 'projects', label: '项目' },
  { id: 'skills', label: '技能' },
  { id: 'experience', label: '经历' },
  { id: 'education', label: '教育' },
  { id: 'contact', label: '联系' },
]

/** 右侧玻璃管进度导航（糖葫芦穿串版）：
 *  每行 = 固定宽文字（右对齐）+ 圆点（固定尺寸，active/hover 用 transform 缩放不偏移中心）
 *  → 所有圆点中心在同一竖线上，玻璃管绝对定位对齐该竖线 → 圆点必然穿在管上。
 *  Dock 弹性动效：hover 文字+节点同放大，选中常驻放大。最上返回顶部，最下主题下拉（左弹）。 */
export default function SideDotsNav() {
  const active = useScrollSpy(sections.map((s) => s.id))

  return (
    <nav
      aria-label="页面章节导航"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:flex"
    >
      <div className="relative">
        {/* 玻璃管（光纤质感，贯穿近整屏；中心线与圆点中心对齐） */}
        <span
          className="absolute bottom-1 top-1 right-[6.5px] w-[7px] rounded-full border border-white/60 bg-white/40 shadow-[inset_0_0_6px_rgba(59,130,246,0.4),0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-sm dark:border-white/20 dark:bg-white/10"
          aria-hidden="true"
        />

        {/* 返回顶部（管顶节点，左侧带提示文字） */}
        <a
          href="#top"
          aria-label="返回顶部"
          title="返回顶部"
          className="group relative z-10 flex items-center justify-end gap-2.5 py-1 pr-[15px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
        >
          <span className="w-12 text-right text-xs text-slate-400 transition-colors group-hover:text-blue-700 dark:text-slate-500 dark:group-hover:text-blue-400">
            顶部
          </span>
          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white shadow-[inset_0_0_3px_rgba(59,130,246,0.5)] ring-2 ring-slate-300 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:bg-blue-600 group-hover:ring-blue-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-blue-400" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-1.5 w-1.5 text-slate-600 dark:text-slate-800" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
        </a>

        {/* 章节节点（糖葫芦：圆点穿在管上） */}
        {sections.map((sec) => {
          const isActive = active === sec.id
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              aria-current={isActive ? 'true' : undefined}
              aria-label={sec.label}
              className={`group relative z-10 flex items-center justify-end gap-2.5 py-1 pr-[15px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 ${
                isActive ? 'scale-110' : ''
              }`}
            >
              <span
                className={`w-12 text-right text-xs transition-colors ${
                  isActive
                    ? 'font-bold text-blue-700 dark:text-blue-400'
                    : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100'
                }`}
              >
                {sec.label}
              </span>
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive
                    ? 'scale-125 bg-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.6)] ring-4 ring-blue-200/70 dark:bg-blue-400 dark:ring-blue-500/20'
                    : 'bg-white shadow-[inset_0_0_3px_rgba(59,130,246,0.5)] ring-2 ring-slate-300 group-hover:scale-125 group-hover:bg-blue-600 group-hover:ring-blue-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-blue-400'
                }`}
                aria-hidden="true"
              />
            </a>
          )
        })}

        {/* 亮度开关（管底节点，圆形小钮与节点同风格） */}
        <div className="relative z-10 flex items-center justify-end gap-2.5 py-1 pr-[15px]">
          <span className="w-12 text-right text-xs text-slate-400 dark:text-slate-500">主题</span>
          <ThemeToggle placement="left" variant="dot" />
        </div>
      </div>
    </nav>
  )
}
