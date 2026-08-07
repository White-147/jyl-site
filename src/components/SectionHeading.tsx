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
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </Reveal>
  )
}
