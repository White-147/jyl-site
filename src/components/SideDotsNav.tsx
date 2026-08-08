import { useScrollSpy } from '../hooks/useScrollSpy'

const sections = [
  { id: 'about', label: '关于' },
  { id: 'projects', label: '项目' },
  { id: 'skills', label: '技能' },
  { id: 'experience', label: '经历' },
  { id: 'education', label: '教育' },
  { id: 'contact', label: '联系' },
]

/** 右侧悬浮章节导航（scroll-spy dots）：长页面定位 + 进度感，PC/平板显示，移动端由底部 Tab Bar 承担 */
export default function SideDotsNav() {
  const active = useScrollSpy(sections.map((s) => s.id))

  return (
    <nav
      aria-label="页面章节导航"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:flex lg:right-6"
    >
      <ul className="flex flex-col items-center gap-1">
        {sections.map((sec) => {
          const isActive = active === sec.id
          return (
            <li key={sec.id} className="group relative">
              <a
                href={`#${sec.id}`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={sec.label}
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? 'h-3.5 w-3.5 bg-blue-700 ring-4 ring-blue-200 dark:bg-blue-400 dark:ring-blue-500/20'
                    : 'h-2.5 w-2.5 bg-slate-300 hover:bg-blue-500 dark:bg-slate-600 dark:hover:bg-blue-400'
                }`}
              />
              {/* hover 显示章节名 */}
              <span
                className={`pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200/70 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 opacity-0 shadow-sm backdrop-blur transition-opacity duration-200 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 ${
                  isActive ? '!opacity-100' : ''
                }`}
              >
                {sec.label}
              </span>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
