import { useEffect, type ReactNode } from 'react'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
  /** 底部操作区（如名称、跳转按钮、关闭按钮） */
  children?: ReactNode
}

/** 通用灯箱：项目截图、证书、奖项图片统一使用；支持 ESC / 点遮罩 / 点 ✕ 关闭 */
export default function Lightbox({ src, alt, onClose, children }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} className="max-h-[78vh] w-auto rounded-lg shadow-2xl" />
        {children && <div className="mt-4 flex flex-wrap items-center justify-between gap-3">{children}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭放大视图"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
