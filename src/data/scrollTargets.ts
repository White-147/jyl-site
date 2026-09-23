/**
 * 锚点滚动偏移（单一来源）。
 *
 * ⚠️ 联动维护点（详见 docs/联动维护点.md 第 6 条）
 * 三处必须一致，改一处就要改全部：
 *   1. 这里定义的值
 *   2. 各 section 的锚点停靠类名 `ANCHOR_OFFSET_CLASS`（index.css 里的 .anchor-offset）
 *   3. 滚动侦测的判定线（useScrollSpy 读取这里的值）
 *
 * 数值怎么来的（2026-09 改版后重算）：
 *   `TopBar` 现在是**全端常驻**的顶部栏（以前只有手机端有吸顶胶囊、桌面端没有浮层），
 *   高度 = h-16（64px）。所以三端都按「顶栏 64 + 呼吸间隙」计算：
 *     手机 112px = 64 + 48（手机上底栏与导轨都不占顶部，多留一点间隙更透气）
 *     桌面 104px = 64 + 40
 *   ⚠️ 改 `.site-bar` 的高度（h-16）或内边距，必须回来改这两个值 ——
 *   `.anchor-offset` 的 scroll-margin-top 与侦测线都读这里。
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

/**
 * 锚点停靠类名。由 index.css 的 `@utility` 按上面两个值生成，
 * 保证「值」与「类名」不会各改一半。
 */
export const ANCHOR_OFFSET_CLASS = 'anchor-offset'

export const SCROLL_MARGIN_MOBILE_PX = MOBILE_ANCHOR_OFFSET_PX
export const SCROLL_MARGIN_DESKTOP_PX = DESKTOP_ANCHOR_OFFSET_PX

/** 判定线容差（导出供文档与校验引用） */
export const SCROLL_TRIGGER_EPSILON_PX = TRIGGER_EPSILON_PX
