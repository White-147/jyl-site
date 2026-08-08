import { useScrollSpy } from '../hooks/useScrollSpy'
import ThemeToggle from './ThemeToggle'

const sections = [
  { id: 'about', label: '关于' },
  { id: 'projects', label: '项目' },
  { id: 'skills', label: '技能' },
  { id: 'experience', label: '经历' },
  { id: 'education', label: '教育' },
  { id: 'contact', label: '联系' },
]

/** 右侧玻璃管进度导航（贯穿视口版）：
 *  容器全高（fixed top-0 bottom-0）→ 玻璃管 top-6 bottom-6 贯穿近整屏；
 *  返回顶部 / 主题在管外（管上端之上、下端之下）；
 *  章节节点列垂直居中于管中段，圆点中心与管中心严格对齐（糖葫芦穿串）；
 *  Dock 弹性动效：hover 文字+节点同放大，选中常驻放大。 */
export default function SideDotsNav() {
  const active = useScrollSpy(sections.map((s) => s.id))

  return (
    <nav
      aria-label="页面章节导航"
      className="fixed bottom-0 right-4 top-0 z-40 hidden md:flex"
    >
      <div className="relative h-full">
        {/* 玻璃管：贯穿近整屏（光纤质感：半透明 + 模糊 + 内发光） */}
        <span
          className="fixed bottom-6 right-[21px] top-6 w-2 rounded-full border border-white/60 bg-white/40 shadow-[inset_0_0_6px_rgba(59,130,246,0.4),0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-sm dark:border-white/20 dark:bg-white/10"
          aria-hidden="true"
        />

        {/* 管外顶部：返回顶部（↑ 图标 + 左侧常驻提示） */}
        <div className="absolute right-0 top-7">
          <a
            href="#top"
            aria-label="返回顶部"
            title="返回顶部"
            className="group flex items-center justify-end gap-2.5 pr-[4px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
          >
            <span className="w-12 text-right text-xs text-slate-400 transition-colors group-hover:text-blue-700 dark:text-slate-500 dark:group-hover:text-blue-400">
              顶部
            </span>
            <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white shadow-[inset_0_0_3px_rgba(59,130,246,0.5)] ring-2 ring-slate-300 transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-125 group-hover:bg-blue-600 group-hover:ring-blue-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-blue-400" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-1.5 w-1.5 text-slate-600 dark:text-slate-800" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </span>
          </a>
        </div>

        {/* 章节节点列：垂直居中于管中段，圆点骑在管上（糖葫芦） */}
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-1">
          {sections.map((sec) => {
            const isActive = active === sec.id
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={sec.label}
                className={`group flex items-center justify-end gap-2.5 py-1 pr-[4px] transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <span
                  className={`w-12 text-right text-xs transition-colors ${
                    isActive
                      ? 'font-bold text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100'
                  }`}
                >
                  {sec.label}
                </span>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                    isActive
                      ? 'scale-125 bg-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.6)] ring-4 ring-blue-200/70 dark:bg-blue-400 dark:ring-blue-500/20'
                      : 'bg-white shadow-[inset_0_0_3px_rgba(59,130,246,0.5)] ring-2 ring-slate-300 group-hover:scale-125 group-hover:bg-blue-600 group-hover:ring-blue-300 dark:bg-slate-300 dark:ring-slate-500 dark:group-hover:bg-blue-400'
                  }`}
                  aria-hidden="true"
                />
              </a>
            )
          })}
        </div>

        {/* 管外底部：主题切换（圆形小钮 + 左侧常驻提示） */}
        <div className="absolute bottom-7 right-0">
          <div className="flex items-center justify-end gap-2.5 pr-[4px]">
            <span className="w-12 text-right text-xs text-slate-400 dark:text-slate-500">主题</span>
            <ThemeToggle placement="left" variant="dot" />
          </div>
        </div>
      </div>
    </nav>
  )
}
