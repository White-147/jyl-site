import { useEffect, useState } from 'react'
import profile from '../data/profile.json'
import { contact } from '../data/contact'
import { ThemeToggle } from './ThemeToggle'
import { useDocsRoute } from '../hooks/useDocsRoute'

/**
 * 常驻顶部栏（全端同一根，手机 / 平板 / PC 都显示）。
 *
 * 布局（2026-09 定稿）：**左侧只有品牌，右侧四个控件**。
 *   章节导航不进顶栏 —— 它由右侧玻璃进度栏（≥768px）与手机底部 Tab Bar 承担，
 *   顶栏只做"全局操作"，职责单一。
 *
 * 为什么要有它：把四件全局操作从各自为政的位置收敛到一处 ——
 *   1. 返回顶部：原来只在手机端有个浮动圆钮（`BackToTop`，`md:hidden`）；
 *   2. 主题：原来渲染在**三处**（手机吸顶胶囊、底部 Tab Bar、玻璃管管底），
 *      而文档区（`#/docs/ue5`）里这三处都不存在，于是文档区完全没有主题入口；
 *   3. 文档入口与简历下载：原来只在页面中段/首屏与页脚。
 * 收敛后右侧玻璃管就只剩「章节节点 + 液柱」一件事。
 *
 * 材质：`.site-bar`（整宽玻璃，见 index.css）—— 贴顶时接近透明，滚动后加深一档。
 *
 * ⚠️ 控件组的"统一"口径（用户明确要求"格式统一、不要方钮"）：
 *   四个控件**共用** `.bar-control` 一个类：静置无底无边框，hover/focus 才浮出玻璃底。
 *   差别只有"有没有文字"（返回顶部 / 主题是纯图标，笔记 / 简历带文字），
 *   这是语义需要，不是样式不一致。历史上主题钮带持久边框、另外两个没有，那才是真的不统一。
 *   ⚠️ 不要给其中任何一个单独加实底/边框：那会立刻破坏这一组的整体感。
 *
 * ⚠️ 联动维护点（见 docs/联动维护点.md 第 6 条）：本栏高度直接决定锚点停靠位
 *   `scrollTargets.ts` 的取值与 `.rail-tube` 的起点；改 h-16 必须同步改那两处。
 */
export default function TopBar() {
  const { isDocs } = useDocsRoute()
  const [showTop, setShowTop] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // 两个滚动状态：
  //   showTop  —— 「返回顶部」滚过一屏才出现（贴顶时它没有意义）
  //   scrolled —— 顶栏材质换档（贴顶时更透，滚动后加深以保住文字对比度）
  // 合并到同一个 rAF 里，避免两次布局读取（与站内其它滚动侦听同一原则）。
  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setShowTop(y > 400)
        setScrolled(y > 8)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
    }
  }, [])

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <header className={`site-bar sticky top-0 z-50 ${scrolled ? 'is-scrolled' : ''}`}>
      {/* ⚠️ 整宽而不是 max-w-6xl：1200px 级容器在 1440 视口上会留下两侧各 137px 空白，
          参考站（韶远 / 米游社 / 因缘精灵）的内容都是撑满 + 固定左右留白。
          上限取 112rem（1792px）是为了超宽屏不把品牌与控件甩到两端。 */}
      <div className="mx-auto flex h-16 max-w-[112rem] items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* 品牌：站点图标（柳建毛草「蒋」字，与 favicon 同源）+ 站名。
            文档区里点它回主站，主站里点它回顶部。
            ⚠️ 品牌名在手机端**保留完整**（用户明确要求），因此右侧控件的文字在 <640px 收起，
               只留图标 —— 空间账见下面 controls 的注释。 */}
        <a
          href={isDocs ? '#/docs' : '#top'}
          onClick={
            isDocs
              ? undefined
              : (e) => {
                  // 主站内：走平滑回顶（原生锚点在布局收敛期会少滚一段，见 useAnchorScroll 的说明）
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                  e.preventDefault()
                  history.replaceState(null, '', location.pathname + location.search)
                  goTop()
                }
          }
          className="flex min-w-0 items-center gap-2"
        >
          <img
            src="images/icon-jiang-192.png"
            alt=""
            width={192}
            height={192}
            className="h-7 w-7 shrink-0 rounded-md object-contain"
          />
          <span className="font-display truncate text-sm font-normal tracking-tight text-ink sm:text-lg dark:text-ink-light">
            {profile.name}
            <span className="mx-0.5 text-slate-400 dark:text-slate-500">·</span>
            个人作品集网站
          </span>
        </a>

        {/* 右侧控件组：笔记 / 返回顶部 / 主题 / 简历。
            空间账（390px 手机）：品牌 ≈204 + 笔记 36 + 返回顶部 36 + 主题 36 + 简历 36 + padding 32 = 380，
            刚好卡进 390 —— 所以 <640px 时"笔记/简历"的文字收起（只留图标，由 title 与 aria-label 提供提示），
            ≥640px 再显示文字。若将来品牌名变长或要加第五个控件，必须重新算这笔账。 */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <a
            href="#/docs/ue5"
            title="UE5 学习笔记"
            aria-label="UE5 学习笔记"
            className="bar-control"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5" aria-hidden="true">
              <path d="M4 4h10a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zm3 3h6M7 11h6M7 15h4" />
            </svg>
            <span className="hidden sm:inline">笔记</span>
          </a>

          {/* 返回顶部：贴顶时隐藏但保留占位（避免右侧按钮组左右跳动） */}
          <button
            type="button"
            onClick={goTop}
            aria-label="返回顶部"
            title="返回顶部"
            tabIndex={showTop ? 0 : -1}
            aria-hidden={!showTop}
            className={`bar-control ${showTop ? '' : 'pointer-events-none opacity-0'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>

          <ThemeToggle />

          <a
            href={contact.resumeUrl}
            download
            title="下载简历（PDF）"
            aria-label="下载简历（PDF）"
            className="bar-control"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="hidden sm:inline">简历</span>
          </a>
        </div>
      </div>
    </header>
  )
}
