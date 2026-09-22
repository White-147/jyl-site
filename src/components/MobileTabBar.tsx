import { useScrollSpy } from '../hooks/useScrollSpy'
import { useAnchorScroll } from '../hooks/useAnchorScroll'
import { CHAPTERS, SECTION_IDS } from '../data/navigation'

// 移动端空间有限：教育并入「经历」区块，Tab Bar 保持 5 个主 tab；
// 首屏（isChapter: false）不进 Tab Bar，它只参与滚动侦测与右侧导轨
const tabs = CHAPTERS.filter((s) => s.id !== 'education')

/** 移动端底部常驻 Tab Bar（2026 主流：可见性 + 拇指区，替代汉堡菜单） */
export default function MobileTabBar() {
  const active = useScrollSpy(SECTION_IDS)
  const { onAnchorClick } = useAnchorScroll()

  return (
    // `mobile-flat-bar`：<768px 关掉 backdrop-blur（见 index.css 该类的注释）。
    // 本栏常驻屏幕底部，模糊是持续的逐帧开销；靠提高底色不透明度维持可读性。
    <nav
      className="mobile-flat-bar fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden dark:border-slate-800/70 dark:bg-slate-950/95"
      aria-label="移动端导航"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={(e) => onAnchorClick(e, tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-brand-700 dark:text-brand-200'
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
