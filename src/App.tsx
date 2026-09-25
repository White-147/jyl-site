import { useEffect } from 'react'
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
  // hash 路由：`#/docs/<分区>/<页>` 切到文档区，其余情况是主页面
  const route = useDocsRoute()

  /**
   * 通知首屏加载页（`index.html` 的 `#boot`）可以撤了。
   *
   * ⚠️ 主站等**两帧**：第一帧 DOM 有了但还没画，第二帧才真的有像素；
   *    只等一帧会在低端机上"白闪一帧"。
   * ⚠️ 文档区**不走这里** —— 它的正文是运行时 fetch 的，由 `Docs.tsx` 在正文落 DOM 后发信号，
   *    否则会出现"加载页撤了、正文还空着"。
   */
  useEffect(() => {
    if (route.isDocs) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [route.isDocs])

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
        {/* 宣纸纤维层（2026-09 第十二轮）：
            全站背景由"暖画布 + 宣纸纤维 + 琥珀光斑"三层构成，**网格已全部退场**。
            ⚠️ 它必须 `position: fixed`：① 滚动时纤维不漂移；② **玻璃折射要有东西可弯** ——
               `#lg-refract` 现在唯一能弯的就是这层纤维（网格在时弯的是网格）。
            ⚠️ 它同时是 `.cao-mark-layer` 的"底"：纹章 z-index 也是 0，但它在 DOM 里靠后，
               所以纹章压在纸纹**之上**（想让纹章陷进纸里就把这两行顺序对调）。 */}
        <div aria-hidden="true" className="paper-layer" />
        {/* 卷草纹章（2026-09 第十一轮）：**左下角**常驻，单株不铺满。
            五行属木（补本盘最弱且最要紧的那一项 —— 官星即乙木），寓意「生机、延展」。
            来源与许可见 index.css 的 `--cao-mark` 注释 / 页脚署名。
            ⚠️ `<1024px`、文档区、打印三种情况由 CSS 直接隐藏。
            ⚠️ 它不承载信息，所以 `aria-hidden` 让读屏跳过。 */}
        <div aria-hidden="true" className="cao-mark-layer" />
        {/* 印章（2026-09 第十二轮）：**右下角**常驻，与左下的卷草纹配成一对。
            用户定的形制是**阳文**：「里面是印章琥珀色，外面拿个同色外框就行」
            —— 所以是透明底 + 琥珀线条的忍冬纹，外面一圈同色细框，**不是**实底白字。
            内文取 **007 忍冬纹**（不是卷草纹）：「这样不会和左侧卷草纹重复」。
            资源：`public/assets/seal-rendong.webp`（133×160 琥珀线条 + 透明底，4x）。
            ⚠️ 位置口径与卷草纹完全对称：左下一株纹样、右下这枚印章，都 `fixed` 常驻。
            ⚠️ `<1024px`、文档区、打印同样隐藏（见 index.css 的 `.seal-mark-layer`）。 */}
        <div aria-hidden="true" className="seal-mark-layer">
          <span className="seal-mark-inner" />
        </div>
        <TopBar />
        {route.isDocs ? (
          <main>
            {/* 文档区已按「分区 / 页」两级组织（#/docs/<分区>/<页>）——
                一篇源会被拆成多页，所以路由传的是分区 + 页 id，不是文档 id */}
            <Docs section={route.section} pageId={route.pageId} anchor={route.anchor} />
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
