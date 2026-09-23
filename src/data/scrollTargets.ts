/**
 * 锚点滚动偏移。
 *
 * ⚠️ 联动维护点（详见 docs/联动维护点.md 第 6 条）
 *
 * 这两个值在**四个地方**各有一份，改一处就必须改全部（2026-09 核对后的完整清单）：
 *   1. 本文件的 MOBILE_ANCHOR_OFFSET_PX / DESKTOP_ANCHOR_OFFSET_PX（JS 侧判定线）
 *   2. `src/index.css` 的 `.anchor-offset` 两条 `scroll-margin-top`（112px / 104px）
 *   3. `src/index.css` 的 `--site-bar-h: 4rem` 与首屏 `calc(100svh - 4rem)`
 *   4. `index.html` 首屏骨架里的 `calc(100vh - 4rem)`（内联关键 CSS，构建期不会同步）
 *
 * ⚠️⚠️ 这里**没有**机制保证它们一致，别被注释骗了（2026-09 修正）：
 *   曾经有一个 `ANCHOR_OFFSET_CLASS` 常量，注释写着"由 index.css 的 `@utility` 按上面两个值生成，
 *   保证值与类名不会各改一半"。**那个保证不存在** —— index.css 明确写了不能用 `@utility`
 *   （实测 Tailwind v4 的 @utility 会把嵌套的 @media 丢掉），实际是硬编码两个字面量；
 *   而该常量全仓库零 import，6 个 section 各自硬编码 `anchor-offset` 类名。
 *   已删除该常量，改为在本注释里如实列出全部位置。
 *   真正要防的漂移点见 `scripts/check-linkage.mjs`（构建期校验，若尚未建立则需人工核对）。
 *
 * 数值怎么来的：
 *   `TopBar` 是**全端常驻**的顶部栏，高度 = h-16（64px）。三端都按「顶栏 64 + 呼吸间隙」计算：
 *     手机 112px = 64 + 48（手机上多留一点间隙更透气）
 *     桌面 104px = 64 + 40
 *
 * 历史问题（两轮，都是"停靠位与判定线不一致"）：
 *   - 第一轮：停靠位 64px（scroll-mt-16）而侦测线 128px，点击导航跳转后高亮停在上一段。
 *   - 第二轮：两者统一 80px，但手机端浮层正好占 0..80px，标题紧贴浮层下沿、零间隙。
 */

/** 移动端（< 640px）：顶栏 64px + 呼吸间隙 48px */
const MOBILE_ANCHOR_OFFSET_PX = 112

/** ≥ 640px：顶栏同为 64px，间隙收一点 */
const DESKTOP_ANCHOR_OFFSET_PX = 104

/** 判定线容差：吸收跳转落点的子像素误差（实测会有 1px 级偏差） */
const TRIGGER_EPSILON_PX = 2

export const SCROLL_MARGIN_MOBILE_PX = MOBILE_ANCHOR_OFFSET_PX
export const SCROLL_MARGIN_DESKTOP_PX = DESKTOP_ANCHOR_OFFSET_PX

/** 判定线容差（消费者只有 useScrollSpy） */
export const SCROLL_TRIGGER_EPSILON_PX = TRIGGER_EPSILON_PX
