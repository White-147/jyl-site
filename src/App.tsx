import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Education from './components/Education'
import Contact from './components/Contact'
import Footer from './components/Footer'
import ScrollProgress from './components/ScrollProgress'
import BackToTop from './components/BackToTop'
import MobileTabBar from './components/MobileTabBar'
import SideDotsNav from './components/SideDotsNav'

export default function App() {
  // 全站只读保护：阻止右键菜单、拖拽、复制与文本选择（覆盖图片与文本；
  // 图片在 CSS 层另有 -webkit-touch-callout 拦截移动端长按保存菜单）
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('dragstart', prevent)
    document.addEventListener('copy', prevent)
    document.addEventListener('selectstart', prevent)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('dragstart', prevent)
      document.removeEventListener('copy', prevent)
      document.removeEventListener('selectstart', prevent)
    }
  }, [])

  return (
    <div className="min-h-screen font-sans text-slate-900 dark:text-slate-100">
      <ScrollProgress />
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
  )
}
