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
    // ⚠️ 外层这个 div 只负责给下拉菜单提供定位上下文（`absolute` 相对它）。
    //    它必须是 `inline-flex`：默认的块级 div 会撑满父容器高度，
    //    在顶栏那一组 flex 里量出来就成了 64px 高而不是按钮的 36px（实测踩过）。
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label={`主题：${MODE_META[mode].label}（${MODE_META[mode].desc}），点击选择`}
        title={`主题：${MODE_META[mode].label}（${MODE_META[mode].desc}）`}
        aria-expanded={open}
        // ⚠️ 顶栏实例（square）走 `.bar-control`：静置无底无边框，与笔记/返回顶部/简历同一材质。
        //    历史上这里写的是「白底 + 1px 边框」，在顶栏那一组里是**唯一**带持久底与边框的控件，
        //    正是用户反馈的"右侧图标格式不统一"的根源。不要改回去。
        //    传了 `label` 时按钮显示「图标 + **当前模式名**」——这既是四个控件格式统一所需，
        //    也让"当前是自动/浅色/深色"不必点开菜单就能看到。
        //    `dot` 变体是独立的小圆点样式（另有用途），不参与顶栏统一。
        className={
          variant === 'dot'
            ? 'inline-flex h-4 w-4 items-center justify-center text-slate-600 transition-transform duration-200 hover:scale-110 dark:text-slate-300'
            : 'bar-control'
        }
      >
        {/* ⚠️ 与笔记/简历/顶部三个控件一致：第一个子元素是 `.bar-sheen`（玻璃底 + 静置/悬停面光）。
            `dot` 变体不走 `.bar-control`，因此也不渲染它。 */}
        {variant !== 'dot' && <span aria-hidden="true" className="bar-sheen" />}
        <ModeIcon mode={mode} className={variant === 'dot' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
        {/* ⚠️ 文字必须包在 `hidden sm:inline` 里：手机上四个控件要同一形态（纯图标 34px），
            否则主题钮因为显示「自动/浅色/深色」而比别人宽一倍（实测 66px vs 34px）。
            这是它与其他三个控件唯一需要特别处理的地方。 */}
        {variant !== 'dot' && label && <span className="hidden sm:inline">{MODE_META[mode].label}</span>}
      </button>
      {open && menu}
    </div>
  )
}
