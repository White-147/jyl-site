// 种库：把 src/data/*.json 的内容写入 database/portfolio.db（SQLite）
// 用法：npm run db:seed
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = join(root, 'database', 'portfolio.db')
const read = (f) => JSON.parse(readFileSync(join(root, 'src', 'data', f), 'utf8'))

mkdirSync(dirname(dbPath), { recursive: true })
const db = new DatabaseSync(dbPath)

db.exec(`
  DROP TABLE IF EXISTS profile;
  DROP TABLE IF EXISTS projects;
  DROP TABLE IF EXISTS skills;
  DROP TABLE IF EXISTS experience;
  DROP TABLE IF EXISTS education;

  CREATE TABLE profile (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE projects (
    sort       INTEGER PRIMARY KEY,
    id         TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    tags       TEXT NOT NULL,
    period     TEXT NOT NULL,
    summary    TEXT NOT NULL,
    details    TEXT NOT NULL,
    stack      TEXT NOT NULL,
    link       TEXT NOT NULL,
    screenshot TEXT,
    demo_url      TEXT,
    demo_note     TEXT,
    download_url  TEXT,
    download_note TEXT,
    highlight  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE skills (
    rowid      INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL UNIQUE,
    items      TEXT NOT NULL
  );

  CREATE TABLE experience (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role    TEXT NOT NULL,
    period  TEXT NOT NULL,
    summary TEXT NOT NULL,
    points  TEXT NOT NULL
  );

  CREATE TABLE education (
    id       INTEGER PRIMARY KEY CHECK (id = 1),
    school   TEXT NOT NULL,
    degree   TEXT NOT NULL,
    period   TEXT NOT NULL,
    location TEXT NOT NULL,
    certs    TEXT NOT NULL,
    awards   TEXT NOT NULL
  );
`)

// profile
const profile = read('profile.json')
const insProfile = db.prepare('INSERT INTO profile (key, value) VALUES (?, ?)')
for (const [k, v] of Object.entries(profile)) insProfile.run(k, JSON.stringify(v))

// projects（按数组顺序记录 sort）
const { projects } = read('projects.json')
const insProj = db.prepare(
  'INSERT INTO projects (sort, id, name, tags, period, summary, details, stack, link, screenshot, demo_url, demo_note, download_url, download_note, highlight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
)
projects.forEach((p, i) =>
  insProj.run(
    i,
    p.id,
    p.name,
    JSON.stringify(p.tags),
    p.period,
    p.summary,
    JSON.stringify(p.details),
    JSON.stringify(p.stack),
    p.link,
    p.screenshot ?? null,
    p.demoUrl ?? null,
    p.demoNote ?? null,
    p.downloadUrl ?? null,
    p.downloadNote ?? null,
    p.highlight ? 1 : 0,
  ),
)

// skills
const { skillGroups } = read('skills.json')
const insSkill = db.prepare('INSERT INTO skills (group_name, items) VALUES (?, ?)')
for (const g of skillGroups) insSkill.run(g.title, JSON.stringify(g.items))

// experience
const { experiences } = read('experience.json')
const insExp = db.prepare('INSERT INTO experience (company, role, period, summary, points) VALUES (?, ?, ?, ?, ?)')
for (const e of experiences) insExp.run(e.company, e.role, e.period, e.summary, JSON.stringify(e.points))

// education
const { education } = read('education.json')
db.prepare('INSERT INTO education (id, school, degree, period, location, certs, awards) VALUES (1, ?, ?, ?, ?, ?, ?)').run(
  education.school,
  education.degree,
  education.period,
  education.location,
  JSON.stringify(education.certs),
  JSON.stringify(education.awards),
)

db.close()
console.log('✔ 数据库已写入:', dbPath)
