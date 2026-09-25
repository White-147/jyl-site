import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * 主题状态（全站单一来源）。
 *
 * ⚠️ 为什么要有这个 Provider（见 docs/联动维护点.md 第 3 条）
 * `ThemeToggle` 会出现**两个实例**（常驻顶栏 `TopBar` 与移动端底部 `MobileTabBar`）。
 * 之前每个实例各自持有 `useState`，靠 `localStorage` 间接同步 —— 没有订阅机制，
 * 一处切换另一处不会重渲染，理论上会漂移（实际未复现，但属隐患）。
 * 现在提升为 Context：两个实例消费同一份状态，不可能不一致。
 * 2026-09 起顶栏是**全端常驻**的，两种视图（主页面 / UE 文档区）都挂在同一个 Provider 下，
 * 所以文档区也能切主题 —— 这正是之前缺控件导致的问题。
 *
 * 另外把 `theme-color` 的同步也收在这里，只写**一个** meta 标签。
 * 旧实现是两个带 `media="(prefers-color-scheme: …)"` 的 meta + JS 覆写两者，
 * 手动选深色而系统是浅色时，媒体查询会挑走另一份，状态栏与页面脱色。
 * 单一 meta + 全 JS 控制消除了这个竞态（媒体查询仍可由 JS 读取系统值）。
 */

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'theme'

/** 画布色：与 src/index.css 的 body 背景、index.html 的 theme-bg-inline 三处必须一致。
 *  ⚠️ 2026-09 第十一轮暖调转向：由冷白/冷黑改为暖白/暖黑。**改这里必须同步改另外两处**。 */
const CANVAS = { light: '#fbf8f3', dark: '#15120f' } as const

export const MODES: ThemeMode[] = ['auto', 'light', 'dark']

export const MODE_META: Record<ThemeMode, { label: string; desc: string }> = {
  auto: { label: '自动', desc: '跟随系统深浅色' },
  light: { label: '浅色', desc: '始终浅色' },
  dark: { label: '深色', desc: '始终深色' },
}

function readStored(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

interface ThemeContextValue {
  /** 用户选择的模式：auto / light / dark */
  mode: ThemeMode
  /** 实际生效的深色与否 */
  isDark: boolean
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStored)
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  // 监听系统深浅色变化（仅 auto 模式下影响结果，但始终订阅以便切回 auto 时立即正确）
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = mode === 'dark' || (mode === 'auto' && systemDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    // 单一 theme-color：改为由 JS 全权决定，去掉媒体的选择竞态
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', isDark ? CANVAS.dark : CANVAS.light))
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [isDark, mode])

  const setMode = useCallback((next: ThemeMode) => setModeState(next), [])

  const value = useMemo(() => ({ mode, isDark, setMode }), [mode, isDark, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 必须在 <ThemeProvider> 内使用')
  return ctx
}
