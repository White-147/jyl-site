import { useEffect } from 'react'

/**
 * 内容只读保护（见 docs/联动维护点.md 与本文件注释）。
 *
 * 策略：**默认拒绝，白名单放行**。
 *
 * 为什么不是「全站放开」也不是「全站锁死」：
 * - 全站锁死（历史实现）：`body { user-select: none }` + 拦 copy/selectstart，
 *   会直接阻断「复制邮箱」这一核心任务 —— 招聘方要把邮箱填进 ATS 或转发给同事。
 * - 全站放开（上一版实现）：任何访客都能顺手全选整页正文带走，
 *   对一份以「内容本身即作品」的求职站来说保护过弱。
 *
 * 现在的口径：全站不可选中，只有显式标注 `data-copyable` 的元素可以选中与复制。
 * 目前白名单只有联系区的邮箱（同时提供「点击复制」按钮作为主路径）。
 *
 * 若日后要允许复制别的字段，**给那个元素加 `data-copyable`**，不要放开全局。
 */
const COPYABLE_ATTR = 'data-copyable'

function inCopyable(target: EventTarget | null): boolean {
  return !!(target instanceof Element && target.closest(`[${COPYABLE_ATTR}]`))
}

export default function useReadOnlyGuard() {
  useEffect(() => {
    // 右键菜单：图片上禁止（防另存原图）；文本框内放行（否则无法粘贴/拼写检查）
    const onContextMenu = (e: MouseEvent) => {
      const el = e.target as Element | null
      if (el?.closest('input, textarea')) return
      e.preventDefault()
    }
    // 拖拽：图片禁止拖走
    const onDragStart = (e: DragEvent) => {
      if ((e.target as Element | null)?.closest('img')) e.preventDefault()
    }
    // 复制：只有白名单元素放行
    const onCopy = (e: ClipboardEvent) => {
      if (!inCopyable(e.target)) e.preventDefault()
    }
    // 选择：只有白名单元素内可以开始选择
    const onSelectStart = (e: Event) => {
      if (!inCopyable(e.target)) e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    document.addEventListener('copy', onCopy)
    document.addEventListener('selectstart', onSelectStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('selectstart', onSelectStart)
    }
  }, [])
}
