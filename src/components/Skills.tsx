import skillsData from '../data/skills.json'
import type { SkillGroup } from '../data/types'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const skillGroups = skillsData.skillGroups as SkillGroup[]

export default function Skills() {
  return (
    <section id="skills" className="relative scroll-mt-16 py-10 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="技能区"
          title="跨端、跨栈的工程能力"
          description="按工程领域分组展示，均为真实工作与项目中实际使用过的技术。"
        />

        <div className="mt-12 space-y-5">
          {skillGroups.map((group, i) => (
            <Reveal key={group.title} delay={(i % 2) * 80} className="reveal-group">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300 sm:p-7 dark:border-slate-800 dark:bg-slate-800 dark:hover:border-blue-500/60">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{group.title}</h3>
                </div>
                {/* chips 逐个交错浮现（见 index.css .reveal-group .chip） */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item, j) => (
                    <span
                      key={item}
                      style={{ transitionDelay: `${j * 30}ms` }}
                      className="chip rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:via-70% dark:to-slate-950/70 dark:text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
