import { ThemeProvider } from './hooks/useTheme'
import useReadOnlyGuard from './hooks/useReadOnlyGuard'
import { useDeepLinkCorrection } from './hooks/useAnchorScroll'
import { useDocsRoute } from './hooks/useDocsRoute'
import TopBar from './components/TopBar'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Education from './components/Education'
import Contact from './components/Contact'
import Footer from './components/Footer'
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
      {/* ⚠️ 布局骨架（2026-09 改版，见 docs/联动维护点.md 第 3 / 5 / 6 条）
            · `TopBar` 是**全端常驻**的顶部栏，主页面与文档区共用 —— 它承载
              「文档入口 / 返回顶部 / 主题 / 下载简历」四件全局操作。
              关键收益：文档区现在也能切主题（此前主题控件只挂在主页面那三个浮层里，
              而文档区一个都不渲染）。
            · 原 `Navbar`（手机吸顶胶囊）与 `BackToTop`（手机浮动圆钮）已删除，
              职责全部并入 TopBar；右侧玻璃管只保留「章节节点 + 液柱」。
            · 底部 Tab Bar 仍只在主页面渲染（文档区没有可滚动的章节），
              视觉改成与顶栏同材质的浮动胶囊。 */}
      <div className="app-root min-h-screen font-sans text-slate-900 dark:text-slate-100">
        <TopBar />
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
            <SideDotsNav />
            <MobileTabBar />
          </>
        )}
        <Footer />
      </div>
    </ThemeProvider>
  )
}
