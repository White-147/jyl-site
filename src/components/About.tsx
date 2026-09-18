import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SECTIONS } from '../data/navigation'
import profile from '../data/profile.json'
import type { AboutLink, AboutPara, AboutPosition, Stat } from '../data/types'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

gsap.registerPlugin(ScrollTrigger)

/** 关键数字：进入视口时从 0 滚动计数到目标值（纯数字部分） */
function StatValue({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = Number.parseInt(stat.value, 10)
    if (Number.isNaN(target)) {
      setDisplay(target)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          io.disconnect()
          const start = performance.now()
          const duration = 900
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration)
            setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))))
            if (p < 1) raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        })
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [stat.value])

  return (
    // whitespace-nowrap：数字与后缀是一个整体（「500」+「条/日」），窄卡里不能被拆成上下两行。
    // 实测 810px 视口下不加会分成两行，数字块高从 40px 变 38px 且视觉断裂。
    <div ref={ref} className="font-numeric whitespace-nowrap text-3xl font-medium tracking-tight text-brand-700 sm:text-4xl dark:text-brand-200">
      {display}
      {stat.suffix && (
        <span className="ml-0.5 text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">{stat.suffix}</span>
      )}
    </div>
  )
}

export default function About() {
  const stats = profile.stats as Stat[]
  const about = profile.about as AboutPara[]
  const links = profile.aboutLinks as AboutLink[]
  const positions = (profile.positions ?? []) as AboutPosition[]
  const anchor = profile.anchor ?? '数据科学与大数据技术本科'
  const scope = useRef<HTMLElement>(null)

  // 链路连接线：桌面端随滚动从左至右绘制（scrub，克制）
  useLayoutEffect(() => {
    const el = scope.current
    if (!el) return
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        '[data-about="pipe"]',
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 55%', scrub: 0.6 },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="about" ref={scope} className="relative anchor-offset section-tight">
      <div className="rail-gutter mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={SECTIONS.find((s) => s.id === 'about')?.label ?? '关于我'} title="从业务交付到 AI 应用落地" />

        <div className="mt-5 grid gap-5 sm:mt-12 lg:grid-cols-2">
          {/* 简介卡：学历锚点 + 阶段化叙事（早期 / 近期 / 日常） */}
          <Reveal>
            <div className="glass-card-strong h-full rounded-2xl p-6 sm:p-7">
              <p className="font-display text-lg font-normal tracking-tight text-brand-700 dark:text-brand-200">{anchor}</p>
              <div className="mt-4 space-y-4">
                {about.map((para) => (
                  <div key={para.phase}>
                    {para.texts.map((text, i) => (
                      <p
                        key={text.slice(0, 12)}
                        className={`text-base leading-snug text-slate-600 text-pretty sm:leading-relaxed dark:text-slate-300 ${
                          i === 0 ? '' : 'mt-1.5'
                        }`}
                      >
                        {i === 0 && (
                          <span className="font-semibold text-brand-700 dark:text-brand-200">{para.phase} </span>
                        )}
                        {text}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* 多定位卡：四个岗位方向一句话定位 + 各方向关键词（招聘者快速抓取可投方向，与技能区画像互补） */}
          <Reveal delay={120}>
            <div className="glass-card-strong relative h-full overflow-hidden rounded-2xl p-6 sm:p-7">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-15"
                aria-hidden="true"
                style={{
                  // 与 body 光斑同源（brand-500 / brand-400），保证装饰层与全站同色
                  backgroundImage:
                    'radial-gradient(60% 60% at 85% 15%, rgb(217 122 6 / 0.14), transparent 70%), radial-gradient(50% 50% at 10% 90%, rgb(247 189 110 / 0.16), transparent 70%)',
                }}
              />
              <p className="font-display text-lg font-normal tracking-tight text-brand-700 dark:text-brand-200">
                多岗位定位 · 各方向均可验证
              </p>
              <ul className="relative mt-5 space-y-5">
                {positions.map((item) => (
                  <li key={item.title}>
                    <div className="text-base leading-snug text-slate-600 sm:leading-relaxed dark:text-slate-300">
                      <strong className="font-semibold text-brand-700 dark:text-brand-200">{item.title}</strong>
                      <span className="text-slate-600 dark:text-slate-300">：{item.desc}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.keywords.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* 三段链路：数字有叙事上下文，替代孤立的统计块。

            列数按「卡片实际可读宽度」而不是「看起来够不够」来定：
            每张卡内部有两组「数字 + 后缀」，低于约 300px 时数字与后缀会被挤成上下两行、
            正文每行掉到 10–16 个汉字。实测（改前）：
               640px 起就切 3 列 → 810px 视口每张仅 241px、每行 11 字
               1024px 视口 271px、1280px 也才 305px
            所以改成：<640 单列 → ≥640 两列 → ≥1188 三列（1188 是按实测定的自定义断点，见 index.css 的 xl3）。
            810px 下每张 323px、正文每行 25 字，数字与后缀同行。 */}
        <div className="mt-5 sm:mt-6">
          <div className="relative mb-6 hidden sm:block" aria-hidden="true">
            <div className="h-px w-full origin-left bg-gradient-to-r from-brand-200 via-brand-400 to-brand-500/60 dark:from-brand-300/20 dark:via-brand-300/50 dark:to-brand-400/50" data-about="pipe" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl3:grid-cols-3">
            {links.map((link, i) => (
              <Reveal key={link.title} delay={i * 110}>
                <div className="group glass-card h-full rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:p-5 xl3:p-6 dark:hover:border-brand-500/50">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold text-ink dark:text-ink-light">{link.title}</h3>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                      {link.tag}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-6 lg:gap-8">
                    {link.statIdx.map((idx) => {
                      const stat = stats[idx]
                      return (
                        <div key={stat.label}>
                          <StatValue stat={stat} />
                          <div className="mt-1 text-[11px] leading-snug break-words text-slate-500 sm:text-xs dark:text-slate-400">
                            {stat.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{link.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
