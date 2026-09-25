import { useScrollSpy } from '../hooks/useScrollSpy'
import { useAnchorScroll } from '../hooks/useAnchorScroll'
import { CHAPTERS, SECTION_IDS } from '../data/navigation'

// 移动端空间有限：教育并入「经历」区块，Tab Bar 保持 5 个主 tab；
// 首屏（isChapter: false）不进 Tab Bar，它只参与滚动侦测与右侧导轨；
// 带 href 的条目是跨视图跳转（UE 文档区），也不进 Tab Bar（底部只放"滚到某一段"）。
const tabs = CHAPTERS.filter((s) => s.id !== 'education' && !s.href)

/** 移动端底部常驻 Tab Bar（章节跳转）。
 *
 *  ⚠️ 2026-09 改版：只在**手机**出现（顶栏已改为全端常驻，两者在手机端同时存在，
 *  顶栏管全局操作、本栏管章节跳转）。视觉上从「满宽白条」改为**同材质的浮动胶囊**，
 *  与顶栏成为一套语言 —— 原来的满宽纯色条正是"太传统"的那个观感。
 *
 *  ⚠️ 高度与占位**故意不变**（`min-h-14` 的条目 + 安全区）：`#contact` 末尾的收尾呼吸区
 *  是按"页面最大滚动量"校准过的（见 docs/联动维护点.md 第 6 条），改高度会让它滚不到停靠位。
 *  浮动胶囊用 `pb-[env(safe-area-inset-bottom)]` 保留安全区，容器高度因此与改版前一致。
 */
export default function MobileTabBar() {
  const active = useScrollSpy(SECTION_IDS)
  const { onAnchorClick } = useAnchorScroll()

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="移动端导航"
    >
      <div className="glass-panel pointer-events-auto mx-auto flex max-w-md items-stretch justify-around overflow-hidden rounded-2xl">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={(e) => onAnchorClick(e, tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`glass-lit flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'glass-lit-on glass-chip-on font-semibold'
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
