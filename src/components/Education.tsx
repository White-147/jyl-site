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

        {/* 教育背景 + 证书/奖项（2026-09 第十五轮：改成"横条 + 证书 2×2"） */}
        <div className="mt-5 grid gap-5 sm:mt-12 lg:grid-cols-3">
          {/* 学校卡：**跨满整行的横条**（三端同一套写法，不做分端适配）。
              ⚠️ 为什么不再做"左一列竖卡"（第十三/十四轮的形态）：那一列只有 3 列中的 1 列
                 （1024 宽下实测 280px、内容宽 214px），而内容只有 66~86px 高，行高却被右侧
                 证书的 2×2 撑到 214.5px —— 实测留白 上 33 / 下 116，空白占卡片 **69%**。
                 用户口径：「内容过于空了」。改成横条后：宽度 1008（1440 宽下），高度回到内容
                 真正需要的 132px，**上下留白各 33px**，空白降到 50% 且左右对称。
              ⚠️ 两条约束（改这个卡之前先看）：
                ① `items-start`：图标对齐到**校名那一行**，不是整块文字的垂直中心；
                ② **不要 `justify-center`**：横条状态下它会把图标+文字整体推到卡片中央
                   （预演时实拍过，"学校名居中、右侧三分之一全空"），必须左对齐。
              ⚠️ 跨列写在 Reveal 上（它是 grid item）：`sm:col-span-2` 对应 `sm:grid-cols-2`，
                 `lg:col-span-3` 对应 `lg:grid-cols-3`，两级各占满自己那一档的全部列。 */}
          <Reveal className="sm:col-span-2 lg:col-span-3">
            <div className="glass-panel glass-lit flex h-full flex-row items-start gap-3.5 rounded-2xl p-5 sm:p-6">
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

          {/* 证书 + 奖项 2×2：跨满整行排在横条下面，四张等宽。
              ⚠️ 列宽必须 ≥ **268px**：实测 268px 时证书名一行（卡高 99.3px），
                 240px 就折两行（118.5px）、132px 折三行（186.8px）—— 列的宽窄直接决定卡片高。
                 所以**不要**为了"更紧凑"把这里改成 4 列并排：1440 宽下每列只剩 240px，
                 名称会折两行（第十五轮预演实测过 A4 方案，就是这个结果）。
              ⚠️ `sm:col-span-2` / `lg:col-span-3` 与横条同理，两级都要占满。 */}
          <Reveal delay={120} className="sm:col-span-2 lg:col-span-3">
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
