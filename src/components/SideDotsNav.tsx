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

/** 右侧玻璃进度导航：竖线 + 章节节点（名称常显）+ 当前高亮 + 底部主题切换。
 *  PC/平板显示（顶部导航已由本组件取代），移动端由底部 Tab Bar 承担。 */
export default function SideDotsNav() {
  const active = useScrollSpy(sections.map((s) => s.id))

  return (
    <nav
      aria-label="页面章节导航"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:flex lg:right-6"
    >
      <div className="glass-card-strong relative rounded-2xl px-3 py-3 pl-4">
        {/* 章节进度竖线 */}
        <span
          className="absolute bottom-3 left-[18px] top-3 w-px bg-slate-200 dark:bg-slate-700"
          aria-hidden="true"
        />
        <ul className="flex flex-col gap-1">
          <li>
            <a
              href="#top"
              className="flex items-center gap-2.5 rounded-lg py-1 pr-2 text-xs text-slate-400 transition-colors hover:text-blue-700 dark:text-slate-500 dark:hover:text-blue-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              顶部
            </a>
          </li>
          {sections.map((sec) => {
            const isActive = active === sec.id
            return (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg py-1 pr-2 text-xs transition-colors ${
                    isActive
                      ? 'font-bold text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`rounded-full transition-all duration-300 ${
                      isActive
                        ? 'h-3 w-3 bg-blue-700 ring-4 ring-blue-200 dark:bg-blue-400 dark:ring-blue-500/20'
                        : 'h-2 w-2 bg-slate-300 hover:bg-blue-500 dark:bg-slate-600 dark:hover:bg-blue-400'
                    }`}
                    aria-hidden="true"
                  />
                  {sec.label}
                </a>
              </li>
            )
          })}
        </ul>
        {/* 主题切换（顶部导航移除后，深浅色/自动调节入口） */}
        <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
