import { useEffect, useRef, useState } from 'react'

/**
 * 轻量吐司提示：用于「已复制」这类一次性反馈。
 * 自动消失（默认 2.2s），`prefers-reduced-motion` 下不做位移只做淡入淡出。
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (message === null) return
    const timer = window.setTimeout(() => setMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [message])

  return { message, show: setMessage }
}

export function Toast({ message }: { message: string | null }) {
  if (message === null) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 md:bottom-10"
    >
      <span className="animate-toast-in rounded-full border border-brand-200/60 bg-brand-700 px-4 py-2 text-xs font-semibold text-white shadow-lg dark:border-brand-400/30 dark:bg-brand-700">
        {message}
      </span>
    </div>
  )
}

/**
 * 复制文本到剪贴板，返回是否成功。
 * 优先 Clipboard API（需安全上下文：https / localhost）；
 * GitHub Pages 是 https，本地 http 预览会退化到 execCommand 兜底。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 落到兜底方案 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** 复制按钮的通用逻辑：复制 + 反馈，返回是否正在显示「已复制」 */
export function useCopyFeedback(text: string, onResult?: (message: string) => void) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    const ok = await copyText(text)
    setCopied(ok)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
    onResult?.(ok ? '邮箱已复制到剪贴板' : '复制失败，请手动选中邮箱')
    return ok
  }

  return { copied, copy }
}
