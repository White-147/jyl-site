import { useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../data/navigation'
import profile from '../data/profile.json'
import type { AboutLink, AboutPara, AboutPosition, Stat } from '../data/types'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

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
  const about = profile.about as AboutPara[]
  const links = profile.aboutLinks as AboutLink[]
  const positions = (profile.positions ?? []) as AboutPosition[]
  const anchor = profile.anchor ?? '数据科学与大数据技术本科'
  const scope = useRef<HTMLElement>(null)

  // 链路连接线：进入视口时从左至右画一次。
  //
  // ⚠️ 2026-09：原来用 GSAP ScrollTrigger 做**滚动 scrub**（随滚动进度反向可回退）。
  // 为了这一条线，整个 ScrollTrigger 插件（约 40KB 原始 / gzip 后更少但仍在主包里）被拉进首屏包，
  // 而它是全站唯一的使用点。现在改为 IntersectionObserver 触发一次 CSS 过渡：
  //   · 观感差异：线不再随滚动回退，只在进入视口时画一次（触发点与原 start: 'top 78%' 对齐）
  //   · 收益：ScrollTrigger 从产物中彻底消失
  // 判定与回退都在 CSS 里（.about-pipe / .about-pipe.is-drawn），reduced-motion 下直接是终态。
  useEffect(() => {
    const el = scope.current
    if (!el) return
    const pipe = el.querySelector('[data-about="pipe"]')
    if (!pipe) return
    if (!('IntersectionObserver' in window)) {
      pipe.classList.add('is-drawn')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          pipe.classList.add('is-drawn')
          io.disconnect()
        })
      },
      { rootMargin: '0px 0px -22% 0px' },
    )
    io.observe(pipe)
    return () => io.disconnect()
  }, [])

  return (
    <section id="about" ref={scope} className="relative anchor-offset section-tight">
      <div className="rail-gutter mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={SECTIONS.find((s) => s.id === 'about')?.label ?? '关于我'} title="从数据到 AI，再到游戏开发" />

        <div className="mt-5 grid gap-5 sm:mt-12 lg:grid-cols-2">
          {/* 简介卡：学历锚点 + 阶段化叙事（早期 / 近期 / 日常） */}
          <Reveal>
            <div className="glass-card-strong h-full rounded-2xl p-6 sm:p-7">
              <p className="font-display text-lg font-normal tracking-tight text-brand-700 dark:text-brand-200">{anchor}</p>
              <div className="mt-4 space-y-4">
                {about.map((phase) => (
                  <div key={phase.phase} className="space-y-1.5">
                    {phase.texts.map((entry) => {
                      // 两种写法：字符串（无标签）与 `{ label, text }`（行内彩色标签）。
                      // 现在数据里**四段都带标签**（早期 / 近期 / 日常 / 目前），
                      // 它们是并列的四个时间视角，视觉上必须完全一致 —— 所以共用同一个样式，
                      // 而不是"第一段特殊"。字符串分支只是给未来的无标签段落留的路。
                      const text = typeof entry === 'string' ? entry : entry.text
                      const label = typeof entry === 'string' ? null : entry.label
                      return (
                        <p
                          key={text.slice(0, 12)}
                          className="text-base leading-snug text-slate-600 text-pretty sm:leading-relaxed dark:text-slate-300"
                        >
                          {label && (
                            <span className="font-semibold text-brand-700 dark:text-brand-200">{label} </span>
                          )}
                          {text}
                        </p>
                      )
                    })}
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

        {/* 四条链路：数字有叙事上下文，替代孤立的统计块。

            列数按「卡片实际可读宽度」而不是「看起来够不够」来定：
            每张卡内部有两组「数字 + 后缀」，低于约 300px 时数字与后缀会被挤成上下两行、
            正文每行掉到 10–16 个汉字。
            四张卡定稿（联动 docs/联动维护点.md 第 5 条）：
                &lt;640 单列 → ≥640 恒定两列（2×2）→ 三列方案已废弃
            废弃三列的原因：四张卡在 3 列网格里会排成 3+1，第四张独自占一整行，
            平板与 1024–1188px 视口尤其难看（原三卡时代的 2+1 是同一个病）。
            改为恒定两列 + 容器上限 1024px：每行恰好两张、两行收尾，
            每张约 480px（桌面）→ 数字与后缀同行、正文每行 30 字以上，
            同时与项目区 / 技能区既有的双列网格语言一致。
            ⚠️ 容器上限取 1024px 而不是 max-w-6xl：后者在 >1188px 时每张会被拉到 520px+，
               卡片被摊薄。改卡片内边距或 rail-gutter 后需重新验算这个上限。 */}
        <div className="mt-5 sm:mt-6">
          <div className="relative mb-6 hidden sm:block" aria-hidden="true">
            <div className="about-pipe" data-about="pipe" />
          </div>
          <div className="grid gap-4 sm:mx-auto sm:max-w-5xl sm:grid-cols-2 sm:gap-5">
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
                    {link.stats.map((stat) => (
                      <div key={stat.label}>
                        <StatValue stat={stat} />
                        <div className="mt-1 text-[11px] leading-snug break-words text-slate-500 sm:text-xs dark:text-slate-400">
                          {stat.label}
                        </div>
                      </div>
                    ))}
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
