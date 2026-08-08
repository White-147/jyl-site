import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** 全局错误边界：任一板块渲染异常时显示降级页而不是整站白屏
 *  （此前出现过样式值非法导致整页空白的情况，此为兜底防线） */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('页面渲染错误：', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">页面出了点问题</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">刷新一下就能恢复</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
