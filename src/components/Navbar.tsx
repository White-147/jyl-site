import profile from '../data/profile.json'
import ThemeToggle from './ThemeToggle'

/** 移动端顶部胶囊导航（md:hidden）：仅品牌 + 主题切换；
 *  区块导航由底部 Tab Bar（移动端）与右侧玻璃管导航（PC）承担 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 md:hidden">
      <nav className="mx-auto mt-3 flex h-14 max-w-3xl items-center justify-between rounded-2xl border border-slate-200/70 bg-white/85 px-4 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/85 sm:px-5">
        {/* 品牌 */}
        <a href="#top" className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <img
            src="images/logo-jyl.png"
            alt="JYL"
            width={839}
            height={463}
            className="h-6 w-auto object-contain"
          />
          <span className="hidden sm:inline">{profile.name}</span>
        </a>

        {/* 仅主题切换（区块导航由底部 Tab Bar 承担） */}
        <ThemeToggle />
      </nav>
    </header>
  )
}
