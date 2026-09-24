import { HONEYPOTS, contact } from '../data/contact'
import { Toast, useCopyFeedback, useToast } from './Toast'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

/**
 * 联系区四颗入口共用一套材质。
 *
 * 用户 2026-09 的要求：「QQ 邮箱和右侧两个按钮应该统一」「四颗完全一致」，
 * 所以**不再**让第一颗走琥珀实底强调 —— 四颗都是玻璃小件 + 悬停整面泛光，
 * 差别只有图标与文案。`--chip-*` / `--glass-*` 两套 token 已经覆盖深浅色，
 * 这里不需要任何 `dark:` 变体（旧的 `border-slate-300 bg-white … dark:bg-slate-900`
 * 手工配对正是"框纯色"的来源，已删）。
 */
const chipClass =
  'glass-chip glass-lit inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors'

export default function Contact() {
  const toast = useToast()
  const primary = useCopyFeedback(contact.emailQq, toast.show)
  const backup = useCopyFeedback(contact.email, toast.show)

  return (
    <section id="contact" className="relative anchor-offset section-loose">
      <div className="rail-gutter mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          sectionId="contact"
          title="期待与您交流"
          description="点击邮箱即可复制，或直接下载简历。"
        />

        <Reveal delay={100} className="mt-12">
          {/* ⚠️ 这块大面板**不加** `.glass-lit`：面积太大，整面泛光会显得浮夸，
                而且面板内部四颗按钮各有自己的泛光，一起动起来很乱
                （用户 2026-09：「外面那个大框不需要玻璃特效，太浮夸，一起动起来不好看」）。
                玻璃材质本身照旧由 `.glass-panel` 提供。 */}
            <div className="glass-panel relative overflow-hidden rounded-3xl p-8 text-center sm:p-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-15"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
                backgroundSize: 'var(--grid-size) var(--grid-size)',
              }}
            />
            <div className="relative">
              <p className="text-lg leading-relaxed break-words text-slate-600 dark:text-slate-300">
                欢迎通过邮件或 GitHub 联系我，也可直接下载简历。
              </p>
              {/* 两个邮箱：点击复制而不是唤起邮件客户端（招聘方多为复制到 ATS 或转发）。
                  邮箱文本保留在按钮里（可选中、读屏可读、`data-copyable` 白名单放行），
                  所以下方**不再重复列一遍** —— 那是纯冗余（用户 2026-09：「按钮里面有 QQ 邮箱
                  和 GitHub，底部文本栏还有，这个最好也是需要去重优化」）。 */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={primary.copy}
                  aria-label={`复制 QQ 邮箱 ${contact.emailQq}`}
                  title="点击复制 QQ 邮箱"
                  data-copyable
                  className={chipClass}
                >
                  {primary.copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <rect x="9" y="9" width="12" height="12" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  )}
                  <span lang="en" data-copyable>{contact.emailQq}</span>
                </button>
                <button
                  type="button"
                  onClick={backup.copy}
                  aria-label={`复制备用邮箱 ${contact.email}`}
                  title="点击复制 Gmail（备用）"
                  data-copyable
                  className={chipClass}
                >
                  {backup.copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <rect x="9" y="9" width="12" height="12" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  )}
                  <span lang="en" data-copyable>{contact.email}</span>
                </button>
              </div>
              {/* 第二行：外部入口。与上面两颗**完全同一套材质**（用户：「四颗完全一致」），
                  不再让「下载简历」走实底强调 —— 强调靠位置与文案，不靠换材质。 */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={contact.github}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={chipClass}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  <span lang="en">{contact.githubLabel}</span>
                </a>
                <a
                  href={contact.resumeUrl}
                  download
                  rel="nofollow"
                  referrerPolicy="no-referrer"
                  className={chipClass}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  下载简历
                </a>
              </div>
              {/* 诱饵地址：视觉隐藏、读屏忽略，只存在于 DOM 供无差别采集器抓取 */}
              <span className="sr-only" aria-hidden="true">
                {HONEYPOTS.map((mail) => (
                  <a key={mail} href={`mailto:${mail}`}>
                    {mail}
                  </a>
                ))}
              </span>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 收尾呼吸区（scrim）：让「联系我」这一段也能停在锚点停靠位。
          ⚠️ 为什么需要，以及为什么是"最小必需"而不是"越大越好"：
          `#contact` 是最后一段，它下面只有页脚。要让它停在停靠位（顶部留 `margin`），需要
              可滚动量 ≥ 段顶 − margin
          可滚动量 = 文档高 − 视口高，于是**需要的收尾高度 = max(0, 视口高 − 页脚高 − margin)**。
          这个需求随视口高度**线性增长**：900 高时约 663px、1200 高时约 963px。
          而呼吸区在视觉上就是"正文下方的一片空白"——需求与观感直接冲突。
          2026-09 的取舍（用户确认「乙：保留最小必需」）：
              呼吸区 = clamp(8rem, 30vh − 8rem, 15rem)
              —— 矮屏够用、高屏封顶在 240px，不再让空白无限长。
          代价：视口高于约 1000px 时「联系我」滚不到精确停靠位（标题会落在视口偏下的位置）；
                导轨高亮判定与玻璃管液柱仍自洽（三者读同一组 scrollTargets 值），只是那一段不够"贴顶"。
          ⚠️ 改这里必须重跑一次「视口高度扫描」（见 docs/联动维护点.md 第 6 条的验证方法）。
          它只是一块背景，与全站背景层连续，不会被读成"空白区块"。 */}
      <div
        aria-hidden="true"
        className="h-[clamp(8rem,calc(30vh-8rem),15rem)] sm:h-[clamp(8rem,calc(34vh-8rem),15rem)]"
      />
      <Toast message={toast.message} />
    </section>
  )
}
