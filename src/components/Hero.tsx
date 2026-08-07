import { useState } from 'react'
import profile from '../data/profile.json'
import Lightbox from './Lightbox'

export default function Hero() {
  const [showAvatar, setShowAvatar] = useState(false)

  return (
    <section id="top" className="relative overflow-hidden">
      {/* 背景装饰：柔和光斑（微浮动）+ 网格 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2">
          <div className="h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-hero-float dark:bg-blue-500/15" />
        </div>
        <div className="absolute right-0 top-1/3">
          <div
            className="h-72 w-72 rounded-full bg-sky-400/10 blur-3xl animate-hero-float dark:bg-sky-400/10"
            style={{ animationDelay: '-5.5s' }}
          />
        </div>
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          }}
        />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-20">
        {/* 求职状态徽标 */}
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          求职中 · 到岗时间可沟通
        </span>

        {/* 头像（点击放大查看） */}
        <button
          type="button"
          onClick={() => setShowAvatar(true)}
          className="group relative mt-1 cursor-zoom-in rounded-full outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60"
          aria-label="放大查看头像"
          title="点击放大查看"
        >
          <img
            src="images/avatar-blue.webp"
            alt="蒋宇龙证件照"
            width={400}
            height={560}
            className="h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-blue-100 transition-transform group-hover:scale-105 sm:h-32 sm:w-32 dark:ring-blue-500/20"
          />
        </button>

        <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-slate-900 text-balance dark:text-white">
          {profile.name}
        </h1>
        <p className="mt-2 text-3xl font-bold tracking-tight text-blue-700 text-balance dark:text-blue-400">
          {profile.title}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{profile.subtitle}</p>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {profile.heroLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>

        {/* 首屏不设 CTA：导航栏「项目」入口 + 滚动进入内容区（极简排版，留白即设计） */}
        <p className="mt-8 text-xs font-medium tracking-widest text-slate-400 dark:text-slate-500">
          向下滚动查看项目 ↓
        </p>
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
