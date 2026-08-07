import profile from '../data/profile.json'

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-10 text-center">
      <p className="text-sm text-slate-400">
        © {new Date().getFullYear()} {profile.name} · 使用 React + Vite + Tailwind CSS 构建
      </p>
    </footer>
  )
}
