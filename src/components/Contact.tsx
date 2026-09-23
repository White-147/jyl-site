import { SECTIONS } from '../data/navigation'
import { HONEYPOTS, contact } from '../data/contact'
import { Toast, useCopyFeedback, useToast } from './Toast'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

export default function Contact() {
  const toast = useToast()
  const primary = useCopyFeedback(contact.emailQq, toast.show)
  const backup = useCopyFeedback(contact.email, toast.show)

  return (
    <section id="contact" className="relative anchor-offset section-loose">
      <div className="rail-gutter mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={SECTIONS.find((s) => s.id === 'contact')?.label ?? '联系方式'}
          title="期待与您交流"
          description="点击邮箱即可复制，或直接下载简历。"
        />

        <Reveal delay={100} className="mt-12">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center sm:p-12 dark:border-slate-800 dark:bg-slate-900">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-15"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
                backgroundSize: 'var(--grid-size) var(--grid-size)',
              }}
            />
            <div className="relative">
              <p className="text-lg leading-relaxed break-words text-slate-600 dark:text-slate-300">
                欢迎通过邮件或 GitHub 联系我，也可直接下载简历。
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {/* 主邮箱：点击复制而不是唤起邮件客户端（招聘方多为复制到 ATS 或转发） */}
                <button
                  type="button"
                  onClick={primary.copy}
                  aria-label={`复制邮箱 ${contact.emailQq}`}
                  data-copyable
                  className="group inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  {primary.copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <rect x="9" y="9" width="12" height="12" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  )}
                  {/* 邮箱文本保留在 DOM 中（可选中、读屏可读），只是不再触发 mailto。
                      data-copyable = 只读保护白名单，见 useReadOnlyGuard.ts */}
                  <span lang="en" data-copyable>{contact.emailQq}</span>
                </button>
                <a
                  href={contact.github}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-200"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  GitHub
                </a>
                <a
                  href={contact.resumeUrl}
                  download
                  rel="nofollow"
                  referrerPolicy="no-referrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  下载简历
                </a>
              </div>
              {/* 联系方式：手动三行，三端排版一致。
                  两个邮箱标注 data-copyable（只读白名单，可选中可复制）；GitHub 链接不标注。 */}
              <p className="mx-auto mt-8 max-w-md space-y-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="block">
                  QQ 邮箱：
                  <button
                    type="button"
                    onClick={primary.copy}
                    title="点击复制"
                    className="underline decoration-slate-300 underline-offset-2 transition-colors hover:text-brand-700 dark:decoration-slate-600 dark:hover:text-brand-200"
                  >
                    <span lang="en" data-copyable>{contact.emailQq}</span>
                  </button>
                </span>
                <span className="block">
                  Gmail（备用）：
                  <button
                    type="button"
                    onClick={backup.copy}
                    title="点击复制"
                    className="underline decoration-slate-300 underline-offset-2 transition-colors hover:text-brand-700 dark:decoration-slate-600 dark:hover:text-brand-200"
                  >
                    <span lang="en" data-copyable>{contact.email}</span>
                  </button>
                </span>
                <span className="block">
                  GitHub：
                  <a href={contact.github} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-slate-300 underline-offset-2 hover:text-brand-600 dark:decoration-slate-600">
                    <span lang="en">{contact.githubLabel}</span>
                  </a>
                </span>
              </p>
              {/* 诱饵地址：视觉隐藏、读屏忽略，只存在于 DOM 供无差别采集器抓取 */}
              <span className="sr-only" aria-hidden="true">
                {HONEYPOTS.map((mail) => (
                  <a key={mail} href={`mailto:${mail}`}>
                    {mail}
                  </a>
                ))}
              </span>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 收尾呼吸区（scrim）：让「联系我」这一段也能停在锚点停靠位。
          ⚠️ 为什么需要，以及为什么是"最小必需"而不是"越大越好"：
          `#contact` 是最后一段，它下面只有页脚。要让它停在停靠位（顶部留 `margin`），需要
              可滚动量 ≥ 段顶 − margin
          可滚动量 = 文档高 − 视口高，于是**需要的收尾高度 = max(0, 视口高 − 页脚高 − margin)**。
          这个需求随视口高度**线性增长**：900 高时约 663px、1200 高时约 963px。
          而呼吸区在视觉上就是"正文下方的一片空白"——需求与观感直接冲突。
          2026-09 的取舍（用户确认「乙：保留最小必需」）：
              呼吸区 = clamp(8rem, 30vh − 8rem, 15rem)
              —— 矮屏够用、高屏封顶在 240px，不再让空白无限长。
          代价：视口高于约 1000px 时「联系我」滚不到精确停靠位（标题会落在视口偏下的位置）；
                导轨高亮判定与玻璃管液柱仍自洽（三者读同一组 scrollTargets 值），只是那一段不够"贴顶"。
          ⚠️ 改这里必须重跑一次「视口高度扫描」（见 docs/联动维护点.md 第 6 条的验证方法）。
          它只是一块背景，与全站背景层连续，不会被读成"空白区块"。 */}
      <div
        aria-hidden="true"
        className="h-[clamp(8rem,calc(30vh-8rem),15rem)] sm:h-[clamp(8rem,calc(34vh-8rem),15rem)]"
      />
      <Toast message={toast.message} />
    </section>
  )
}
