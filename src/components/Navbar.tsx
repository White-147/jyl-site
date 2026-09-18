import profile from '../data/profile.json'
import { useAnchorScroll } from '../hooks/useAnchorScroll'
import ThemeToggle from './ThemeToggle'

/** 移动端顶部胶囊导航（md:hidden）：仅品牌 + 主题切换；
 *  区块导航由底部 Tab Bar（移动端）与右侧玻璃管导航（PC）承担 */
export default function Navbar() {
  const { onAnchorClick } = useAnchorScroll()

  return (
    <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] md:hidden">
      <nav className="mx-auto mt-3 flex h-14 max-w-3xl items-center justify-between rounded-2xl border border-slate-200/70 bg-white/85 px-4 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/85 sm:px-5">
        {/* 品牌：站点图标 + 名字。
            图标是石墨圆角块 + 琥珀「蒋」字，与浏览器标签页同一个标记；
            名字用展示字体，跟随主题色，因此不需要为深浅两套各出一张图。
            修正：原先是「横版字标图 + `hidden sm:inline` 的名字」，
            而本导航是 `md:hidden`，于是 640–768px 之外根本看不到名字，
            手机端只剩一张 24px 高、读不出来的字标图。 */}
        <a
          href="#top"
          onClick={(e) => onAnchorClick(e, 'top')}
          className="flex items-center gap-2 text-lg font-bold text-ink dark:text-ink-light"
        >
          <img
            src="images/icon-jiang-192.png"
            alt=""
            width={192}
            height={192}
            className="h-7 w-7 rounded-md object-contain"
          />
          <span className="font-display text-lg font-normal">{profile.name}</span>
        </a>

        {/* 仅主题切换（区块导航由底部 Tab Bar 承担） */}
        <ThemeToggle />
      </nav>
    </header>
  )
}
