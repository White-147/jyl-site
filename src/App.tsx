import { ThemeProvider } from './hooks/useTheme'
import useReadOnlyGuard from './hooks/useReadOnlyGuard'
import { useDeepLinkCorrection } from './hooks/useAnchorScroll'
import { useDocsRoute } from './hooks/useDocsRoute'
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
import Docs from './components/Docs'

export default function App() {
  // 内容只读保护：默认拒绝选中/复制，只有标注 data-copyable 的元素放行。
  // 具体口径与原因见 src/hooks/useReadOnlyGuard.ts 的注释。
  useReadOnlyGuard()
  // 深链兜底：带 #id 直接打开时，浏览器可能少滚一段，静默纠正一次
  useDeepLinkCorrection()
  // hash 路由：`#/docs/ue5/<id>` 切到 UE 文档区，其余情况是主页面
  const route = useDocsRoute()

  return (
    <ThemeProvider>
      {/* 文档区是**独立视图**：顶部胶囊导航与页脚保留（返回主站的路径），
          但首屏/滚动侦测/右侧导轨/底部 Tab Bar 全部不渲染 —— 它们依赖的 section
          在这个视图里并不存在。 */}
      <div className="app-root min-h-screen font-sans text-slate-900 dark:text-slate-100">
        <Navbar />
        {route.isDocs ? (
          <main>
            <Docs docId={route.docId} anchor={route.anchor} />
          </main>
        ) : (
          <>
            <main>
              <Hero />
              <About />
              <Projects />
              <Skills />
              <Experience />
              <Education />
              <Contact />
            </main>
            <BackToTop />
            <SideDotsNav />
            <MobileTabBar />
          </>
        )}
        <Footer />
      </div>
    </ThemeProvider>
  )
}
