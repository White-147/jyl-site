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
      className="glass-panel glass-lit group flex w-full cursor-zoom-in flex-col gap-2.5 rounded-2xl p-4 text-left hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/60"
    >
      {/* 名称优先：整行全宽，避免长名称换行挤字 */}
      <span className="block text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
        {item.name}
      </span>
      <span className="flex items-center gap-2.5">
        {/* 缩略图：辅助证明，点击放大查看原件 */}
        <img
          src={item.image}
          alt={`${item.name} 证明缩略图`}
          loading="lazy"
          className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-105 dark:ring-slate-600"
        />
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400 dark:text-slate-500">
          {type && (
            <span className={type === '证书' ? 'font-medium text-brand-700 dark:text-brand-200' : 'font-medium text-amber-700 dark:text-amber-400'}>
              {type}
            </span>
          )}
          {item.date && <span>{item.date}</span>}
          <span>· 点击查看证明图片</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-auto h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600 dark:text-slate-500 dark:group-hover:text-brand-200"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
        </svg>
      </span>
    </button>
  )
}

export default function Education() {
  const [viewing, setViewing] = useState<CertItem | null>(null)

  return (
    <section id="education" className="relative anchor-offset section-tight">
      {/* cv-section：首屏以下的区块跳过初始布局/绘制，见 index.css 该类的注释。 */}
      <div className="cv-section rail-gutter mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading sectionId="education" title="教育经历 · 证书与奖项" />

        {/* 教育背景 + 证书/奖项（bento：学校竖卡 + 证明 2x2） */}
        <div className="mt-5 grid gap-5 sm:mt-12 lg:grid-cols-3">
          {/* 学校卡。
              ⚠️ 2026-09 第十三/十四轮：**图标与校名并排**，三端统一。
              历史：原来是 `flex-col gap-5` —— 图标盒 48×48 独占一行、标题被推到下一行，
              中间再夹一个 20px 的 gap。用户在手机上先报了一次（「图标独占一行，这很不美观」），
              第十三轮只修了 `max-sm:`；第十四轮发现 PC 端是同一个毛病（实测 1440 宽下
              卡片 214.5px 高，图标底 350.3 → 校名顶 370.3，中间正好空掉那 20px）。
              所以现在把横排**提成基准**，不再分端：
                · 图标盒 28px + 图标 16px（原 `max-sm` 那一套），`self-start` 对齐到**校名那一行**
                  而不是整块文字的垂直中心（`items-center` 会让它掉到第二行的高度上）；
                · `min-w-0` 留在文字块上，长文案在窄栏里换行而不是撑破卡片。
              ⚠️ 桌面端卡片只有 lg 三列中的一列（1024 宽下实测 280px、内容宽 214px），
                再放 48px 大图标 + 20px 间距，文字可用宽度只剩 146px（150px 的学位行会折两行），
                所以大图标在**任何**宽度下都不成立，不是"手机上省空间"的问题。
              ⚠️ 用 `max-sm:` 会与 `sm:h-12` 这类既有变体互补；现在既然不写 `sm:` 大图标，
                直接给基准值即可，少两条变体。 */}
          <Reveal className="lg:col-span-1">
            <div className="glass-panel glass-lit flex h-full flex-row items-start justify-center gap-3.5 rounded-2xl p-6 sm:p-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M22 10 12 5 2 10l10 5 10-5z" />
                  <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-ink dark:text-ink-light">{education.school}</h3>
                <p className="text-sm font-medium text-brand-700 dark:text-brand-200">{education.degree}</p>
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
        </div>
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
