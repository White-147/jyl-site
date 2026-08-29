import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import profile from '../data/profile.json'
import Lightbox from './Lightbox'

export default function Hero() {
  const [showAvatar, setShowAvatar] = useState(false)
  const scope = useRef<HTMLElement>(null)

  // 首屏入场序列：克制式 fade-up + 轻交错（reduced-motion 时跳过，内容直接可见）
  useLayoutEffect(() => {
    const el = scope.current
    if (!el) return
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-hero="fade"]', {
        y: 18,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.09,
        delay: 0.05,
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="top" ref={scope} className="relative overflow-hidden">
      {/* 背景装饰：柔和光斑（微浮动）+ 网格（底部渐隐，与全站 body 背景无缝交接） */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
        }}
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2">
          <div className="h-96 w-96 rounded-full bg-brand-500/10 blur-3xl animate-hero-float dark:bg-brand-500/15" />
        </div>
        <div className="absolute right-0 top-1/3">
          <div
            className="h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl animate-hero-float dark:bg-cyan-400/10"
            style={{ animationDelay: '-5.5s' }}
          />
        </div>
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(148 168 166 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 168 166 / 0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          }}
        />
        {/* 底部浅渐变光晕：与下一板块柔和过渡，增强首屏层次 */}
        <div
          className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-brand-500/10 to-transparent sm:h-44"
          aria-hidden="true"
        />
      </div>

      <div className="hero-viewport relative mx-auto flex max-w-6xl flex-col justify-center px-4 pb-12 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
        <div className="max-w-4xl">
          {/* 求职状态徽标 */}
          <span
            data-hero="fade"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            求职中 · 到岗时间可沟通
          </span>

          {/* 名字 + 头像签名章：编辑式排版（大头像弱化，作为签名元素融入排版） */}
          <div data-hero="fade" className="mt-6 flex items-center gap-5 sm:mt-8 sm:gap-8">
            <h1 className="text-6xl font-black tracking-tight text-ink text-balance sm:text-7xl dark:text-ink-light">
              {profile.name}
            </h1>
            <button
              type="button"
              onClick={() => setShowAvatar(true)}
              className="group relative shrink-0 cursor-zoom-in rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-400/60"
              aria-label="放大查看头像"
              title="点击放大查看"
            >
              <img
                src="images/avatar-blue.webp"
                alt="蒋宇龙证件照"
                width={400}
                height={560}
                className="h-16 w-16 rounded-full object-cover shadow-lg ring-4 ring-brand-100 transition-transform group-hover:scale-105 sm:h-24 sm:w-24 dark:ring-brand-500/25"
              />
            </button>
          </div>

          <p
            data-hero="fade"
            className="mt-3 text-2xl font-bold tracking-tight text-brand-700 text-balance sm:mt-4 sm:text-4xl dark:text-cyan-400"
          >
            {profile.title}
          </p>
          <p data-hero="fade" className="mt-2 text-sm font-medium text-slate-500 sm:text-base dark:text-slate-400">
            {profile.subtitle}
          </p>

          <p data-hero="fade" className="mt-6 max-w-4xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {/* 移动端：单行短句；桌面：完整两句（避免长句折行截断） */}
            <span className="block font-medium sm:hidden">{profile.heroLineMobile}</span>
            <span className="hidden sm:block">
              {profile.heroLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </p>

          {/* 代码风彩蛋：等宽字体、单一灰调（淡化存在感，仅内行会意）；
              键 = 全链路能力域，值与方向全英文；按多行字面量书写，无横向滚动；移动端隐藏 */}
          <div data-hero="fade" className="mt-6 hidden sm:block">
            <code className="block max-w-full overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              {`const me = {
  data: ['Spark', 'Hive', 'Kafka'],
  api: ['Java', '.NET', 'Python'],
  fe: ['React', 'TypeScript'],
  native: ['Electron', 'Win32'],
  aim: 'AI toolchain',
}`}
            </code>
          </div>

          {/* 技术栈标签：招聘者 5 秒扫描核心技能 */}
          <ul data-hero="fade" className="mt-6 flex max-w-2xl flex-wrap items-center gap-2">
            {profile.heroTags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
              >
                {tag}
              </li>
            ))}
          </ul>

          {/* 主行动：简历下载 + 查看项目（招聘者 5 秒路径；移动端并排两列一屏可见） */}
          <div data-hero="fade" className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <a
              href={profile.resumeUrl}
              download
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 sm:w-auto dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              下载简历
            </a>
            <a
              href="#projects"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 sm:w-auto dark:border-brand-500/40 dark:bg-slate-900 dark:text-brand-300 dark:hover:border-brand-400"
            >
              查看项目
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* 头像放大查看 */}
      {showAvatar && (
        <Lightbox
          src="images/avatar-blue.webp"
          alt="蒋宇龙证件照"
          onClose={() => setShowAvatar(false)}
        />
      )}
    </section>
  )
}
