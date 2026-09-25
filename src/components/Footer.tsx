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
 *
 * ⚠️ 第三行是**纹样出处署名，不是可选文案**（2026-09 第十一轮加）：
 *   左下角的卷草纹章取自开源图库《中国传统纹样图鉴 · Wényàng》（006 卷草纹），
 *   该项目对**图像内容**采用 **CC BY-NC 4.0** ——「署名」是这份许可的使用条件之一，
 *   删掉这一行即等于违反许可。若将来要把本站用于商业用途，须先向原作者取得授权，
 *   或把纹章替换为自有/公有领域素材。
 */
export default function Footer() {
  return (
    /* ⚠️ 页脚上缘那道**琥珀弧光**是"金色暖章"的第二处（2026-09 第十二轮）：
       `relative` + 一个绝对定位的 `arc` 层，纯 radial-gradient，零请求。
       它对应命理的"丙丁火第一"（火为暖局之神）—— 页脚是整页的收尾，
       在这儿点一盏暖灯，比在正文区加装饰更克制、也不干扰阅读。 */
    <footer className="relative overflow-hidden border-t border-line-dark bg-footer-dark py-7 pb-20 text-center md:pb-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(120%_80%_at_50%_130%,rgb(217_122_6/0.16),transparent_62%)]"
      />
      {/* 印章（手机/平板，2026-09 第十二轮）：用户要「手机端也加上 PC 的那两个图案」，
          并定尺寸「印章缩到 52」。
          ⚠️ 与 PC 那枚（`App.tsx` 的 `.seal-mark-layer`，fixed 在视口右下）是**同一套图形**，
             只是这里改用**段内绝对定位**（页脚本身已经是 `relative overflow-hidden`）：
             手机上 fixed 会全程贴着屏幕压正文，页脚内 absolute 只在收尾处出现。
          ⚠️ 桌面端由 CSS 隐藏（见 `.footer-seal-mark`），继续用那枚 fixed 的。
          几何依据：390 宽实测页脚高 149、印章 52×52 放右下角，与文字相交数为 0。 */}
      <span aria-hidden="true" className="footer-seal-mark">
        <span className="footer-seal-mark-inner" />
      </span>
      <p className="relative text-sm text-slate-300">
        © {new Date().getFullYear()} {contact.name} · 使用{' '}
        <span lang="en">React + Vite + Tailwind CSS</span> 构建
      </p>
      <p className="relative mt-1.5 text-xs text-slate-400">
        卷草纹样取自{' '}
        <a
          className="underline decoration-dotted underline-offset-2 transition-colors hover:text-brand-300"
          href="https://github.com/dososo/chinese-traditional-patterns"
          target="_blank"
          rel="noreferrer noopener"
        >
          中国传统纹样图鉴 · Wényàng
        </a>
        （<span lang="en">CC BY-NC 4.0</span>，非商业使用）
      </p>
    </footer>
  )
}
