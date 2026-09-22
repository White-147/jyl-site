import { contact } from '../data/contact'

/**
 * 页脚：使用站点自己的青黑（--color-footer-dark）而不是 Tailwind 默认的近黑 slate-950。
 * 页脚是整页最重的一块色，跑出色系会非常显眼；这里比深色画布浅一档，
 * 靠一条发丝上边线与正文分开，而不是用一块纯黑砸出视觉终点。
 *
 * 注意：页脚在**主页面与文档区**都会渲染（见 App.tsx），所以这里的链接要同时
 * 对两个视图成立 —— 用 `#/docs/ue5` 这类 hash 路由，不要写只对主页有效的页内锚点。
 */
export default function Footer() {
  return (
    <footer className="border-t border-line-dark bg-footer-dark py-10 pb-24 text-center md:pb-10">
      <p className="text-sm text-slate-300">
        <a
          href="#/docs/ue5"
          className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-brand-200"
        >
          UE5 学习笔记
        </a>
        <span className="mx-2.5 text-slate-600" aria-hidden="true">
          ·
        </span>
        <a
          href={contact.github}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-brand-200"
        >
          <span lang="en">{contact.githubLabel}</span>
        </a>
      </p>
      <p className="mt-3 text-sm text-slate-300">
        © {new Date().getFullYear()} {contact.name} · 使用{' '}
        <span lang="en">React + Vite + Tailwind CSS</span> 构建
      </p>
    </footer>
  )
}
