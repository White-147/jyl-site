import { useEffect, useMemo, useState } from 'react'
import { SECTIONS } from '../data/navigation'
import projectsData from '../data/projects.json'
import profile from '../data/profile.json'
import type { Project, ProjectTag } from '../data/types'
import { useIsMobile } from '../hooks/useIsMobile'
import Lightbox from './Lightbox'
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
  const [lightbox, setLightbox] = useState(false)
  const collapsed = isMobile && !open
  const shownDetails = collapsed ? project.details.slice(0, 2) : project.details
  const hiddenCount = project.details.length - shownDetails.length

  // 灯箱：ESC 关闭
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <Reveal>
      <article className="group grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
        {/* 大截图：点击放大查看（灯箱），不直接跳转 */}
        <div className={`relative ${reverse ? 'lg:order-2' : ''}`}>
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label={`放大查看 ${project.name} 界面截图`}
            title="点击放大查看界面"
            className="relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all group-hover:border-blue-300 group-hover:shadow-lg dark:border-slate-800 dark:group-hover:border-blue-500/60"
          >
            <img
              src={project.screenshot}
              alt={`${project.name} 界面截图`}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
            />
            {/* 放大提示：hover 时浮现 */}
            <span
              className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/25"
              aria-hidden="true"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </span>
            </span>
          </button>
          {project.highlight && (
            <span className="absolute left-4 top-4 rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:bg-blue-600">
              重点作品
            </span>
          )}
        </div>

        {/* 灯箱：放大查看项目界面（与证书/奖项共用同一交互） */}
        {lightbox && project.screenshot && (
          <Lightbox
            src={project.screenshot}
            alt={`${project.name} 界面截图（放大）`}
            onClose={() => setLightbox(false)}
          >
            <p className="text-sm font-medium text-slate-200">{project.name} · 界面截图</p>
            <div className="flex items-center gap-2">
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  在线体验
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </a>
              )}
              <button
                type="button"
                onClick={() => setLightbox(false)}
                className="rounded-lg border border-slate-500 px-3.5 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
              >
                关闭
              </button>
            </div>
          </Lightbox>
        )}

        {/* 详情 */}
        <div className={`glass-card-strong rounded-2xl p-5 sm:p-6 ${reverse ? 'lg:order-1' : ''}`}>
          {/* 标题两行固定：名称独占一行，标签+时间+查看项目一行（三端一致，不随宽度换行） */}
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-blue-700 dark:hover:text-blue-400"
              >
                {project.name}
              </a>
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {project.tags.map((tag) => (
                <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColor[tag]}`}>
                  {tag}
                </span>
              ))}
              <span className="text-sm text-slate-400 dark:text-slate-500">{project.period}</span>
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
              >
                查看项目
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
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                >
                  在线体验
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </a>
              )}
            </div>
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
                  className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-500/50 dark:hover:text-blue-300"
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
