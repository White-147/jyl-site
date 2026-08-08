import { useScrollSpy } from '../hooks/useScrollSpy'

const tabs = [
  { id: 'about', label: '关于', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  { id: 'projects', label: '项目', icon: 'M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm0 12H4V8h16v10zM9 10h2v2H9v-2zm0 4h6v2H9v-2z' },
  { id: 'skills', label: '技能', icon: 'M13 2 3 14h7l-1 8 10-12h-7l1-8z' },
  { id: 'experience', label: '经历', icon: 'M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z' },
  { id: 'contact', label: '联系', icon: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z' },
]

/** 移动端底部常驻 Tab Bar（2026 主流：可见性 + 拇指区，替代汉堡菜单） */
export default function MobileTabBar() {
  const active = useScrollSpy(tabs.map((t) => t.id))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-slate-800/70 dark:bg-slate-950/85"
      aria-label="移动端导航"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
