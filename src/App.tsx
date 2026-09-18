import { ThemeProvider } from './hooks/useTheme'
import useReadOnlyGuard from './hooks/useReadOnlyGuard'
import { useDeepLinkCorrection } from './hooks/useAnchorScroll'
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
  // 内容只读保护：默认拒绝选中/复制，只有标注 data-copyable 的元素放行。
  // 具体口径与原因见 src/hooks/useReadOnlyGuard.ts 的注释。
  useReadOnlyGuard()
  // 深链兜底：带 #id 直接打开时，浏览器可能少滚一段，静默纠正一次
  useDeepLinkCorrection()

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
