import { useState } from 'react'
import educationData from '../data/education.json'
import type { CertItem, EducationData } from '../data/types'
import Lightbox from './Lightbox'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const education = educationData.education as EducationData

/** 证明卡片：点击放大查看（灯箱，与项目截图交互一致） */
function ProofCard({
  item,
  type,
  onOpen,
}: {
  item: CertItem
  type?: '证书' | '奖项'
  onOpen: (item: CertItem) => void
}) {
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
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400 dark:text-slate-500">
          {type && (
            <span className={type === '证书' ? 'font-medium text-blue-600 dark:text-blue-400' : 'font-medium text-amber-600 dark:text-amber-400'}>
              {type}
            </span>
          )}
          {item.date && <span>{item.date}</span>}
          <span>· 点击查看证明图片</span>
        </span>
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

        {/* 教育背景 + 证书/奖项（bento：学校竖卡 + 证明 2x2） */}
        <div className="mt-5 grid gap-5 sm:mt-12 lg:grid-cols-3">
          {/* 学校竖卡 */}
          <Reveal className="lg:col-span-1">
            <div className="glass-card-strong flex h-full flex-col justify-center gap-5 rounded-2xl p-6 sm:p-8">
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
          </Reveal>

          {/* 证书 + 奖项 2x2 */}
          <Reveal delay={120} className="lg:col-span-2">
            <div className="grid h-full grid-cols-1 content-start gap-3 sm:grid-cols-2 sm:gap-4">
              {education.certs.map((cert) => (
                <ProofCard key={cert.name} type="证书" item={cert} onOpen={setViewing} />
              ))}
              {education.awards.map((award) => (
                <ProofCard key={award.name} type="奖项" item={award} onOpen={setViewing} />
              ))}
            </div>
          </Reveal>
        </div>      </div>

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
