/**
 * 由 src/data/contact.ts 的 CODE 表反查真实值，并生成编码后的字面量。
 * 用法：node scripts/encode-contact.mjs [--write]
 *   --write  直接改写 src/data/contact.ts 里的 CODE 表（默认只打印）
 *
 * 每次修改 src/data/profile.json 里的邮箱或 GitHub 地址后运行一次。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const profilePath = join(root, 'src', 'data', 'profile.json')
const contactPath = join(root, 'src', 'data', 'contact.ts')

const profile = JSON.parse(readFileSync(profilePath, 'utf8'))

/** 每行最多多少个数字，便于阅读 diff */
const PER_LINE = 16

function format(name, value) {
  const codes = Array.from(value, (ch) => ch.charCodeAt(0))
  const lines = []
  for (let i = 0; i < codes.length; i += PER_LINE) {
    lines.push('    ' + codes.slice(i, i + PER_LINE).join(', ') + ',')
  }
  return `  ${name}: [\n${lines.join('\n')}\n  ],`
}

const fields = {
  emailQq: profile.emailQq,
  email: profile.email,
  github: profile.github,
  githubLabel: profile.githubLabel,
}

for (const [k, v] of Object.entries(fields)) {
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`profile.json 缺少字段 ${k}`)
  }
}

const body = Object.entries(fields)
  .map(([k, v]) => format(k, v))
  .join('\n')

const block = `const CODE = {\n${body}\n} as const`

const source = readFileSync(contactPath, 'utf8')
const next = source.replace(/const CODE = \{[\s\S]*?\} as const/, block)

if (next === source) {
  console.log('[encode-contact] CODE 表已是最新，无需改动。')
  console.log(`  邮箱：${profile.emailQq} / ${profile.email}`)
  console.log(`  仓库：${profile.github}`)
  process.exit(0)
}

if (process.argv.includes('--write')) {
  writeFileSync(contactPath, next, 'utf8')
  console.log('[encode-contact] 已更新 src/data/contact.ts 的 CODE 表。')
} else {
  console.log('[encode-contact] 检测到差异，加 --write 才会写入。即将写入的内容：\n')
  console.log(block)
}
