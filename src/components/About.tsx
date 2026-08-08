import { useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../data/navigation'
import profile from '../data/profile.json'
import type { Stat } from '../data/types'
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
    <div ref={ref} className="text-lg font-extrabold tracking-tight text-blue-700 sm:text-2xl dark:text-blue-400">
      {display}
      {stat.suffix && (
        <span className="ml-0.5 text-[10px] font-semibold text-slate-500 sm:text-sm dark:text-slate-400">{stat.suffix}</span>
      )}
    </div>
  )
}

export default function About() {
  const stats = profile.stats as Stat[]

  return (
    <section id="about" className="relative scroll-mt-16 py-10 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={SECTIONS.find((s) => s.id === 'about')?.label ?? '关于我'} title="AI 应用 · 企业系统 · 数据工程" />

        <div className="mt-5 grid gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-4">
          {/* 简介大卡（bento 主块） */}
          <Reveal className="lg:col-span-2">
            <div className="glass-card-strong h-full rounded-2xl p-6 sm:p-7">
              {profile.about.map((paragraph) => (
                <p key={paragraph.slice(0, 12)} className="text-base leading-snug text-slate-600 sm:leading-relaxed dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>

          {/* 关键数据：手机端 3 列紧凑展示，一屏可看完 */}
          <Reveal delay={120} className="lg:col-span-2">
            <div className="grid h-full grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card rounded-2xl p-2 text-center"
                >
                  <StatValue stat={stat} />
                  <div className="mt-1 text-[11px] leading-snug break-words text-slate-500 sm:text-xs dark:text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  )
}
