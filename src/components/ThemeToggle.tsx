import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

const MODES: ThemeMode[] = ['auto', 'light', 'dark']

const MODE_META: Record<ThemeMode, { label: string; desc: string }> = {
  auto: { label: '自动', desc: '跟随系统深浅色' },
  light: { label: '浅色', desc: '始终浅色' },
  dark: { label: '深色', desc: '始终深色' },
}

function ModeIcon({ mode, className }: { mode: ThemeMode; className?: string }) {
  return mode === 'light' ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ) : mode === 'dark' ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

/** 三态主题切换（下拉三选一）：自动（默认，跟随系统）/ 浅色 / 深色。
 *  placement: up/down/left（下拉弹出方向）；variant: square 方钮 / dot 圆形小钮 */
export default function ThemeToggle({
  placement = 'down',
  variant = 'square',
  label,
}: {
  placement?: 'up' | 'down' | 'left'
  variant?: 'square' | 'dot' | 'row'
  label?: string
}) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('theme')
      return saved === 'light' || saved === 'dark' ? saved : 'auto'
    } catch {
      return 'auto'
    }
  })
  const [open, setOpen] = useState(false)

  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  // 监听系统深浅色变化（自动模式下实时跟随）
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = theme === 'dark' || (theme === 'auto' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    // 移动端状态栏/地址栏配色跟随站点主题（meta theme-color）
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute('content', dark ? '#04121a' : '#f6faf9')
    })
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [dark, theme])

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  if (variant === 'row') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          aria-label={`主题：${MODE_META[theme].label}（${MODE_META[theme].desc}），点击选择`}
          aria-expanded={open}
          className="group flex items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
        >
          {label && (
            <span className="w-14 text-right text-xs text-slate-400 transition-colors group-hover:text-brand-700 dark:text-slate-500 dark:group-hover:text-cyan-400">
              {label}
            </span>
          )}
          <ModeIcon
            mode={theme}
            className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-brand-700 dark:text-slate-400 dark:group-hover:text-cyan-400"
          />
        </button>

        {open && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-50 w-36 overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 ${
              placement === 'left' ? 'bottom-0 right-full mr-2' : placement === 'up' ? 'bottom-full right-0 mb-2' : 'top-full right-0 mt-2'
            }`}
            role="menu"
            aria-label="选择主题模式"
          >
            {MODES.map((mode) => {
              const isCurrent = mode === theme
              return (
                <button
                  key={mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  onClick={() => {
                    setTheme(mode)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                    isCurrent
                      ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-cyan-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <ModeIcon mode={mode} className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    <span className="block leading-tight">{MODE_META[mode].label}</span>
                    <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                      {MODE_META[mode].desc}
                    </span>
                  </span>
                  {isCurrent && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label={`主题：${MODE_META[theme].label}（${MODE_META[theme].desc}），点击选择`}
        title={`主题：${MODE_META[theme].label}（${MODE_META[theme].desc}）`}
        aria-expanded={open}
        className={`inline-flex items-center justify-center text-slate-600 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:text-brand-700 dark:text-slate-300 dark:hover:text-cyan-400 ${
          variant === 'dot'
            ? 'h-4 w-4 hover:scale-110'
            : 'h-9 w-9 rounded-lg border border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500'
        }`}
      >
        <ModeIcon mode={theme} className={variant === 'dot' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 w-36 overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 ${
            placement === 'up'
              ? 'bottom-full right-0 mb-2'
              : placement === 'left'
                ? 'bottom-0 right-full mr-2'
                : 'top-full right-0 mt-2'
          }`}
          role="menu"
          aria-label="选择主题模式"
        >
          {MODES.map((mode) => {
            const isCurrent = mode === theme
            return (
              <button
                key={mode}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => {
                  setTheme(mode)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                  isCurrent
                    ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-cyan-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <ModeIcon mode={mode} className="h-4 w-4 shrink-0" />
                <span className="flex-1">
                  <span className="block leading-tight">{MODE_META[mode].label}</span>
                  <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    {MODE_META[mode].desc}
                  </span>
                </span>
                {isCurrent && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
