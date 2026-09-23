import { useEffect, useRef, useState } from 'react'
import { MODE_META, MODES, useTheme, type ThemeMode } from '../hooks/useTheme'

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
 *  placement: up/down/left（下拉弹出方向）；variant: square 方钮 / dot 圆形小钮 / row 整行
 *
 *  ⚠️ 本组件**不持有**主题 state（见 docs/联动维护点.md 第 3 条）。
 *  状态与 `theme-color` 同步统一由 `useTheme()` 提供，多个实例（顶栏 + 底部 Tab Bar）
 *  读的是同一个 Provider，不可能不一致。
 *
 *  ⚠️ 2026-09：`export` 而不是 `export default` —— 与项目里其它组件统一，
 *  避免出现「有的默认导出、有的具名导出」两套写法。 */
export function ThemeToggle({
  placement = 'down',
  variant = 'square',
  label,
}: {
  placement?: 'up' | 'down' | 'left'
  variant?: 'square' | 'dot' | 'row'
  label?: string
}) {
  const { mode, setMode } = useTheme()
  const [open, setOpen] = useState(false)

  // 点击外部关闭下拉。
  //
  // ⚠️ 这里有个 React 事件模型的坑（2026-09 实测修掉）：
  // React 17+ 把合成事件挂在 #root 容器上，**冒泡阶段的 document 监听器反而先于**
  // 菜单项的 onClick 执行（document 比 #root 浅），于是 `setOpen(false)` 会先把菜单卸载，
  // 用户点「浅色」什么都不会发生 —— 表现为"菜单能开、选项点了没反应"。
  // 修法：监听器挂**捕获阶段**（在任何合成事件之前执行），并且**判断点击目标是否在菜单内**：
  //   菜单内 → 交给菜单项自己的 onClick（先 setMode 再 setOpen(false)）
  //   菜单外 → 关闭
  // 注意菜单内的 stopPropagation 拦不住捕获阶段的监听器，所以必须做目标判断，不能只靠 stopPropagation。
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    return () => document.removeEventListener('click', onDocClick, true)
  }, [open])

  const menu = (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 w-36 overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 ${
        placement === 'left'
          ? 'bottom-0 right-full mr-2'
          : placement === 'up'
            ? 'bottom-full right-0 mb-2'
            : 'top-full right-0 mt-2'
      }`}
      role="menu"
      aria-label="选择主题模式"
    >
      {MODES.map((m) => {
        const isCurrent = m === mode
        return (
          <button
            key={m}
            type="button"
            role="menuitemradio"
            aria-checked={isCurrent}
            onClick={() => {
              setMode(m)
              setOpen(false)
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
              isCurrent
                ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <ModeIcon mode={m} className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              <span className="block leading-tight">{MODE_META[m].label}</span>
              <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-400">
                {MODE_META[m].desc}
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
  )

  if (variant === 'row') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          aria-label={`主题：${MODE_META[mode].label}（${MODE_META[mode].desc}），点击选择`}
          aria-expanded={open}
          className="group flex items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:var(--ease-out-sharp)] hover:scale-110"
        >
          {label && (
            <span className="w-14 text-right text-xs text-slate-400 transition-colors group-hover:text-brand-700 dark:text-slate-400 dark:group-hover:text-brand-200">
              {label}
            </span>
          )}
          <ModeIcon
            mode={mode}
            className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-brand-700 dark:text-slate-400 dark:group-hover:text-brand-200"
          />
        </button>
        {open && menu}
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
        aria-label={`主题：${MODE_META[mode].label}（${MODE_META[mode].desc}），点击选择`}
        title={`主题：${MODE_META[mode].label}（${MODE_META[mode].desc}）`}
        aria-expanded={open}
        className={`inline-flex items-center justify-center text-slate-600 transition-all duration-200 [transition-timing-function:var(--ease-out-sharp)] hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-200 ${
          variant === 'dot'
            ? 'h-4 w-4 hover:scale-110'
            : 'h-9 w-9 rounded-lg border border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500'
        }`}
      >
        <ModeIcon mode={mode} className={variant === 'dot' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
      </button>
      {open && menu}
    </div>
  )
}
