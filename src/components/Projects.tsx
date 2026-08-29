import { useMemo, useState } from 'react'
import { SECTIONS } from '../data/navigation'
import projectsData from '../data/projects.json'
import profile from '../data/profile.json'
import type { Project, ProjectTag } from '../data/types'
import Lightbox from './Lightbox'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const projectTags = projectsData.projectTags as ProjectTag[]
const projects = projectsData.projects as Project[]

const tagColor: Record<ProjectTag, string> = {
  'AI 应用': 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
  企业系统: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  大数据: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
}

/** 项目外部链接行（GitHub / 在线体验 / 下载） */
function ProjectActions({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={project.link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        GitHub 仓库
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      </a>
      {project.demoUrl && (
        <a
          href={project.demoUrl}
          target="_blank"
          rel="noreferrer"
          title={project.demoNote}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          在线体验
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </a>
      )}
      {project.downloadUrl && (
        <a
          href={project.downloadUrl}
          target="_blank"
          rel="noreferrer"
          title={project.downloadNote}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          下载安装版
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
          </svg>
        </a>
      )}
    </div>
  )
}

/** 项目索引行：行号 + 图（左右交错）+ 概要 + 要点折叠 + 技术栈展开 + 链接。
 *  信息平等，编辑感来自行号与交错节奏（替代重点标注）。 */
function ProjectRow({ project, index }: { project: Project; index: number }) {
  const reverse = index % 2 === 1
  const [lightbox, setLightbox] = useState(false)
  const [stackOpen, setStackOpen] = useState(false)
  const shownStack = stackOpen ? project.stack : project.stack.slice(0, 5)

  return (
    <Reveal>
      <article className="group border-b border-slate-200/70 py-6 transition-colors hover:bg-slate-50/70 first:pt-0 last:border-0 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
        <div className="grid gap-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-5">
          {/* 行号（编辑索引感） */}
          <span
            className="hidden pt-1 font-mono text-sm font-semibold text-brand-600 sm:block dark:text-cyan-400"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          <div
            className={`grid items-start gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6 ${
              reverse ? 'sm:grid-cols-[minmax(0,1fr)_220px]' : ''
            }`}
          >
            {/* 截图：点击放大（灯箱），左右交错（reverse 时列模板翻转为 [1fr, 220px]，图保持 220px 宽） */}
            <div className={`relative ${reverse ? 'sm:order-2' : ''}`}>
              <button
                type="button"
                onClick={() => setLightbox(true)}
                aria-label={`放大查看 ${project.name} 界面截图`}
                title="点击放大查看界面"
                className="group/img relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-all hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:hover:border-brand-500/60"
              >
                <img
                  src={project.screenshot}
                  alt={`${project.name} 界面截图`}
                  loading="lazy"
                  className="aspect-video w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>
            </div>

            {lightbox && project.screenshot && (
              <Lightbox
                src={project.screenshot}
                alt={`${project.name} 界面截图（放大）`}
                onClose={() => setLightbox(false)}
              >
                <p className="text-sm font-medium text-slate-200">{project.name} · 界面截图</p>
                <button
                  type="button"
                  onClick={() => setLightbox(false)}
                  className="rounded-lg border border-slate-500 px-3.5 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
                >
                  关闭
                </button>
              </Lightbox>
            )}

            <div className={reverse ? 'sm:order-1' : ''}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-bold tracking-tight text-ink dark:text-ink-light">
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-brand-700 dark:hover:text-cyan-400"
                  >
                    {project.name}
                  </a>
                </h3>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {project.tags.map((tag) => (
                    <span key={tag} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagColor[tag]}`}>
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400 dark:text-slate-500">{project.period}</span>
                </div>
              </div>

              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{project.summary}</p>

              {project.details.length > 0 && (
                <details className="group mt-2.5">
                  <summary className="inline-flex cursor-pointer items-center gap-1 py-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-cyan-400 dark:hover:text-cyan-300">
                    查看要点（{project.details.length} 条）
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chevron-up-down h-3.5 w-3.5 transition-transform" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {project.details.map((detail) => (
                      <li key={detail.slice(0, 16)} className="flex gap-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500 dark:bg-cyan-400" aria-hidden="true" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* 技术栈：默认 5 项，可展开全部 / 收起（超 5 项才显示按钮） */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {shownStack.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {item}
                  </span>
                ))}
                {project.stack.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setStackOpen((o) => !o)}
                    aria-expanded={stackOpen}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-slate-600 dark:text-cyan-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
                  >
                    {stackOpen ? '收起' : `展开全部（${project.stack.length - 5} 项）`}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform ${stackOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="mt-3.5">
                <ProjectActions project={project} />
              </div>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  )
}

export default function Projects() {
  const [active, setActive] = useState<'全部' | ProjectTag>('全部')

  const filtered = useMemo(
    () => (active === '全部' ? projects : projects.filter((p) => p.tags.includes(active))),
    [active],
  )

  return (
    <section id="projects" className="relative scroll-mt-16 py-10 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={SECTIONS.find((s) => s.id === 'projects')?.label ?? '项目作品'}
          title="项目经历"
          description={
            <>
              <span className="block">按岗位方向筛选查看</span>
              <span className="block">
                更多项目见{' '}
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-800 dark:text-cyan-400 dark:decoration-brand-500/50 dark:hover:text-cyan-300"
                >
                  {profile.githubLabel}
                </a>
              </span>
            </>
          }
        />

        {/* 岗位方向筛选 */}
        <Reveal className="mt-10 flex flex-wrap gap-2">
          {(['全部', ...projectTags] as const).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActive(tag)}
              aria-pressed={active === tag}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active === tag
                  ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600'
                  : 'border border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-cyan-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </Reveal>

        <div className="mt-8 sm:mt-10">
          {filtered.map((project, i) => (
            <ProjectRow key={project.id} project={project} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">该方向下暂无项目展示。</p>
        )}
      </div>
    </section>
  )
}
