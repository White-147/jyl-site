import educationData from '../data/education.json'
import type { EducationData } from '../data/types'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const education = educationData.education as EducationData

export default function Education() {
  return (
    <section id="education" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="教育背景" title="教育经历与证书" />

        {/* 学校信息 */}
        <Reveal className="mt-12">
          <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:border-slate-800 dark:bg-slate-800">
            <div className="flex items-center gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <path d="M22 10 12 5 2 10l10 5 10-5z" />
                  <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{education.school}</h3>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{education.degree}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {education.period} · {education.location}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 证书与荣誉 */}
        <Reveal delay={100} className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">证书证明</h3>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">点击图片可查看原件</span>
            </div>

            {/* 证书墙：缩略图卡片，点击新窗口验真 */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {education.certs.map((cert) => (
                <a
                  key={cert.name}
                  href={cert.image}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/60"
                >
                  <div className="overflow-hidden bg-white dark:bg-slate-950">
                    <img
                      src={cert.image}
                      alt={`${cert.name} 证明`}
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="px-3 py-2.5 text-center text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    {cert.name}
                  </p>
                </a>
              ))}
            </div>

            {/* 竞赛荣誉 */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">竞赛荣誉</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {education.awards.map((award) => (
                  <li key={award.slice(0, 12)} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden="true" />
                    {award}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
