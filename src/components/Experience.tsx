import { useState } from 'react'
import experienceData from '../data/experience.json'
import type { Experience } from '../data/types'
import { useIsMobile } from '../hooks/useIsMobile'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const experiences = experienceData.experiences as Experience[]

function ExperienceItem({ exp, index }: { exp: Experience; index: number }) {
  // 移动端默认只显示第 1 条要点，减少阅读疲劳；桌面端完整显示
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const collapsed = isMobile && !open
  const shownPoints = collapsed ? exp.points.slice(0, 1) : exp.points
  const hiddenCount = exp.points.length - shownPoints.length

  return (
    <Reveal delay={index * 80}>
      <div className="relative pl-8 sm:pl-10">
        {/* 时间线圆点 */}
        <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-700 ring-4 ring-blue-100 dark:bg-blue-400 dark:ring-blue-500/20" />
        </span>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 sm:p-6 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/60">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{exp.company}</h3>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{exp.role}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {exp.period}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{exp.summary}</p>

          <ul className="mt-3 space-y-1.5">
            {shownPoints.map((point) => (
              <li key={point.slice(0, 16)} className="flex gap-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          {/* 移动端：折叠/展开更多要点 */}
          {isMobile && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 sm:hidden dark:text-blue-400 dark:hover:text-blue-300"
            >
              展开全部要点（{hiddenCount} 条）
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}
          {isMobile && open && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 sm:hidden dark:text-blue-400 dark:hover:text-blue-300"
            >
              收起要点
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Reveal>
  )
}

export default function Experience() {
  return (
    <section id="experience" className="scroll-mt-16 bg-white/70 py-10 sm:py-24 dark:bg-slate-950/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="工作经历"
          title="从业务交付到 AI 工具链"
          description="把规则和需求，转成可执行、可交付的工程结果。"
        />

        <div className="relative mt-12">
          {/* 时间线竖线 */}
          <div
            className="absolute bottom-0 left-[7px] top-0 w-px bg-slate-200 sm:left-[7px] dark:bg-slate-800"
            aria-hidden="true"
          />
          <div className="space-y-10">
            {experiences.map((exp, i) => (
              <ExperienceItem key={exp.company} exp={exp} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
