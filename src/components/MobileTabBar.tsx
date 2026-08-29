import { useScrollSpy } from '../hooks/useScrollSpy'
import { SECTIONS, SECTION_IDS } from '../data/navigation'

// 移动端空间有限：教育并入「经历」区块，Tab Bar 保持 5 个主 tab
const tabs = SECTIONS.filter((s) => s.id !== 'education')

/** 移动端底部常驻 Tab Bar（2026 主流：可见性 + 拇指区，替代汉堡菜单） */
export default function MobileTabBar() {
  const active = useScrollSpy(SECTION_IDS)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden dark:border-slate-800/70 dark:bg-slate-950/85"
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
                  ? 'text-brand-700 dark:text-cyan-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d={tab.icon} />
              </svg>
              {tab.shortLabel}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
