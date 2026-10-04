import { useScrollSpy } from '../hooks/useScrollSpy'
import { useAnchorScroll } from '../hooks/useAnchorScroll'
import { SECTION_IDS, CHAPTERS } from '../data/navigation'

// 移动端空间有限：教育并入「经历」区块，Tab Bar 保持 5 个主 tab；
// 首屏（isChapter: false）不进 Tab Bar，它只参与滚动侦测与右侧导轨；
// 带 href 的条目是跨视图跳转（UE 文档区），也不进 Tab Bar（底部只放"滚到某一段"）。
const tabs = CHAPTERS.filter((s) => s.id !== 'education' && !s.href)

/**
 * 把滚动侦测的结果折算到**本 Tab Bar 真正有的**那几个 tab 上。
 *
 * ⚠️ 修的是什么（2026-10，CDP 实测抓到的"选中位置有点奇怪"）：
 *    侦测返回的是**全部** SECTION_IDS（含 `education`），而本组件把 education 过滤掉了 ——
 *    于是滚到教育背景那 708px 时 `active === 'education'`，没有任何 tab 匹配得上，
 *    结果是**整条 Tab Bar 一个都不亮**（实测 y=9474/9728/9984 三档都是"无高亮"）。
 *    看起来就像"选中的位置很奇怪"。同理，滚到首屏（`#top` 在 Tab Bar 里也没有）时也是空档。
 *
 * 口径：**往上找最近的一个 tab**（教育背景归到「经历」，首屏归到「关于」）——
 *    宁可亮一个"包含关系正确"的邻居，也不要出现空档。教育背景仍然是独立一节
 *    （有 id、`.anchor-offset`、导轨节点，见 Education.tsx），只是底部这一栏放不下。
 */
const TAB_IDS = tabs.map((t) => t.id)
function resolveTab(active: string): string {
  if (TAB_IDS.includes(active)) return active
  const idx = SECTION_IDS.indexOf(active)
  if (idx < 0) return active
  for (let i = idx; i >= 0; i--) {
    if (TAB_IDS.includes(SECTION_IDS[i])) return SECTION_IDS[i]
  }
  return active
}

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
  const rawActive = useScrollSpy(SECTION_IDS)
  const active = resolveTab(rawActive)
  const { onAnchorClick } = useAnchorScroll()

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="移动端导航"
    >
      {/* ⚠️ 2026-10 用户定向：**去掉左右两条边框**（`glass-panel-sides-off`）。
          现象：这一条浮在页面底部，两侧的 1px 竖线正好落在 5 个图标的两端，
          看着像"多画了两道边"（用户原话：「还有个两侧边框，那个看着很奇怪」）。
          只去左右、保留上下：上下那两条是玻璃的"受光/压地"边，去掉整块就不像一块玻璃了；
          而且只去左右时圆角处不会断开（去掉全部四条才会）。
          ⚠️ 用 `glass-panel-sides-off` 这类名而**不是** `border-x-0`：`.glass-panel` 的
             `border` 简写排在 Tailwind 工具类之后，工具类赢不了 —— 详见 index.css 里那条规则的注释
             （`Docs.tsx` 的吸顶条上那组 `border-x-0 border-t-0` 就是这么失效了好几个月的）。 */}
      <div className="glass-panel glass-panel-sides-off pointer-events-auto mx-auto flex max-w-md items-stretch justify-around overflow-hidden rounded-2xl">
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
