import { useEffect } from 'react'
import { ThemeProvider } from './hooks/useTheme'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Education from './components/Education'
import Contact from './components/Contact'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import MobileTabBar from './components/MobileTabBar'
import SideDotsNav from './components/SideDotsNav'

export default function App() {
  // 只读保护（收窄版）：仅拦截图片相关的右键菜单与拖拽，防止原图被右键另存/拖走。
  // 文本选择与复制**不再拦截**——招聘方需要复制邮箱、摘录项目描述，
  // 全站锁死会直接阻断核心任务。图片在 CSS 层另有 -webkit-touch-callout 拦截移动端长按保存菜单。
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('img')) e.preventDefault()
    }
    const onDragStart = (e: DragEvent) => {
      if ((e.target as Element | null)?.closest('img')) e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])

  return (
    <ThemeProvider>
      <div className="app-root min-h-screen font-sans text-slate-900 dark:text-slate-100">
        <Navbar />
        <main>
          <Hero />
          <About />
          <Projects />
          <Skills />
          <Experience />
          <Education />
          <Contact />
        </main>
        <Footer />
        <BackToTop />
        <SideDotsNav />
        <MobileTabBar />
      </div>
    </ThemeProvider>
  )
}
