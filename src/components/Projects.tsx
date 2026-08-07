import { useMemo, useState } from 'react'
import { projects, projectTags, type Project, type ProjectTag } from '../data/projects'
import { profile } from '../data/profile'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const tagColor: Record<ProjectTag, string> = {
  'AI 应用': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  企业系统: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  大数据: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
}

function ProjectCard({ project, delay }: { project: Project; delay: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/60">
        {project.screenshot && (
          <a href={project.link} target="_blank" rel="noreferrer" className="relative block overflow-hidden">
            <img
              src={project.screenshot}
              alt={`${project.name} 界面截图`}
              loading="lazy"
              className="aspect-video w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {project.highlight && (
              <span className="absolute left-3 top-3 rounded-full bg-blue-700 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm dark:bg-blue-600">
                重点作品
              </span>
            )}
          </a>
        )}

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{project.name}</h3>
            <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{project.period}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColor[tag]}`}>
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{project.summary}</p>

          <ul className="mt-3 space-y-1.5">
            {project.details.map((detail) => (
              <li key={detail.slice(0, 16)} className="flex gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" aria-hidden="true" />
                {detail}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.stack.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              GitHub 仓库
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </a>
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
    <section id="projects" className="scroll-mt-16 bg-white py-20 sm:py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="项目作品"
          title="近期项目与代表作品"
          description={
            <>
              按岗位方向筛选查看 · 更多项目见{' '}
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-500/50 dark:hover:text-blue-300"
              >
                {profile.githubLabel}
              </a>
            </>
          }
        />

        {/* 岗位方向筛选 */}
        <Reveal className="mt-8 flex flex-wrap gap-2">
          {(['全部', ...projectTags] as const).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActive(tag)}
              aria-pressed={active === tag}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active === tag
                  ? 'bg-blue-700 text-white shadow-sm dark:bg-blue-600'
                  : 'border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </Reveal>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {filtered.map((project, i) => (
            <ProjectCard key={project.id} project={project} delay={(i % 2) * 100} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">该方向下暂无项目展示。</p>
        )}
      </div>
    </section>
  )
}
