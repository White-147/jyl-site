import { contact } from '../data/contact'

/**
 * 页脚：使用站点自己的青黑（--color-footer-dark）而不是 Tailwind 默认的近黑 slate-950。
 * 页脚是整页最重的一块色，跑出色系会非常显眼；这里比深色画布浅一档，
 * 靠一条发丝上边线与正文分开，而不是用一块纯黑砸出视觉终点。
 */
export default function Footer() {
  return (
    <footer className="border-t border-line-dark bg-footer-dark py-10 pb-24 text-center md:pb-10">
      <p className="text-sm text-slate-300">
        © {new Date().getFullYear()} {contact.name} · 使用{' '}
        <span lang="en">React + Vite + Tailwind CSS</span> 构建
      </p>
    </footer>
  )
}
