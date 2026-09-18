/**
 * 锚点滚动偏移（单一来源）。
 *
 * ⚠️ 联动维护点（详见 docs/联动维护点.md 第 6 条）
 * 三处必须一致，改一处就要改全部：
 *   1. 这里定义的值
 *   2. 各 section 的锚点停靠类名 `ANCHOR_OFFSET_CLASS`（通过 index.css 的 @utility 生成）
 *   3. 滚动侦测的判定线（useScrollSpy 读取这里的值）
 *
 * 数值怎么来的：
 *   手机端顶部有吸顶胶囊导航（mt-3 12px + h-14 56px = 68px，位于 y=0..80），
 *   锚点必须停在浮层下方并留出呼吸间隙，所以取 104px = 浮层 80 + 间隙 24。
 *   桌面 / 平板无顶部浮层（导航在右侧玻璃管），取 88px 作为较紧凑的上留白。
 *
 * 历史问题（两轮）：
 *   - 第一轮：停靠位 64px（scroll-mt-16）而侦测线 128px，点击导航跳转后高亮停在上一段。
 *   - 第二轮：两者统一 80px，但手机端浮层正好占 0..80px，标题紧贴浮层下沿、零间隙。
 */

/** 移动端（< 640px）：顶部浮层 80px + 呼吸间隙 24px */
const MOBILE_ANCHOR_OFFSET_PX = 104

/** ≥ 640px：无顶部浮层，仅留上呼吸空间 */
const DESKTOP_ANCHOR_OFFSET_PX = 88

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
