import { useEffect, useRef, type ReactNode } from 'react'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
  /** 底部操作区（如名称、跳转按钮、关闭按钮） */
  children?: ReactNode
  /**
   * 面板最大宽度类名。默认 `max-w-4xl`（项目截图够用）。
   * ⚠️ 必须写成**完整类名字面量**（如 `max-w-6xl`）——Tailwind 是扫描源码生成 CSS，
   * 拼出来的类名不会被生成（docs 区的 UE 截图是编辑器全屏截图，需要更宽的灯箱）。
   */
  maxWidthClass?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 通用灯箱：项目截图、证书、奖项图片统一使用；支持 ESC / 点遮罩 / 点 ✕ 关闭。
 *
 *  焦点管理（WCAG 2.2）：打开时记住触发元素并把焦点移入对话框，
 *  打开期间 Tab 在对话框内循环（不穿透到遮罩后的页面），
 *  关闭后把焦点归还给触发元素。 */
export default function Lightbox({ src, alt, onClose, children, maxWidthClass = 'max-w-4xl' }: LightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // 面板本身不可聚焦时（没有可聚焦子元素）先聚焦容器，保证焦点一定进入对话框
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      // 可聚焦集合 = 弹层内容 + 关闭按钮（关闭按钮是 overlay 的直接子元素，不在面板内）
      const overlay = overlayRef.current
      if (!overlay) return
      const items = Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      const inside = active instanceof HTMLElement && overlay.contains(active)
      if (!inside) {
        e.preventDefault()
        firstEl.focus()
        return
      }
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    // 打开期间锁掉背景滚动，避免滚动位置在关闭后跳变
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previousFocus.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative max-h-full ${maxWidthClass} outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt={alt} className="max-h-[78vh] w-auto rounded-lg shadow-2xl" />
        {children && <div className="mt-4 flex flex-wrap items-center justify-between gap-3">{children}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭放大视图"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
