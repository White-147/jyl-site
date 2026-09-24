# 虚幻5引擎学习笔记

---

## 一、概况说明

### 1. 版本说明

下载安装的版本为 5.8.2，教学视频为 [【最新版】UE5零基础入门教程 | 新手必刷 — 虚幻5完整系列教程](https://www.bilibili.com/video/BV1qYSvBHELW/)，其中使用的版本为 5.7.0

蓝图实战教学视频为[【FPS游戏开发教程 | UE5制作第一人称射击游戏 | 虚幻引擎5.7 零基础入门】](https://www.bilibili.com/video/BV1aw9jBeEHr?vd_source=3e1769133b1eb2a1523bbe2dffad92c6)，其中使用的版本为 5.7.0

UE结合C++进行游戏开发教学视频为[【UE5 C++ 游戏开发 | 游戏逻辑 / C++编程 / UE5框架 / 核心开发】](https://www.bilibili.com/video/BV1uGEt6CECx?p=2&vd_source=3e1769133b1eb2a1523bbe2dffad92c6),其中使用的版本为5.6

### 2. 自助答疑方法

- 虚幻引擎论坛：[https://forums.unrealengine.com/tags/c/general/feedback-requests/50/unreal-engine/](https://forums.unrealengine.com/tags/c/general/feedback-requests/50/unreal-engine/)
- 虚幻引擎开发助手（AI解答）：[https://dev.epicgames.com/community/assistant/unreal-engine](https://dev.epicgames.com/community/assistant/unreal-engine/)
- 虚幻引擎5.8开发文档：[https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-documentation](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-documentation)

### 3.虚幻引擎5.8运行配置

- 官方推荐硬件配置

<img src="images\引擎运行硬件要求\推荐硬件配置.png" style="zoom:67%;" />

- 官方最低软件配置

<img src="images\引擎运行硬件要求\最低软件要求.png" style="zoom:67%;" />

- 官方推荐运行平台

<img src="images\引擎运行硬件要求\官方推荐硬件平台.png" style="zoom:67%;" />

---

## 二、学习记录

### 1.虚幻引擎和Fab

#### 引擎的下载和安装

- 打开[Unreal Engine官网](https://www.unrealengine.com/)，点击获取虚幻引擎
  - 注意：如果电脑上已经有`Epic Games Laugher`的可以直接打开Epic
- 随后弹出的界面如图二所示，需要注册或登录Epic账号
- 如图三，在Epic的**虚幻引擎**界面内，选择**库**，在库界面内即可选择不同的UE版本进行下载

<img src="images\UE下载和Fab\UE官网截图.png" style="zoom:67%;" />

<img src="images\UE下载和Fab\官网下载步骤.png" style="zoom:67%;" />

<img src="images\UE下载和Fab\Epic内UE下载界面.png" style="zoom:67%;" />

#### Fab的介绍和使用

- Fab商城中可以购买包括角色、植物、建筑等几乎所有游戏开发需要的资产
- Epic会在Fab商城中不定时赠送部分商品

<img src="images\UE下载和Fab\Fab界面.png" style="zoom:67%;" />

#### Fab插件的安装

- 如果在下载引擎过程中没有安装Fab插件，可以在虚拟引擎-库的底部找到`Fab UE Plugin`
- 点击安装到引擎之后，选择使用的**对应引擎版本**
- 如果**不安装**，在项目内就没有Fab选项，无法将Fab商城的资源加载到项目内

<img src="images\UE下载和Fab\Fab​插件安装.png" style="zoom:67%;" />

- 安装完成后，底部可能显示不变，此时可以点击引擎下方的**已安装的插件**
- 弹出界面内如果已经有刚刚安装的插件，后续就不用重复点击安装
- 注意：在已安装之后重启Epic，再次点击已安装的插件，可能会显示**未安装任何插件**，但不影响使用

<img src="images\UE下载和Fab\Fab​插件安装验证.png" style="zoom:67%;" />

### 2.新建项目和项目模板

下载好引擎并点击启动后，界面如图所示，点击新建项目，其中无网络连接不影响项目的后续编写

<img src="images\新建项目和项目模板\新建项目.png" style="zoom:67%;" />

如图是点击新增项目后的界面，因为主要拿虚幻5进行游戏开发，因此只介绍游戏相关的类别

- Intro To Unreal：新手教程项目，官方开发用于给新手熟悉虚拟引擎开发的介绍项目
- 空白：不含任何代码的空白项目

<img src="images\新建项目和项目模板\项目类别-Intro.png" style="zoom:67%;" />

- 第一人称模板：此模板包含一个以第一人称视角呈现的玩家角色，玩家可以通过鼠标、手柄或触控设备上的虚拟摇杆来转动视角和进行移动。
  - 可以选择蓝图开发或C++开发，蓝图开发情况下可以选择变体模板，C++版本包含了所有变体的代码和内容。
  - 竞技场射击游戏模板：一个拥有武器拾取功能和敌对人工智能对手的竞技场射击游戏。
  - 生存恐怖游戏模板：一个简单的第一人称角色，具备冲刺机制和火把功能，置身于之中一个黑暗且充满悬疑氛围的地图。

<img src="images\新建项目和项目模板\项目类别-第一人称.png" style="zoom:67%;" />

- 第三人称模板：此模板包含一个可操控的角色，镜头采用过肩视角讲行拍摄。玩家可以通过键盘、鼠标、手柄或触控设备上的虚拟摇杆来旋转镜头并进行移动。
  - 可以选择蓝图开发或C++开发，蓝图开发情况下可以选择变体模板，C++版本包含了所有变体的代码和内容。
  - 格斗游戏模板：具有近战攻击功能和AI控制的敌人的格斗游戏。
  - 平台跳跃游戏模板：一款3D平台跳跃类游戏，其移动属性经过了调整，还具备先进的跳跃功能。
  - 横版卷轴游戏模板：一款采用2.5D视角的平台跳跃游戏，具有受平面限制的移动方式、先进的跳跃功能以横向滚动的摄像机视角。

<img src="images\新建项目和项目模板\项目类别-第三人称.png" style="zoom:67%;" />

- 俯视角模板：此模板模板包含一个可操控的角色以及一个位于较远位置的俯视视角、玩家可以通过点击或触摸目标位置来控制鱼色或者使其在持续按下输入键的情况下跟随光标移动。你可以从"变体(Variants)"下拉菜单中选择特定游戏类型的起始点。
  - 可以选择蓝图开发或C++开发，蓝图开发情况下可以选择变体模板，C++版本包含了所有变体的代码和内容。
  - 战略游戏模板：一款俯视角战略游戏，采用点击操作并具有可选择单位。
  - 双摇杆游戏模板：一款双摇杆设计游戏，具有无限刷新的敌人。

<img src="images\新建项目和项目模板\项目类别-俯视角.png" style="zoom:67%;" />

- 手持AR型应用：该模板是安卓及iOS设备创建增强现实应用的良好起点，包含开启和关闭AR模式的运行逻辑、关于平面检测的调试信息、命中检测及处理预计光照的示例代码。

<img src="images\新建项目和项目模板\项目类别-AR.png" style="zoom:67%;" />

- 虚拟现实：蓝图虚拟现实模板基千OpenXR实现 用千为面向台式电脑主机端以及移动端的VR设备开发项目。该模板默认实现了玩家传送、玩家旋转、物体拾取、物体交互、Google Resonance空间化音频，以及VR观察视角等功能。

<img src="images\新建项目和项目模板\项目类别-VR.png" style="zoom:67%;" />

- 载具模板：此模板展示了一辆跑车和一辆配备双叉臂县架的越野车，同时还有一块抬头显示器 可显示当前挡位和速度，载且的移动可以通过键盘、手柄、方向盘或触控设备上的虚拟摇杆来控制载具。
  - 可以选择蓝图开发或C++开发，蓝图开发情况下可以选择变体模板，C++版本包含了所有变体的代码和内容。
  - 计时赛模板：带有用户界面和赛道标记的计时圈赛。
  - 越野车模板：一张开放世界地图和一辆先进的越野车。

<img src="images\新建项目和项目模板\项目类别-载具.png" style="zoom:67%;" />

### 3. 编辑模式下的视角移动方式

- `右键 + WASD`：视角移动
- `QE`：上下平移

### 4. 变换工具快捷键

- `W键`：物体移动模式（默认）
- `E键`：物体旋转模式
- `R键`：物体缩放模式
- `Ctrl+Z`：撤销上一步操作

### 5. 项目启动快捷键

- `Alt+P`：启动项目
- 点击**运行按钮**

<img src="images\菜单栏\运行按键位置.png" style="zoom:67%;" />

### 6. 界面基础操作

详见[**虚幻引擎界面基础操作文件**](.\theory\ue5-window-base.md)

### 7.界面进阶操作

详见[**虚幻引擎界面进阶操作文件**](.\theory\ue5-window-advanced.md)

### 8.蓝图基础

详见[**蓝图基础知识文件**](.\theory\blueprint-base.md)和[**蓝图编程基础**](.\theory\blueprint-program-base)

### 9.蓝图实战

详见[**闯关游戏实战**](.\combat\challenge-game-notes.md)和[**FPS游戏实战**](.\combat\fps-game-notes.md)