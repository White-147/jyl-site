import type { ReactNode } from 'react'
import Reveal from './Reveal'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: ReactNode
}

export default function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-700 dark:text-cyan-400">
        {eyebrow}
      </p>
      <h2 className="font-display mt-2 text-3xl font-normal leading-[1.15] tracking-tight text-ink text-balance dark:text-ink-light">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </Reveal>
  )
}
