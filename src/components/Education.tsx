import { useState } from 'react'
import educationData from '../data/education.json'
import type { CertItem, EducationData } from '../data/types'
import Lightbox from './Lightbox'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const education = educationData.education as EducationData

/** 证明卡片：点击放大查看（灯箱，与项目截图交互一致） */
function ProofCard({ item, onOpen }: { item: CertItem; onOpen: (item: CertItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`放大查看 ${item.name} 证明`}
      title="点击查看证明图片"
      className="glass-card group flex w-full cursor-zoom-in items-center gap-4 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-500/60"
    >
      {/* 缩略图：辅助证明，点击放大查看原件 */}
      <img
        src={item.image}
        alt={`${item.name} 证明缩略图`}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-105 dark:ring-slate-600"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
          {item.name}
        </span>
        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">点击查看证明图片</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
      </svg>
    </button>
  )
}

export default function Education() {
  const [viewing, setViewing] = useState<CertItem | null>(null)

  return (
    <section id="education" className="relative scroll-mt-16 py-10 sm:py-24">
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

        {/* 证书 */}
        <Reveal delay={80} className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">证书</h3>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">点击图片可放大查看</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              {education.certs.map((cert) => (
                <ProofCard key={cert.name} item={cert} onOpen={setViewing} />
              ))}
            </div>
          </div>
        </Reveal>

        {/* 奖项 */}
        <Reveal delay={160} className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">奖项</h3>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">点击图片可放大查看</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              {education.awards.map((award) => (
                <ProofCard key={award.name} item={award} onOpen={setViewing} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* 证书/奖项灯箱 */}
      {viewing && (
        <Lightbox src={viewing.image} alt={`${viewing.name}（放大）`} onClose={() => setViewing(null)}>
          <p className="text-sm font-medium text-slate-200">{viewing.name}</p>
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="rounded-lg border border-slate-500 px-3.5 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
          >
            关闭
          </button>
        </Lightbox>
      )}
    </section>
  )
}
