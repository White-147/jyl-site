import type { ReactNode } from 'react'
import { CHAPTERS } from '../data/navigation'
import Reveal from './Reveal'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: ReactNode
  /** 区块序号（用于右侧编号，缺省时按正文章节顺序自动取） */
  index?: number
}

/**
 * 区块标题组：编辑式非对称版式。
 *
 * 左侧是眉题 + 标题 + 说明（max-w-2xl，保证中文标题不被拉成超长行），
 * 右侧是区块编号（01 / 06 形式）+ 一条延伸到容器右缘的发丝线。
 * 这样标题行在视觉上横跨整个内容宽度，不再留下近一半的空白右区；
 * 编号与线同时起到「这是第几段、共几段」的索引作用，不额外占用垂直空间。
 */
export default function SectionHeading({ eyebrow, title, description, index }: SectionHeadingProps) {
  // 编号只覆盖**正文章节**（CHAPTERS）。首屏在 SECTIONS 里排第一但 isChapter: false，
  // 它不参与编号，所以总数是 CHAPTERS.length 而不是 SECTIONS.length。
  const total = CHAPTERS.length
  const found = CHAPTERS.findIndex((s) => s.label === eyebrow)
  const current = index ?? (found >= 0 ? found + 1 : undefined)

  return (
    <Reveal>
      <div className="flex items-start gap-6 sm:gap-10">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
            {eyebrow}
          </p>
          <h2 className="font-display mt-2 text-3xl font-normal leading-[1.15] tracking-tight text-ink text-balance dark:text-ink-light">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
          )}
        </div>

        {/* 右侧编号 + 延伸发丝线：补足标题行的横向跨度 */}
        <div className="hidden flex-1 items-center gap-4 pt-2.5 sm:flex" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-700" />
          {current !== undefined && (
            <span className="shrink-0 font-mono text-sm tracking-widest text-slate-500 tabular-nums dark:text-slate-400">
              {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </Reveal>
  )
}
