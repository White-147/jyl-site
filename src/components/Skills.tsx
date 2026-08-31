import { useMemo, useState } from 'react'
import skillsData from '../data/skills.json'
import { SECTIONS } from '../data/navigation'
import type { SkillProfile } from '../data/types'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const skillProfiles = skillsData.skillProfiles as SkillProfile[]

/** 快捷过滤标签（高频方向，点击即搜索；仅硬技术栈分支「AI 全栈开发」显示） */
const QUICK_TAGS = ['Java', 'React', '.NET', 'Python', 'AI', '大数据', '数据库', '桌面']
const QUICK_TAG_PROFILE_IDS = new Set(['ai'])

/** 模糊 like 归一化：
 *  1) fold：小写 + NFKC（全角→半角）
 *  2) compact：fold 后再去空格/连字符/点（"springboot" 命中 "Spring Boot"）
 *  符号（# +）保留语义：c# 命中 C#，c++ 命中 C++，输 c 两端皆命中 */
const fold = (s: string) => s.toLowerCase().normalize('NFKC').trim()
const compact = (s: string) => fold(s).replace(/[\s\-_./\\]+/g, '')

function hits(query: string, text: string) {
  const q = fold(query)
  if (q === '') return true
  if (fold(text).includes(q)) return true
  const cq = compact(query)
  return cq !== '' && compact(text).includes(cq)
}

export default function Skills() {
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(skillProfiles[0]?.id ?? 'general')

  const active = skillProfiles.find((p) => p.id === activeId) ?? skillProfiles[0]

  const filtered = useMemo(() => {
    if (!active) return []
    if (fold(query) === '') return active.groups.map((g, idx) => ({ ...g, origIndex: idx }))
    return active.groups
      .map((g, idx) => {
        const items = g.items.filter((item) => hits(query, item) || hits(query, g.title))
        return { ...g, items, origIndex: idx }
      })
      .filter((g) => g.items.length > 0)
  }, [query, active])

  const totalHits = useMemo(() => filtered.reduce((n, g) => n + g.items.length, 0), [filtered])
  const totalItems = useMemo(
    () => (active ? active.groups.reduce((n, g) => n + g.items.length, 0) : 0),
    [active],
  )
  const showQuickTags = QUICK_TAG_PROFILE_IDS.has(active?.id ?? '')

  return (
    <section id="skills" className="relative scroll-mt-16 py-10 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={SECTIONS.find((s) => s.id === 'skills')?.label ?? '专业技能'}
          title="岗位技能画像"
          description="按岗位方向切换技能画像；输入关键词可快速筛选项目所需技能。"
        />

        {/* 搜索框：模糊 like（大小写不敏感、c#/c++ 保留语义、去空格归一） */}
        <Reveal className="mt-8">
          <label className="relative block max-w-xl">
            <span className="sr-only">搜索技能</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('')
              }}
              placeholder="输入关键词筛选技能"
              aria-label="搜索技能"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-base text-slate-700 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-brand-500"
            />
            {query !== '' && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </label>

          {/* 岗位模板切换：胶囊分段控件（与项目筛选同风格），移动端横向滑动 */}
          <div
            role="tablist"
            aria-label="岗位技能画像"
            className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {skillProfiles.map((p) => {
              const isActive = p.id === active?.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(p.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600'
                      : 'border border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-cyan-400'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* 岗位说明（如过渡兼职标注） */}
          {active?.note && (
            <p className="mt-2.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">{active.note}</p>
          )}

          {/* 高频快捷标签：点击即过滤（仅含硬技术栈的岗位显示） */}
          {showQuickTags && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const tagActive = fold(query) === fold(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tagActive ? '' : tag)}
                    aria-pressed={tagActive}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      tagActive
                        ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600'
                        : 'border border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-cyan-400'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          )}

          {/* 结果计数（无障碍播报） */}
          <p aria-live="polite" className="mt-3 hidden text-xs text-slate-400 dark:text-slate-500">
            {query !== ''
              ? `匹配到 ${totalHits} 项 · ${filtered.length} 个分组`
              : `共 ${totalItems} 项 · ${active?.groups.length ?? 0} 个分组`}
          </p>
        </Reveal>

        {/* 分组卡片：桌面双列 grid（01|02 同行，Z 序阅读；同行等高对齐），移动端单列 */}
        {filtered.length > 0 ? (
          <div
            key={active?.id ?? 'empty'}
            className="mt-8 space-y-5 sm:mt-10 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-5 lg:space-y-0"
          >
            {filtered.map((group, i) => (
              <Reveal key={group.title} delay={(i % 2) * 80} className="reveal-group lg:h-full">
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-300 sm:p-7 dark:border-slate-800 dark:bg-slate-800 dark:hover:border-brand-500/60">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/10 dark:text-cyan-400">
                      {String(group.origIndex + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-lg font-bold text-ink dark:text-ink-light">{group.title}</h3>
                    <span className="ml-auto shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {group.items.length} 项
                    </span>
                  </div>
                  {/* chips 逐个交错浮现（见 index.css .reveal-group .chip） */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.items.map((item, j) => (
                      <span
                        key={item}
                        style={{ transitionDelay: `${j * 30}ms` }}
                        className="chip rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:via-70% dark:to-slate-950/70 dark:text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">未找到匹配的技术栈，换个关键词试试。</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              清空搜索
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
