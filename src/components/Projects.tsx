import { useMemo, useState } from 'react'
import projectsData from '../data/projects.json'
import profile from '../data/profile.json'
import type { Project, ProjectTag } from '../data/types'
import { useIsMobile } from '../hooks/useIsMobile'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const projectTags = projectsData.projectTags as ProjectTag[]
const projects = projectsData.projects as Project[]

const tagColor: Record<ProjectTag, string> = {
  'AI 应用': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  企业系统: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  大数据: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
}

function ProjectRow({ project, index }: { project: Project; index: number }) {
  // 相邻行左右交替，形成“全宽大卡”版式
  const reverse = index % 2 === 1
  // 移动端默认只显示前 2 条要点，减少阅读疲劳；桌面端完整显示
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const collapsed = isMobile && !open
  const shownDetails = collapsed ? project.details.slice(0, 2) : project.details
  const hiddenCount = project.details.length - shownDetails.length

  return (
    <Reveal>
      <article className="group grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
        {/* 大截图 */}
        <div className={`relative ${reverse ? 'lg:order-2' : ''}`}>
          <a
            href={project.link}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all group-hover:border-blue-300 group-hover:shadow-lg dark:border-slate-800 dark:group-hover:border-blue-500/60"
          >
            <img
              src={project.screenshot}
              alt={`${project.name} 界面截图`}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </a>
          {project.highlight && (
            <span className="absolute left-4 top-4 rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:bg-blue-600">
              重点作品
            </span>
          )}
        </div>

        {/* 详情 */}
        <div className={reverse ? 'lg:order-1' : ''}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{project.name}</h3>
            <span className="text-sm text-slate-400 dark:text-slate-500">{project.period}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColor[tag]}`}>
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">{project.summary}</p>

          <ul className="mt-4 space-y-2">
            {shownDetails.map((detail) => (
              <li key={detail.slice(0, 16)} className="flex gap-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" aria-hidden="true" />
                {detail}
              </li>
            ))}
          </ul>

          {/* 移动端：折叠/展开更多要点 */}
          {isMobile && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 sm:hidden dark:text-blue-400 dark:hover:text-blue-300"
            >
              展开全部要点（{hiddenCount} 条）
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}
          {isMobile && open && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 sm:hidden dark:text-blue-400 dark:hover:text-blue-300"
            >
              收起要点
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
          )}

          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.stack.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5">
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
        <Reveal className="mt-10 flex flex-wrap gap-2">
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

        <div className="mt-12 space-y-14">
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
