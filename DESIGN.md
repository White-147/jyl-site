---
name: 蒋宇龙 · 个人作品集
description: 石墨 · 琥珀 —— 面向招聘方的中文个人求职作品集单页
colors:
  amber-700: "#9d5300"
  amber-600: "#b96200"
  amber-500: "#d97a06"
  amber-300: "#f2a93b"
  amber-200: "#f3d9ac"
  amber-100: "#fbecd3"
  amber-50: "#fdf8ef"
  ink: "#1a1c1e"
  ink-on-dark: "#e6e8e9"
  canvas-light: "#fafbfb"
  canvas-dark: "#121415"
  surface-light: "#ffffff"
  surface-dark-raised: "#1b1e20"
  surface-dark-card: "#23282b"
  line-dark: "#2c3234"
  footer-graphite: "#0d0f10"
typography:
  display:
    fontFamily: "Smiley Sans, Noto Sans SC, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.3125rem + 0.9375vw, 1.875rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  signature:
    fontFamily: "Liu Jian Mao Cao, Smiley Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.875rem + 3.125vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  numeric:
    fontFamily: "Fraunces, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.5rem, 1.3125rem + 0.9375vw, 1.875rem)"
    fontWeight: 500
  body:
    fontFamily: "Noto Sans SC, Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "clamp(0.9375rem, 0.875rem + 0.3125vw, 1rem)"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Noto Sans SC, Inter, PingFang SC, system-ui, sans-serif"
    fontSize: "clamp(0.6875rem, 0.6563rem + 0.1563vw, 0.75rem)"
    fontWeight: 600
    letterSpacing: "0.1em"
  mono:
    fontFamily: "Victor Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "clamp(0.6875rem, 0.6563rem + 0.1563vw, 0.75rem)"
    fontWeight: 400
rounded:
  chip: "9999px"
  control: "0.5rem"
  panel: "0.75rem"
  card: "1rem"
  hero-card: "1rem"
  well: "1.5rem"
spacing:
  section-tight: "3.5rem"
  section-base: "5.5rem"
  section-loose: "7rem"
  block: "3rem"
  card-pad-mobile: "1.25rem"
  card-pad-desktop: "1.75rem"
components:
  button-primary:
    backgroundColor: "{colors.amber-700}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "#804400"
  button-ghost:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.amber-700}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.25rem"
  pill-filter:
    backgroundColor: "{colors.amber-700}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "0.375rem 1rem"
  pill-filter-idle:
    backgroundColor: "{colors.surface-light}"
    textColor: "#4a6165"
    rounded: "{rounded.chip}"
    padding: "0.375rem 1rem"
  chip-tech:
    backgroundColor: "#eef0f1"
    textColor: "#4a6165"
    rounded: "{rounded.chip}"
    padding: "0.125rem 0.5rem"
  card-panel:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.card}"
    padding: "1.75rem"
    size: "full-width column"
  card-tinted:
    backgroundColor: "rgba(255,255,255,0.74)"
    rounded: "{rounded.hero-card}"
    padding: "1.75rem"
  input-search:
    backgroundColor: "{colors.surface-light}"
    textColor: "#3b5155"
    rounded: "{rounded.panel}"
    padding: "0.625rem 2.5rem"
    height: "2.75rem"
  nav-rail-node:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.chip}"
    size: "0.625rem"
---

# Design System: 蒋宇龙 · 个人作品集

## 1. Overview

**Creative North Star: "石墨档案"（The Graphite Dossier）**

这是一份**档案**，不是一张海报。视觉系统的全部工作是把密集的技术履历组织成可信、可核对的条目：编号、发丝分隔线、对齐的元数据、克制的色彩。琥珀色承担全部意义载荷（可交互、可点击、当前项），其余一律退到**零彩度**的石墨中性族里去。页面允许自己安静，因为它要证明的是"这个人做事有条理"，而不是"这个页面很漂亮"。

系统的密度是**受控的高密度**。中文正文 15–16px、行高 1.625，段落长度压在 40 字以内；卡片内部边距 20–28px，段与段之间用 56 / 88 / 112px 三档不等距留白分段，而不是每段一个固定值。留白用来划断，不用来表演。任何一段空白如果不能帮助读者理解层级，就是浪费。

明确拒绝的东西，与 PRODUCT.md 的反参考逐条对应：紫色渐变加星芒图标的 hero、"浮动仪表盘叠在渐变上"、三列等大特性卡、统一 bento 盒阵、滚动劫持、回弹缓动、自定义光标、把 `backdrop-filter` 当默认皮肤。这些模式已经被公开的 AI 设计特征数据证实是最高频的"AI 味"信号，本系统一律禁止。

**Key Characteristics:**
- 单色系承载意义：琥珀是唯一的强调色，且只用在"可交互 / 当前 / 关键数字"三处
- 中性色**零彩度**（chroma = 0），没有一处带色相的灰；强调色只由琥珀承担
- 三级卡片，按"是否需要透视"划分，而不是按重要性划分
- 深色模式用**背景色阶**表达层级，不用阴影
- 发丝线优先于盒子：能用 1px 线分开的，不加容器
- 动效只做状态反馈与一次性入场，不做编排；无回弹

## 2. Colors

一套冷调石墨体系：底色完全中性、不带色相，唯一带色相的是琥珀强调。浅色模式 50→700 逐步变深，深色模式反向逐步变浅。

### Primary
- **琥珀深** (`amber-700` `#9d5300`): 唯一的主色。主按钮底、选中胶囊底、正文级强调文字、当前导航节点。承载正文级文字，白字 5.72:1、画布 5.52:1。
- **琥珀中** (`amber-600` `#b96200`): 只用于**非文字**场景：图标描边。禁止承载 24px 以下文字（画布 4.27:1）。
- **琥珀亮** (`amber-500` `#d97a06`): 光斑、粒子、进度条渐变暗端。纯装饰层，**禁止承载任何文字**（画布 3.03:1）。
- **琥珀浅** (`amber-100` `#fbecd3`) / **琥珀极浅** (`amber-50` `#fdf8ef`): 卡片内的浅底块、关键词标签底、头像 ring。
- **琥珀淡** (`amber-200` `#f3d9ac`) / **琥珀闪** (`amber-300` `#f2a93b`): 深色模式下的强调替身。深琥珀在深底上会失声，这两档接管"H1 副题、关键数字、当前导航项"（深底 13.49:1 / 9.25:1）。

### Neutral
- **墨** (`ink` `#1a1c1e`): 浅色模式的标题色。**chroma 为 0** 的石墨近黑（画布 16.49:1），绝不用纯黑。
- **暗场墨** (`ink-on-dark` `#e6e8e9`): 深色模式的正文与标题（深底 15.03:1）。刻意压到 15:1 而不是纯白，避免近黑底上的高亮晕影。
- **画布** (`canvas-light` `#fafbfb`) / **深色画布** (`canvas-dark` `#121415`): 页面基色，两者同一族、只反向。
- **深色三级层级** (`surface-dark-raised` `#1b1e20` → `surface-dark-card` `#23282b` → `line-dark` `#2c3234`): 深色模式靠**背景色阶**表达浮起，发丝线只做边界不做深度。全部为纯中性石墨，与浅色模式同一族。
- **中性中间档**（实际取值，组件里以 `slate-*` 引用）：浅色方向 `slate-200 #dfe2e3`（卡边）/ `slate-400 #52767a`（日期、单位等小字，5.60:1）/ `slate-500 #4a6165`（次级正文，6.38:1）/ `slate-600 #333a3d`（正文，11.17:1）；深色模式这四档**反向重定值**，保证 `text-slate-400` 这类写法在两套主题下都 ≥4.5:1，不必逐个加 `dark:` 变体。
- **页脚石墨** (`footer-graphite` `#0d0f10`): 页脚专用色。比画布深一档，靠一条上边线与正文分开，不用纯黑块砸出一个视觉终点。

### Named Rules
**The One Meaning Rule.** 琥珀代表"可用 / 当前 / 关键"。装饰、边框、背景一律不得使用主色。一屏之内主色覆盖面积不超过 10%。

**The Zero-Chroma Neutral Rule.** 石墨族的中性色 **chroma 必须为 0**：底色不带任何主色色相。禁止 `#000` 与 `#fff`（用 `#1a1c1e` / `#121415` / `#fafbfb` 一类的近黑近白代替），也禁止把中性色染成暖调或冷调。审计方法：把任意一个灰放进 HSL，饱和度应为 0%；若某个灰看起来"发黄"或"发蓝"，它就不在系统里。这条是 2026-09 改版的核心 —— 旧版把整个中性族染成青调（hue ≈ 195–200），与"底色应当安静、只有强调色说话"的目标相悖。

**The Contrast Floor Rule.** 任何承载正文的色值与它的实际背景组合必须 ≥ 4.5:1；装饰性图形边界 ≥ 3:1。`amber-600` 与 `amber-500` 永远不承载小字。

## 3. Typography

**Display Font:** Smiley Sans 得意黑（自托管子集，OFL）；回退 Noto Sans SC
**Body Font:** Noto Sans SC（自托管子集，**400/500/700 三档**；900 档已删除 —— 全站无引用，一个中文字重子集约 146KB）；回退 Inter、PingFang SC、Microsoft YaHei
**Signature Font:** Liu Jian Mao Cao 柳建毛草（OFL，仅 Hero 名字）
**Numeric Font:** Fraunces（latin 子集，统计数字）
**Label/Mono Font:** Victor Mono（latin + italic，行号、代码彩蛋、键名）

**Character:** 五层分工，一层一个职务，互不兼职。得意黑是斜切墨体，笔画带刀口，适合中文大标题的"工程感"；柳建毛草是品牌签名，只在首屏出现一次；Fraunces 给阿拉伯数字一个衬线的重量感，让"800 条/日"这种数字从周围的中文里跳出来；Victor Mono 提供"这是代码/这是编号"的语义信号。正文一律 Noto Sans SC，不做花样。

### Hierarchy
- **Signature** (400, `clamp(2.5rem, 1.875rem + 3.125vw, 4.25rem)`, 1.08): 仅 Hero 名字。草书是本人的品牌资产，不承担信息传递职责（页面其它位置有同名文本）。
- **Display** (400, `clamp(1.5rem, …, 1.875rem)`, 1.15): 区块标题（h2）。使用 `text-wrap: balance` 消除孤字。
- **Headline** (400, `clamp(1.1875rem, …, 1.25rem)`, 1.12): 区块内的定位短语，如"三段经历 · 从数据到应用"。
- **Title** (700, `clamp(1.0625rem, …, 1.125rem)`, 1.3): 卡片与项目名。
- **Body** (400/500, `clamp(0.9375rem, …, 1rem)`, 1.625): 正文。桌面每行 45–65 汉字，移动端 30–40 字。使用 `text-wrap: pretty`。
- **Label** (600, `clamp(0.6875rem, …, 0.75rem)`, 0.1em, 大写): 区块眉题、状态标签、元数据。
- **Mono** (400, `clamp(0.6875rem, …, 0.75rem)`): 项目行号、代码彩蛋、技术键名。

### Named Rules
**The Three-Weight Rule.** 正文字族**只用** 400 / 500 / 700 三个字重，`@font-face` 也只声明这三档（900 档已于 2026-09 删除：全站无引用，一个中文字重子集约 146KB，没有理由让每个访客下载）。禁止使用字重 100–300 或 900（中文子集不含该档，会回退到系统字体并触发合成加粗）。

**The No-Synthesis Rule.** 全站 `font-synthesis: none`。宁可回退到系统字体的真实字重，也不接受浏览器伪造的粗体。

**The Language Tag Rule.** 内嵌的英文技术名词（React、TypeScript、Electron 等）必须标 `lang="en"`，避免读屏按中文读法念。中文页根节点为 `lang="zh-CN"`。

## 4. Elevation

**混合制，但以色调分层为主。** 浅色模式下页面是一张连续画布，浮起的东西靠"更白的底 + 1px 发丝边 + 极轻的环境阴影"表达；深色模式下阴影全部失效，层级完全由**背景色阶**承担（画布 `#121415` → 抬升面 `#1b1e20` → 卡片面 `#23282b`，发丝线 `#2c3234`）。禁止在深色模式用亮边框模拟浮起。

卡片严格分三档，划分依据是**是否需要透视**，不是重要性：

- **玻璃面板（Glass panel，`.glass-panel`）**：每个区块的**主容器**（关于我 ×2、技能、工作经历、教育背景、联系）。这是 2026-09 第四轮新加的一档，替代原来的"实心面板 / 轻色板"二分。
  - 色值全部走变量（`--panel-tint-strong` / `--panel-edge` / `--panel-rim` / `--panel-shadow`），**主题只换变量、不换规则** —— 组件的 class 里因此不再需要写 `dark:border-*` / `dark:bg-*`。这正是用户提这件事的动机："深浅色仅需要调整背景和文本，框体颜色就不需要再一起跟着变了"。
  - 边缘用**白系发丝边**（浅色 62% 白 / 深色 9% 白），两套主题同一支，不再手工配对。
  - 折射：`backdrop-filter: url(#lg-refract-soft) saturate(1.12)`，弱档（`scale=6`）。面板面积大，位移一大就像哈哈镜。
  - **有东西可弯**：`body::before` 是一层 fixed 的 48px 全局网格，所以折射出来是"网格被玻璃轻轻扭了一下"，而不是白做。这是当初判定"静态卡片加模糊收益接近零"的前提已经变了的地方 —— 网格层是后加的。
- **色阶卡（Tonal card，`.glass-card` / `.glass-card-strong`）**：区块内的小卡（技能分组、证书、能力链路）。半透明底 + 发丝边，**不加 `backdrop-filter`**。与玻璃面板同一套变量，所以主题切换同样只换变量。
- **发丝线行（Hairline row）**：项目区。不用盒子，靠行号节奏与交错分段。
- **毛玻璃（Frosted）**：固定与浮层元素：**常驻顶部栏**、手机底部 Tab Bar、右侧导航玻璃管、灯箱遮罩、主题下拉。全部保留 `backdrop-filter`，因为它们真的需要透视下方滚动内容。
  - **顶栏玻璃是"透明 + 边缘折射"而不是模板毛玻璃**（2026-09 第四轮定稿）。用户原话："它们那些玻璃本身就是透明的，底部防止重叠走的类似于水波纹的折射效果，毛玻璃的雾化效果几乎是没有的。" 做法：
    - **底色极薄**：白叠层 12%→5%（深色 34%→18%），**滚动后不再加深** —— 旧版 `.is-scrolled` 会加到 62%/42%，那正是"毛玻璃"观感的来源，已删除。
    - **模糊归零**：顶栏不再有 `backdrop-filter: blur()`，分离感交给折射。
    - **边缘折射**：上下两条带（下沿 20px 为主、上沿 14px 做倒角受光）用 `backdrop-filter: url(#lg-refract)`，即 `feTurbulence` + `feDisplacementMap`（`scale="16"`），把从玻璃下穿过的内容真实弯折。滤镜定义在 `index.html` 的 `.lg-filter-defs`。
    - **上缘 1px 内高光 + 左右侧缘亮线**保留（`inset 0 1.5px 0` 等），这是折射之外唯一解释"这是玻璃"的东西。
  - ⚠️ **三个反直觉的坑，动顶栏前务必读 `src/index.css` 的 `.site-bar` 注释**：① 顶栏元素自身**不能**写 `backdrop-filter`，否则它成为 backdrop root，折射带采不到页面内容，而且**不报错**；② 折射带要挂在**固定定位的兄弟层**（`.site-bar-lens-layer`）里，放进 `.site-bar` 内部不生效（伪元素与真实元素都试过）；③ **不要用 `feImage` 载入位移贴图** —— 实测 data URI 在 `backdrop-filter` 里进不来，位移会退化成恒等，上一轮"折射不可用"的误判就是踩了这个。
  - **没有 `url()` 折射能力的浏览器**（Safari / Firefox）走 `@supports not` 分支退回一层 `blur(16px)`，观感接近旧的毛玻璃，属能力所限而非取舍。
  - **顶栏控件组**（`.bar-control`）：填充降到 10%，hover / focus-visible 才浮出；并加一层很淡的 `drop-shadow` 浅色晕 —— 玻璃透明之后，深色截图从下面滚过时深色文字会掉对比度，**补光晕而不是把玻璃加厚**。四个控件共用一个类，**不要给其中任何一个单独加持久底或边框。**

**The Boot-Screen Rule.** React 挂载前的空窗由 `index.html` 的 `#boot` **独占**（2026-09 第五轮）。视觉是：主题底色 + 一道竖向细光 + 中心光核 + 百分比读数。
- ⚠️ **静态 Hero 骨架已删除**，不要再加回来。它只覆盖 Hero、且不认识路由，导致「文档区直开」和「主页冷启动」看到的是同一个主站半成品。删掉它之后，"半加载"在物理上不可能出现。
- ⚠️ **只有 `app:ready`（React 挂载并渲染完）才放行**。超时（8s / 20s）**只换提示文案**（"加载较慢，请稍候…" / "加载失败，请刷新页面"），**绝不撤加载页** —— 早期版本 4s 到点无条件放行，在开发服务器上会在 React 挂载前撤走、露出骨架，那正是用户报的"开屏动画走完之后依旧是首屏半加载"。
- 进度来自三个真实信号（字体 / 首帧 / `app:ready`）各占 1/3，数字用 rAF 插值平滑爬升，**不做假进度条**。主站由 `App.tsx` 等两帧后发信号；文档区由 `Docs.tsx` 在加载态落回 `false` 后发（正文是运行时 fetch 的）。
- `.print-blocked` 的屏幕隐藏必须写在 `index.html` 的**内联样式**里：它的规则原本只在外链 CSS，外链到达前那行字会直接显形。

**The First-Screen Pre-Reveal Rule.** `Reveal` 在挂载时把**视口 2 倍高度以内**的区块直接设为可见，且**跳过过渡**（`.reveal-instant`）；更下方的仍保留滚动渐显。
- 为什么：全站 33 个区块从 `opacity: 0` 起步，后果是首屏以下永远是空的 —— 高视口、整页截图、打印、无头截图都只拍到「Hero + 一大片空白」，被读成"没加载完"。
- ⚠️ 预展开过的区块**必须退出 IntersectionObserver 的管理**（`preRevealed` ref）。只 `setVisible(true)` 不够：观察器紧接着就会对折叠线以下的元素回调 `isIntersecting: false`，把它们又按回不可见。实测症状是"5 个区块拿到 `reveal-instant`，却只有 1 个真的可见"。
- ⚠️ `@media print` 下 `.reveal` 一律可见：打印与整页快照都不会滚动，观察器永远不触发。

**The Four-Edge Rule（玻璃件）.** 每一档玻璃都必须给**上缘 + 下缘**两条内高光，外加一道底部厚度阴影（`--panel-rim` / `--panel-rim-b` / `--panel-depth`），边框色在浅色下必须是**深色发丝线**。
- 用户 2026-09 实拍反馈：「项目区每个项目之间、技能区最底部栏、工作经历最底部栏、教育背景的底边，玻璃的样式都没有显示完全」。根因是当时三档玻璃**只写了上缘** `inset 0 1px 0`，而 `--panel-edge` 在浅色下是 `rgb(255 255 255 / 0.62)` —— 白线画在浅底上等于没有，于是面板往下"逐渐消失"。
- 口径：**上缘冷白 = 受光；下缘暖暗 = 玻璃压住地面反光**；两者合起来才读得出厚度。浅色 `--panel-edge: rgb(15 23 42 / 0.1)`（与 `.glass-chip` 的 `--chip-edge` 同源），深色 `rgb(255 255 255 / 0.1)`。
**The No-Containment Rule（玻璃件）.** 玻璃元素**或它们的祖先**都不要再加 `content-visibility: auto` / `contain: paint` / `overflow: hidden`。
- `content-visibility: auto` 隐含 `contain: layout paint style`，而 `contain: paint` 有两个致命副作用：
  1. **裁切后代到本元素的盒子**。`.reveal` 未显示时的入场位移是 `transform: translateY(14px)`，被它下移的 wrapper 越过容器底边后**被直接裁掉** —— 实测三个区块的 `scrollHeight` 比盒高正好多 14px，用户看到的就是"玻璃底部缺了一块"。**不要**靠"光源错觉"去解释它。
  2. **制造 backdrop root**。其内所有 `.glass-panel` 的 `backdrop-filter` 只能采样该子树、采不到背后的页面内容 —— **折射等于没开**，而且不报错、从截图上极难看出来。
- 2026-09 第七轮因此从 `.cv-section` 上移除了 `content-visibility: auto`（它只用在技能 / 工作经历 / 教育背景三个区块）。失去的那点渲染跳过，远小于上面两个缺陷。
- 判定方法：把一个玻璃面板的 `backdrop-filter` 临时设成 `none` 再截图，**前后必须不同** —— 相同就说明折射被祖先的 containment 掐死了。
**The One-Theme Rule（玻璃件）.** `.glass-panel` / `.glass-card` / `.glass-chip` 三档共用一套变量（`--panel-*` / `--chip-*` / `--glass-*`），**深浅色只换变量、不换规则**。组件里**禁止**再写 `dark:bg-slate-*` / `dark:border-slate-*` 这类手工配对 —— 那正是用户说的"框纯色"：浅色写一遍、深色再覆盖一遍，而 `dark:bg-slate-800` 会把 `.glass-panel` 的 `--panel-tint-strong` 整个盖掉，玻璃就没了。第五轮已把 Skills / Experience / Projects / Contact 里的这类残留全部删除。

### Shadow Vocabulary
阴影色由**主色派生**（`rgb(157 83 0)` = brand-700），保持与强调色同族，不用中性黑。
- **ambient-hairline** (`box-shadow: 0 1px 2px rgb(157 83 0 / 0.06)`): 实心面板与轻色板的静置态。几乎不可见，只提供一丝离地感。
- **lift-on-hover** (`box-shadow: 0 4px 12px rgb(157 83 0 / 0.10)`): 卡片 hover 时的抬升。
- **floating** (`box-shadow: 0 6px 20px rgb(157 83 0 / 0.28)`): 固定元素的悬浮感。
- **overlay** (`box-shadow: 0 24px 70px rgb(0 0 0 / 0.5)`): 灯箱与下拉菜单（遮罩层，用中性黑压暗才不吃色）。

### Named Rules
**The Tonal-First Rule.** 先用背景色阶表达层级，阴影只在浅色模式补最后一档。深色模式下盒阴影的 opacity 必须 ≤ 0.10 或直接为 0。

**The Blur-Budget Rule.** 全站 `backdrop-filter` 元素不超过 **26 个**（2026-09 第六轮定稿；实测峰值 **23 个**，出现在首屏）。这条件由 `npm run docs:anchors` 里的一条断言守着，**超了会红**，不要靠肉眼。
- ⚠️ 断言数的是**真实 DOM 元素个数**，不是"元素种类"。早期版本按 className 去重，于是 8 个 `.glass-panel` 只算 1 个，口径偏松、根本守不住规则 —— 改口径后实测才从"11 类"变成"23 个"。
- 允许的范围：**固定 / 浮层元素**（顶部栏折射层、底部 Tab Bar、导航玻璃管、灯箱、主题下拉）、**每个区块的主容器与证书卡**（`.glass-panel`）、**顶栏四个控件**（`.bar-control` 的"玻璃叠玻璃"）。
- **区块内的小卡（`.glass-card`）与项目行仍然禁止加 `backdrop-filter`** —— 它们走色阶 + 泛光。静态小卡数量多、面积碎，合成开销是真的。

**The Lit-Glass Rule.** 悬停 / 键盘聚焦 / 当前项时的反馈是**整面玻璃泛光**，不是描边换色。用户原话：「不是现在这种周围一圈框个颜色的效果，而是整个玻璃泛光的效果，类似于玻璃边缘照到太阳的那种发亮」。实现是工具类 `.glass-lit`：`::after` 铺满整块、`z-index:-1` 让光在文字**下面**亮。
- ⚠️ **光必须四周均匀，且聚在边缘而不是铺满整面**（2026-09 第六轮定稿，这里改错过两次）：
  - 第一版把暖光径向渐变锚在 `at 50% 118%`（面板下沿之外）→ 光从底下"升起来"，整块玻璃读成**底部打了一束聚光灯**，还把下沿洗白，看起来像"玻璃缺了个底"。
  - 第二版改成 `at 50% 50%` 铺满 → 四周是均匀了，但**整面被染成暖黄** —— 那不是"散光"，是"染色"。
  - 现在：`radial-gradient(115% 115% at 50% 50%, transparent 52%, var(--glass-glow-warm) 100%)`，**中间 52% 透空、光只聚在四边**；外发光 `0 0 30px -4px`（**不带垂直偏移**）；再加一条 `inset 0 0 22px -14px` 的内缘暖光与之呼应。
  - 顶部冷白保留**略强**（`at 50% -20%`，用户确认）：玻璃确实先被上方环境光照到，但幅度压小，不形成"上亮下暗"。
- **静置一律不发光**，全站唯一例外是**顶栏右侧那几个图标**（`.bar-control`）—— 用户明确："主站仅改顶栏右侧图标，其他只改悬停"。它们静置就带 `0 0 0 1px` + `0 0 16px -8px` 的一圈均匀边缘光。
- 组件里**不要**再写 `hover:border-brand-300` / `hover:border-brand-400` 这类描边变色（已全部删除）；`hover:text-*` 这类文字变色保留。
- 触发条件统一为 `:hover` / `:focus-visible` / `[aria-current="true"]` / `[aria-pressed="true"]` / `[aria-selected="true"]`，深浅色共用一套规则、只换 token。**不抬升**（用户：「不需要大范围的向上跳的逻辑，悬停住有效果就行」）。
- 覆盖面：关于我的 6 张卡片、区块玻璃面板、教育背景四张证书卡、技能区分类按钮与高频标签、项目区筛选按钮与项目行、联系区四颗入口、顶栏四个控件。

## 5. Components

克制与精确：按钮方而实，芯片圆而轻，卡片平而有序。所有交互元素的半径都不超过 16px，全部使用统一的缓出曲线。

### Buttons
- **Shape:** 轻微圆角（`rounded-lg` 8px）。胶囊形只用于筛选与标签，不用于动作按钮。
- **Primary:** 琥珀深底 + 白字（`bg-amber-700 text-white`），内边距 10px × 20px，字重 600。
- **Hover / Focus:** hover 加深到 `brand-800 #804400`（仅颜色过渡，150ms）；键盘焦点用 2px `brand-400/60` 外环，永不隐藏。
- **Ghost / Secondary:** 白底 + 琥珀文字 + 琥珀浅边；hover 时底色转 `amber-50` 并把边框提到 `amber-400`。

### Chips
- **Style:** 胶囊形（`rounded-full`）。技术栈芯片为 `slate-50 #f4f5f5` 底 + `slate-600 #333a3d` 文字，无边框；关键词芯片为 `brand-50` 底 + `brand-700` 文字 + `brand-200` 边。
- **State:** 筛选芯片选中为 `amber-700` 实底白字，未选中为白底 + 发丝边。**深色模式下选中态也使用 `amber-700`**，不再降到 `amber-600`，以保住 4.5:1。

### Cards / Containers
- **Corner Style:** 项目与技能卡 16px；文献类窄卡 12px；联系方式外框 24px。
- **Background:** 见 Elevation 的三档。
- **Shadow Strategy:** 静置 `ambient-hairline`，hover `lift-on-hover` 并配 `-translate-y-0.5`（2px）。
- **Border:** 1px 发丝线。浅色 `#dfe2e3`，深色 `#2c3234`。**禁止把边框加粗成色条来强调。**
- **Internal Padding:** 移动端 20–24px，桌面 24–28px。

### Inputs / Fields
- **Style:** 白底（深色为抬升面），1px 发丝边，12px 圆角，左侧内嵌放大镜图标，右侧条件性清空按钮。
- **Focus:** 边框转 `amber-400` + 2px `amber-400/30` 光晕。不使用 `outline: none` 而不给替代。
- **Disabled / Empty:** 无结果时给出虚线边框的空状态块，内含一句说明与一个"清空搜索"文字按钮。

### Navigation
- **桌面（≥768px）:** 右侧贯穿式玻璃管（宽 8px，两端各留 56px 给返回顶部与主题切换）。章节节点按各段在页面中的**实际篇幅比例**分布在管上，管内的琥珀液柱表示阅读进度。节点 hover 与选中都放大 110%（`scale`，200ms 缓出）。浅色模式液柱为静态渐变条 + 隐约上浮的淡粒子；深色模式粒子更亮、更密。
- **移动端（<768px）:** 顶部胶囊导航只放品牌与主题切换；底部固定 Tab Bar 承担五个主区块导航。教育并入经历，不单独占 Tab。
- **状态:** 当前项用琥珀 + `ring` 表达；禁用 `aria-current` 之外的花哨动效。

### Signature Component: 项目行（Project Row）
项目区的核心组件。每行由五部分组成：**等宽行号**（`01`–`08`，琥珀，仅桌面显示）、**截图**（220px，左右交错，点击进灯箱）、**标题行**（项目名 + GitHub 图标 + 方向标签 + 时间）、**概要**（两行以内）、**折叠要点与技术栈**。

⚠️ **2026-09 第五轮：从"发丝线行"改成了玻璃卡片行**（`.glass-card .glass-lit`），因为用户反馈"项目区尤其少，基本什么都没有"——发丝线行在悬停时只有一层平涂变色，没有任何玻璃反馈。现在每行是一块圆角玻璃卡，悬停时整面泛光（见下面的 The Lit-Glass Rule）。
这是用户明确选择的实验："可以先走 2，我看看效果，如果不好看，再走 1"。**选项 1（退回发丝线行 + 玻璃边缘高光）仍然有效**，回退方式：把 `<article>` 的 `glass-card glass-lit ... rounded-2xl p-5` 换回 `border-b border-slate-200/70 py-6 hover:bg-slate-50/70`，并把悬停反馈改成上下发丝线点亮。
每行的 `id={'project-' + project.id}` 是**跨区深链的落点**（论文页头的「配套项目」→ `#project-book-recommendation`），不要删。

## 6. Do's and Don'ts

### Do:
- **Do** 让琥珀只出现在"可交互 / 当前 / 关键数字"三处，一屏覆盖不超过 10%。
- **Do** 用背景色阶（`#121415` → `#1b1e20` → `#23282b`）表达深色模式层级，阴影 opacity ≤ 0.10。
- **Do** 用三档不等距留白（56 / 88 / 112px）分段，让空白读起来是"段距"。
- **Do** 用 1px 发丝线分开内容，能用线解决的就不加容器。
- **Do** 把正文色值压到 ≥ 4.5:1 对比度；`amber-600` 与 `amber-500` 只用于非文字元素。
- **Do** 让动效落在 150–400ms、指数缓出、只动 `transform` / `opacity` / `color`；滚动入场一次性触发，总时长约 320ms。
- **Do** 用 `clamp()` 做流体字号，min/max 一律用 `rem` 以尊重浏览器缩放与 200% 文字放大。
- **Do** 允许文本选中与复制；只在图片上拦截长按保存。
- **Do** 为每一个动画提供 `prefers-reduced-motion: reduce` 路径，降级为交叉淡入而非删除功能。

### Don't:
- **Don't** 使用紫色渐变、星芒图标、"浮动仪表盘叠在渐变上"的 hero，以及三列等大特性卡。这些是公开数据集里最高频的"AI 生成感"信号。
- **Don't** 把 `backdrop-filter` 当默认皮肤。全站不超过 6 处，且必须都是固定或浮层元素。
- **Don't** 让中性色带上主色色相。石墨族必须保持 chroma 为 0；琥珀只作为强调出现。
- **Don't** 使用回弹 / 弹性缓动（如 `cubic-bezier(0.34,1.56,0.64,1)`）。缓出曲线只有指数族。
- **Don't** 劫持或改写滚动速度。
- **Don't** 使用自定义光标、十字光标跟随、磁性按钮。
- **Don't** 给每一个元素加入场动画；一次滚动只应触发 2–3 处有意义的动效。
- **Don't** 用 `border-left` 或 `border-right` 大于 1px 的彩色色条做强调。改用整边框、底色块或前置序号。
- **Don't** 用 `background-clip: text` 做渐变文字。强调靠字重与字号。
- **Don't** 在深色模式用亮边框模拟浮起，或用 `slate` 系蓝灰当深色面板。
- **Don't** 输出可打印版式。打印一律拦截，并引导到带水印的 PDF 简历。
- **Don't** 暴露手机号、住址、身份证等敏感字段；邮箱仅在联系区以"点击复制"形式提供。
