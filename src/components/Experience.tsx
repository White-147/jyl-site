import { experiences } from '../data/experience'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

export default function Experience() {
  return (
    <section id="experience" className="scroll-mt-16 bg-white py-20 sm:py-24 dark:bg-slate-950">
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
              <Reveal key={exp.company} delay={i * 80}>
                <div className="relative pl-8 sm:pl-10">
                  {/* 时间线圆点 */}
                  <span
                    className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center"
                    aria-hidden="true"
                  >
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
                      {exp.points.map((point) => (
                        <li key={point.slice(0, 16)} className="flex gap-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
