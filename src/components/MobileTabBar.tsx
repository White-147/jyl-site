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
      {/* ⚠️ 2026-10 用户定向：**面板保留四条边**，两侧竖线的问题不在面板上。
          真正的元凶是**选中项的琥珀色 1px 环**（`.glass-lit-on` 的 box-shadow），
          实测 tab 左边界亮度跳变 +75.9、右边界 +45.2；修法见 `index.css` 的 `.mobile-tab-active`。
          （本组件曾试过 `glass-panel-sides-off` 去掉左右边框，那会让 Tab Bar 丢掉顶部那条受光边，
            与底部 Tab Bar 的玻璃语言不一致，已回退 —— 不要再往这个方向改。） */}
      <div className="glass-panel pointer-events-auto mx-auto flex max-w-md items-stretch justify-around overflow-hidden rounded-2xl">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={(e) => onAnchorClick(e, tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`glass-lit mobile-tab flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'glass-lit-on glass-chip-on mobile-tab-active font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              /**
               * ⚠️⚠️ `data-scroll-lit="off"`：**不要让底部 tab 参与「滚动照亮」**。
               *
               * 这一栏是 `fixed bottom-0`，永远落在视口里、且 5 个 tab 都带 `.glass-lit` ——
               * 于是 `useInViewLight` 的候选集里一直有它们，而靠近页面末尾时，
               * **内容卡片都被"内容末尾"这条线推到锚点上方或下方，tab 却永远稳稳压在视口底部附近**，
               * 结果高亮会选中一个 tab（视觉上就是"什么都没亮"），
               * 真实症状就是用户看到的「联系我部分只亮第一个邮箱 / 教育背景卡住」。
               *
               * 这个属性是 `useInViewLight` 本来就支持的例外机制（用于筛选胶囊与文档区目录，
               * 理由见那边的注释："照亮材质与已选中的分辨不出来"）—— 底部 tab 属于同一族：
               * 它自己的选中态本来就常驻点亮，不该再叠一层"视线所在"。
               */
              data-scroll-lit="off"
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
