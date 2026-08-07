import { profile } from '../data/profile'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

export default function About() {
  return (
    <section id="about" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="关于我" title="AI 应用 · 企业系统 · 数据工程" />

        <div className="mt-12 grid gap-10 lg:grid-cols-5">
          {/* 文字 */}
          <Reveal className="space-y-4 lg:col-span-3">
            {profile.about.map((paragraph) => (
              <p key={paragraph.slice(0, 12)} className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {paragraph}
              </p>
            ))}
          </Reveal>

          {/* 关键数据 */}
          <Reveal delay={120} className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {profile.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="text-2xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
                    {stat.value}
                    {stat.suffix && (
                      <span className="ml-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400">{stat.suffix}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
