import profile from '../data/profile.json'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

export default function Contact() {
  return (
    <section id="contact" className="scroll-mt-16 bg-white py-10 sm:py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="联系方式" title="对项目或工作机会感兴趣？" />

        <Reveal delay={100} className="mt-12">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center sm:p-12 dark:border-slate-800 dark:bg-slate-900">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="relative">
              <p className="text-lg leading-relaxed break-words text-slate-600 dark:text-slate-300">
                欢迎通过邮件或 GitHub 联系我，也可直接下载简历。
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`mailto:${profile.emailQq}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 6L2 7" />
                  </svg>
                  {profile.emailQq}
                </a>
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  GitHub
                </a>
                <a
                  href={profile.resumeUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  下载简历
                </a>
              </div>
              {/* 联系方式：手动三行，三端排版一致 */}
              <p className="mx-auto mt-8 max-w-md space-y-1.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                <span className="block">
                  QQ 邮箱：
                  <a href={`mailto:${profile.emailQq}`} className="underline decoration-slate-300 underline-offset-2 hover:text-blue-600 dark:decoration-slate-600">
                    {profile.emailQq}
                  </a>
                </span>
                <span className="block">
                  Gmail（备用）：
                  <a href={`mailto:${profile.email}`} className="underline decoration-slate-300 underline-offset-2 hover:text-blue-600 dark:decoration-slate-600">
                    {profile.email}
                  </a>
                </span>
                <span className="block">
                  GitHub：
                  <a href={profile.github} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-blue-600 dark:decoration-slate-600">
                    {profile.githubLabel}
                  </a>
                </span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
