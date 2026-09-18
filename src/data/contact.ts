import profile from './profile.json'

/**
 * 联系方式的混淆层（反爬 L2）。
 *
 * 静态站点的 HTML 会被任意抓取，无法真正加密；这里做的是**提高采集成本**：
 * 1. 邮箱与链接以字符码数组存储，DOM 源码里不出现 `xxx@yyy.zzz` 这种可正则匹配的形态；
 * 2. 页面渲染时才解码并写入 textContent / href；
 * 3. `HONEYPOTS` 是肉眼不可见、只在 DOM 里存在的诱饵地址，无差别爬虫会连它一起抓走。
 *
 * 真实用户完全无感：文本照常显示、照常可选中、点击走「复制」而不是唤起邮件客户端。
 *
 * 注意：`profile.json` 里仍保留原始字段作为唯一内容源；本文件只负责对外暴露的混淆形态。
 * 新增或修改联系方式后，运行 `node scripts/encode-contact.mjs` 重新生成 CODE 表。
 */

/** "abc@x.com" -> charCode 数组 */
export function encode(value: string): number[] {
  return Array.from(value, (ch) => ch.charCodeAt(0))
}

/** charCode 数组 -> 原字符串 */
export function decode(codes: number[]): string {
  return String.fromCharCode(...codes)
}

/* 由 scripts/encode-contact.mjs 生成，勿手改 */
const CODE = {
  emailQq: [
    49, 48, 48, 52, 53, 50, 50, 55, 53, 48, 64, 113, 113, 46, 99, 111,
    109,
  ],
  email: [
    106, 121, 108, 50, 48, 48, 49, 48, 49, 48, 53, 64, 103, 109, 97, 105,
    108, 46, 99, 111, 109,
  ],
  github: [
    104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46, 99,
    111, 109, 47, 87, 104, 105, 116, 101, 45, 49, 52, 55,
  ],
  githubLabel: [
    103, 105, 116, 104, 117, 98, 46, 99, 111, 109, 47, 87, 104, 105, 116, 101,
    45, 49, 52, 55,
  ],
} as const

export const contact = {
  /** 主邮箱（QQ）：联系方式区的主行动，点击即复制 */
  emailQq: decode([...CODE.emailQq]),
  /** 备用邮箱（Gmail） */
  email: decode([...CODE.email]),
  github: decode([...CODE.github]),
  githubLabel: decode([...CODE.githubLabel]),
  /** 简历 PDF 路径（文件名本身不含个人信息，保持明文便于下载链接可用） */
  resumeUrl: profile.resumeUrl,
  name: profile.name,
}

/**
 * 诱饵邮箱：渲染为不可见元素（视觉隐藏但保留在 DOM 中）。
 * 无差别采集器会把它和真实地址一起抓走；真实用户看不见、读屏不播报。
 * 域名使用 IANA 保留的 example.com，永远不会误伤真实收件箱。
 */
export const HONEYPOTS = ['jyl.resume@example.com', 'contact@example.com']
