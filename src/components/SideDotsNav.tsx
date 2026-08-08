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

/** 右侧玻璃管进度导航：贯穿竖管（光纤质感）+ 糖葫芦节点（圆点穿在管上）+ Dock 放大动效。
 *  hover：文字与节点一起放大（移走恢复）；选中：常驻放大高亮。
 *  最上 = 返回顶部，最下 = 主题下拉。PC/平板显示，移动端由底部 Tab Bar 承担。 */
export default function SideDotsNav() {
  const active = useScrollSpy(sections.map((s) => s.id))

  return (
    <nav
      aria-label="页面章节导航"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 md:flex"
    >
      <div className="relative flex flex-col items-end">
        {/* 玻璃管（糖葫芦的签子）：贯穿近整屏，半透明 + 模糊 + 内发光 */}
        <span
          className="absolute bottom-4 top-4 w-[7px] rounded-full border border-white/60 bg-white/40 shadow-[inset_0_0_6px_rgba(59,130,246,0.4),0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-sm dark:border-white/20 dark:bg-white/10"
          aria-hidden="true"
        />

        {/* 顶部：返回顶部（管顶节点） */}
        <a
          href="#top"
          aria-label="返回顶部"
          className="group relative z-10 mb-1 flex items-center gap-2.5 py-1 pr-3.5 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-blue-700 dark:text-slate-500 dark:group-hover:text-blue-400"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </a>

        {/* 章节节点（文字在管左侧，圆点穿在管上） */}
        <div className="flex flex-col gap-1">
          {sections.map((sec) => {
            const isActive = active === sec.id
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`group relative z-10 flex items-center gap-2.5 py-1 pl-1 pr-3.5 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <span
                  className={`text-xs transition-colors ${
                    isActive
                      ? 'font-bold text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100'
                  }`}
                >
                  {sec.label}
                </span>
                {/* 圆点（糖葫芦）：hover/选中放大 + 光环 */}
                <span
                  className={`shrink-0 rounded-full transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                    isActive
                      ? 'h-3.5 w-3.5 bg-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.6)] ring-4 ring-blue-200/70 dark:bg-blue-400 dark:ring-blue-500/20'
                      : 'h-2.5 w-2.5 bg-white shadow-[inset_0_0_3px_rgba(59,130,246,0.5)] ring-2 ring-slate-300 group-hover:scale-125 group-hover:bg-blue-600 group-hover:ring-blue-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-blue-400'
                  }`}
                  aria-hidden="true"
                />
              </a>
            )
          })}
        </div>

        {/* 底部：亮度开关（主题下拉） */}
        <div className="relative z-10 mt-1">
          <ThemeToggle placement="up" />
        </div>
      </div>
    </nav>
  )
}
