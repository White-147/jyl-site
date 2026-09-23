import { contact } from '../data/contact'

/**
 * 页脚：使用站点自己的石墨黑（--color-footer-dark）而不是 Tailwind 默认的近黑 slate-950。
 * 页脚是整页最重的一块色，跑出色系会非常显眼；这里比深色画布浅一档，
 * 靠一条发丝上边线与正文分开，而不是用一块纯黑砸出视觉终点。
 *
 * ⚠️ 页脚**只放版权行**（2026-09 精简）：
 *   原来还有「UE5 学习笔记」与「github.com/White-147」两个入口，但它们与顶栏、联系区完全重复
 *   —— 同一个目标三处入口。页脚是页面终点，重复入口只会削弱它作为「结束」的信号。
 *   需要这两个入口时去顶栏（常驻，任何滚动位置都可用）或联系区（有完整说明与复制按钮）。
 *
 * ⚠️ 页脚在**主页面与文档区**都会渲染（见 App.tsx），新增内容必须对两个视图都成立。
 *   移动端 `pb-20` 是给底部 Tab Bar 让位，桌面端不需要。
 */
export default function Footer() {
  return (
    <footer className="border-t border-line-dark bg-footer-dark py-7 pb-20 text-center md:pb-7">
      <p className="text-sm text-slate-300">
        © {new Date().getFullYear()} {contact.name} · 使用{' '}
        <span lang="en">React + Vite + Tailwind CSS</span> 构建
      </p>
    </footer>
  )
}
