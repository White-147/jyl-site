import { useEffect, useState } from 'react'
import profile from '../data/profile.json'
import { contact } from '../data/contact'
import { ThemeToggle } from './ThemeToggle'
import { useDocsRoute } from '../hooks/useDocsRoute'

/**
 * 常驻顶部栏（全端同一根，手机 / 平板 / PC 都显示）。
 *
 * 为什么要有它：把三件「全局操作」从各自为政的位置收敛到一处 ——
 *   1. 返回顶部：原来只在手机端有个浮动圆钮（`BackToTop`，`md:hidden`），
 *      桌面/平板靠右侧玻璃管管外的「返回顶部」文字；
 *   2. 主题：原来渲染在**三处**（手机吸顶胶囊、底部 Tab Bar、玻璃管管底），
 *      而文档区（`#/docs/ue5`）里这三处都不存在，于是文档区完全没有主题入口；
 *   3. 文档入口：原来只有项目区末尾的卡片与页脚。
 * 收敛到顶栏后，右侧玻璃管就只剩「章节节点 + 液柱」一件事（管外两个控件移除）。
 *
 * 材质：`.site-bar`（见 index.css）—— 常驻玻璃浮层，手机档不透明度更高、≥640px 放开透明度。
 * ⚠️ 它是全站**唯一**新的常驻 `backdrop-filter`，之前的 `.mobile-flat-bar` 补丁只管底部 Tab Bar。
 *
 * ⚠️ 联动维护点（详见 docs/联动维护点.md 第 6 条）：本栏是常驻浮层，
 * 高度直接决定锚点停靠位 `scrollTargets.ts` 的取值；改高度必须同步改那三个值。
 */
export default function TopBar() {
  const { isDocs } = useDocsRoute()
  const [showTop, setShowTop] = useState(false)

  // 「返回顶部」只在滚过一屏后出现（贴顶时它没有意义，留着反而占位）
  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setShowTop(window.scrollY > 400))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
    }
  }, [])

  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/70 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'

  return (
    <header className="site-bar sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        {/* 品牌：站点图标（柳建毛草「蒋」字，与 favicon 同源）+ 站名。
            文档区里点它回主站，主站里点它回顶部。
            ⚠️ 空间预算（390px 手机）：品牌图标 28 + 站名 + 控件组四件 ≈ 170px，
               实测「蒋宇龙 · 个人作品集网站」在 text-base 下会把控件挤出屏幕，
               所以手机端用 text-sm、`·` 两侧收紧，≥640px 再放开到 text-lg。 */}
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

        {/* 右侧全局操作组：文档 / 返回顶部 / 主题 / 下载简历。
            顺序按「使用频率 + 视觉重量」排：简历是唯一实底主按钮，放最右收尾。 */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <a
            href="#/docs/ue5"
            title="UE5 学习笔记"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/70 hover:text-brand-700 sm:px-2.5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-brand-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4 4h10a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zm3 3h6M7 11h6M7 15h4" />
            </svg>
            <span className="hidden sm:inline">笔记</span>
          </a>

          {/* 返回顶部：贴顶时隐藏但保留占位（避免右侧按钮组左右跳动）。
              ⚠️ 只在 ≥640px 出现：手机端空间不够（见上面的空间预算），
                 而主页面手机端本来就有底部 Tab Bar 的「关于」可回顶部、文档区篇幅也短。 */}
          <button
            type="button"
            onClick={goTop}
            aria-label="返回顶部"
            title="返回顶部"
            tabIndex={showTop ? 0 : -1}
            aria-hidden={!showTop}
            className={`${iconBtn} hidden sm:flex ${showTop ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
            className="ml-0.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 sm:px-3 dark:bg-brand-700 dark:hover:bg-brand-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            简历
          </a>
        </div>
      </div>
    </header>
  )
}
