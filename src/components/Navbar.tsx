import { useState } from 'react'
import profile from '../data/profile.json'
import { useScrollSpy } from '../hooks/useScrollSpy'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '#about', label: '关于' },
  { href: '#projects', label: '项目' },
  { href: '#skills', label: '技能' },
  { href: '#experience', label: '经历' },
  { href: '#contact', label: '联系' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const active = useScrollSpy(['about', 'projects', 'skills', 'experience', 'education', 'contact'])

  return (
    <header className="sticky top-0 z-50">
      <nav className="mx-auto mt-3 flex h-14 max-w-3xl items-center justify-between rounded-2xl border border-slate-200/70 bg-white/85 px-4 shadow-sm backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/85 sm:px-5">
        {/* 品牌 */}
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

        {/* 桌面导航 */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={active === link.href.slice(1) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active === link.href.slice(1)
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400'
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </div>

        {/* 移动端：主题切换 + 汉堡菜单 */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {open ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* 移动端菜单 */}
      {open && (
        <div className="mx-3 mt-1 rounded-2xl border border-slate-200/70 bg-white px-4 pb-4 pt-2 shadow-sm md:hidden dark:border-slate-800/70 dark:bg-slate-950">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400"
            >
              {link.label}
            </a>
          ))}
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            GitHub ↗
          </a>
        </div>
      )}
    </header>
  )
}
