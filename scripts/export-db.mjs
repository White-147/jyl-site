// 导出：从 database/portfolio.db 生成 src/data/*.json（构建数据）
// 用法：npm run db:export（构建前自动执行）
import { DatabaseSync } from 'node:sqlite'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const db = new DatabaseSync(join(root, 'database', 'portfolio.db'))

const write = (f, data) => {
  const p = join(root, 'src', 'data', f)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n')
}

// profile
const profile = {}
for (const row of db.prepare('SELECT key, value FROM profile').all()) profile[row.key] = JSON.parse(row.value)
write('profile.json', profile)

// projects（保持入库顺序）
const projects = db
  .prepare('SELECT * FROM projects ORDER BY sort')
  .all()
  .map((r) => ({
    id: r.id,
    name: r.name,
    tags: JSON.parse(r.tags),
    period: r.period,
    summary: r.summary,
    details: JSON.parse(r.details),
    stack: JSON.parse(r.stack),
    link: r.link,
    ...(r.screenshot ? { screenshot: r.screenshot } : {}),
    ...(r.demo_url ? { demoUrl: r.demo_url } : {}),
    ...(r.demo_note ? { demoNote: r.demo_note } : {}),
    ...(r.preview_url ? { previewUrl: r.preview_url } : {}),
    ...(r.preview_note ? { previewNote: r.preview_note } : {}),
    ...(r.download_url ? { downloadUrl: r.download_url } : {}),
    ...(r.download_note ? { downloadNote: r.download_note } : {}),
    ...(r.download_hint ? { downloadHint: r.download_hint } : {}),
    ...(r.highlight ? { highlight: true } : {}),
  }))
write('projects.json', { projectTags: [...new Set(projects.flatMap((p) => p.tags))], projects })

// skills（多岗位模板聚合：岗位 → 分组 → 词条）
const profiles = db.prepare('SELECT id, label, note FROM skill_profiles ORDER BY rowid').all()
const skillRows = db
  .prepare('SELECT profile_id, group_name, items FROM skills ORDER BY rowid')
  .all()
  .map((r) => ({ profileId: r.profile_id, title: r.group_name, items: JSON.parse(r.items) }))
const skillProfiles = profiles.map((p) => ({
  id: p.id,
  label: p.label,
  note: p.note,
  groups: skillRows.filter((s) => s.profileId === p.id).map(({ title, items }) => ({ title, items })),
}))
write('skills.json', { skillProfiles })

// experience
const experiences = db
  .prepare('SELECT * FROM experience ORDER BY id')
  .all()
  .map((r) => ({ company: r.company, role: r.role, period: r.period, summary: r.summary, points: JSON.parse(r.points) }))
write('experience.json', { experiences })

// education
const ed = db.prepare('SELECT * FROM education WHERE id = 1').get()
write('education.json', {
  education: {
    school: ed.school,
    degree: ed.degree,
    period: ed.period,
    location: ed.location,
    certs: JSON.parse(ed.certs),
    awards: JSON.parse(ed.awards),
  },
})

db.close()
console.log('✔ 已从数据库导出 src/data/*.json')
