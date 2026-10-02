# 闯关游戏实战

## 一、创建项目和导入素材

启动引擎，点击左侧新建项目

在游戏界面中选择空白，目标平台是Desktop，质量预设是Maximum，项目名称起ChallengeGame

<img src="..\images\闯关游戏实战\新建项目​.png" style="zoom:67%;" />

在教程作者个人网站[星露游戏学院](https://www.xinglu3d.com/)下载对应资源

<img src="..\images\闯关游戏实战\下载教程配套资源.png" style="zoom:67%;" />

将网站中资源包下载完成后，打开虚幻引擎界面，在**我的工程**栏找到刚刚新建的ChallengeGame项目，右键选择**在文件夹中显示**

<img src="..\images\闯关游戏实战\定位项目目录.png" style="zoom:67%;" />

弹出的窗口就是UE5游戏存放在本机的目录地址，打开ChallengeGame目录中的Content文件夹

打开下载的**UE5零基础教程-素材.zip**，再次打开或解压其中的**【第16课】蓝图实战.zip**到刚刚打开的Content目录下

<img src="..\images\闯关游戏实战\导入资源到项目.png" style="zoom:67%;" />

打开虚拟引擎中新建的ChallengeGame项目，打开内容侧滑菜单，在根目录下选择**内容-ChallengeGame-Maps**，双击其中的**Level_Scene_01**，如果能够正常显示，点击编辑-项目设置-项目-地图和模式-默认地图，修改编辑器开始地图和游戏默认地图为Level_Scene_01

<img src="..\images\闯关游戏实战\修改游戏默认地图.png" style="zoom:67%;" />

**注意**：如果之前导入资源时已经打开项目，此时可能内容目录下不存在ChallengeGame目录，关闭项目并重新打开之后再打开内容侧滑菜单即可正常显示

<img src="..\images\闯关游戏实战\打开关卡.png" style="zoom:67%;" />

------

## 二、实现基础操作及动画

### 1. 实现角色移动

#### 1.1 新增前置操作

在内容目录下右键新建文件夹，命名为Code，在Code目录下新建Character文件夹，在Character目录下新建Input文件夹

在Input目前下新增输入-`输入操作`，命名为IA_Move和IA_Look，新增输入-`输入映射上下文`，命名为IMC_Challenge，其中IA_Move和IA_Look命名重复，可以通过资产所在路径判断区分

后续操作可以参考[**蓝图编程基础的实现角色移动部分内容**](../theory/blueprint-program-base#5.%20实现角色移动)

输入映射上下文修改器配置：

- IA_Look（视角移动）：鼠标XY 2D轴，修改器否定，仅勾选Y轴
- IA_Move（角色移动）：
  - 键盘W键：无修改器
  - 键盘S键：修改器否定
  - 键盘A键：修改器拌合输入轴值，否定
  - 键盘D键：修改器拌合输入轴值

在Character目录下右键新增蓝图类-`游戏模式基础`，命名为**BP_ChallengeMode**，右键新增蓝图类-`角色`，命名为**BP_ChallengeCharacter**，双击BP_ChallengeMode，进入视口界面，在右侧细节页中修改默认Pawn类为新增的BP_ChallengeCharacter，点击**编译和保存**

<img src="..\images\闯关游戏实战\实现角色移动\修改默认Pawn类.png" style="zoom:67%;" />

#### 1.2 设置相关操作

双击BP_ChallengeCharacter，进入视口界面，左键单击左侧组件页中的网格体，在右侧细节页中的网格体栏的骨骼网格体资产选择**SK_Adventurer**，调整角色位置，位置Z轴为-87，旋转Z轴位置为-90，详见[**蓝图编程基础的调整角色模型**](../theory/blueprint-program-base#2.%20调整角色模型)，点击编译和保存

<img src="..\images\闯关游戏实战\实现角色移动\绑定网格体.png" style="zoom:67%;" />

点击编辑-项目设置-项目-地图和模式，修改默认游戏模式为BP_ChallengeMode，使角色在关卡中生效

<img src="..\images\闯关游戏实战\实现角色移动\修改默认游戏模式.png" style="zoom:67%;" />

返回BP_ChallengeCharacter的视口界面，在组件页右键新增弹簧臂和摄像机，详见[**蓝图编程基础的设置第三人称视角**](../theory/blueprint-program-base#3.%20设置第三人称视角)

<img src="..\images\闯关游戏实战\实现角色移动\设置第三人称视角.png" style="zoom:67%;" />

#### 1.3 编写角色移动

进入BP_ChallengeCharacter的事件图标界面，因为用不到事件开始重叠和事件Tick，可以把两节点删去

右键搜索get player controller，点击添加游戏-`Get Player Controller`，左键长按Return Value节点，搜索输入enhanced，获取`增强输入本地玩家子系统`，左键长按搜索输入app mapping，获取`Add Mapping Context`

将左侧执行引脚连接到`事件BeginPlay`右侧执行引脚处，Add Mapping Context中Mapping Context选择之前新增并配置的**IMC_Challenge**，点击**编译和保存**

<img src="..\images\闯关游戏实战\实现角色移动\蓝图添加映射上下文.png" style="zoom:67%;" />

右键搜索输入IA Move，会出现两个同名节点，依旧根据路径区分，选择/Game/Code目录开头的，后续可见[**蓝图编程基础的编写角色移动**](../theory/blueprint-program-base#4.%20编写角色移动)，完成后点击**编译和保存**

<img src="..\images\闯关游戏实战\实现角色移动\路径区分.png" style="zoom:67%;" />

#### 1.4 编写第三人称视角

第三人称游戏角色移动方向为摄像机朝向，因此将新增的摄像机组件左键长按拖到事件图表中，后续可见[**蓝图编程基础的编写第三人称视角**](../theory/blueprint-program-base#4.%20编写第三人称视角)，完成后点击**编译和保存**

<img src="..\images\闯关游戏实战\实现角色移动\角色移动蓝图.png" style="zoom:67%;" />

右键搜索输入IA Look，同理根据路径区分，右键搜索输入add yaw，添加`Add Controller Yaw Input`，右键搜索输入add pitch，添加`Add Controller Pitch Input`，后续可以见[**蓝图编程基础的编写视角移动**](../theory/blueprint-program-base#4.%20编写视角移动)和[**蓝图编程基础的设置第三人称视角**](../theory/blueprint-program-base#3.%20设置第三人称视角)

角色视角移动相关勾选和取消勾选类目：

- 蓝图类-角色-类默认值-**取消勾选**`使用控制器旋转Yaw`
- 蓝图类-角色-类默认值-**勾选**`将旋转朝向运动`
- 蓝图类-角色-弹簧臂-细节-**勾选**`使用Paw控制旋转`

<img src="..\images\闯关游戏实战\实现角色移动\角色视角移动蓝图.png" style="zoom:67%;" />

#### 1.5 编写移动动画

打开内容侧滑菜单，在Character目录下右键新增文件夹，命名为Animation，进入Animation目录，右键选择动画-`动画蓝图`，选择**SK_Mannequin**，命名为ABP_ChallengeCharacter

右键选择动画-旧有-`混合空间1D`，选择SK_Mannequin，因为此处仅需要单向动画混合，而原有的混合空间可以实现2D效果，命名为BS1D_Challenge，双击进入

在资产详情页会发现仅有**水平坐标项**，展开水平坐标，名称设置为Speed，最大轴值为600，网格划分为2，勾选与网格对齐，平滑时间修改为0.2，输入后按enter完成修改，平滑类型设置为Cubic

<img src="..\images\闯关游戏实战\实现角色移动\新增并配置混合空间1D.png" style="zoom:67%;" />

右下角资产浏览器中，左键长按拖动**MM_Idle**到中间最左侧，拖动**MM_Run_Fwd**到最右侧

<img src="..\images\闯关游戏实战\实现角色移动\拖动动画资产.png" style="zoom:67%;" />

返回ABP_ChallengeCharacter的AnimaGraph，打开右下角资产浏览器窗口，左键长按拖动BS1D_Challenge到AnimaGraph中，将混合空间播放器的右侧引脚连接到输出姿势的左侧引脚

返回BP_ChallengeCharacter，选择组件中的网格体，在右侧细节-动画-动画类中选择ABP_ChallengeCharacter，完成动画类和蓝图类-角色的绑定，这样在ABP_ChallengeCharacter的事件图标的`Try Get Pawn Owner`中可以获取到BP_ChallengeCharacter，后续可以见[**蓝图编程基础的编写动画蓝图**](../theory/blueprint-program-base#3.%20编写动画蓝图)

<img src="..\images\闯关游戏实战\实现角色移动\角色动画获取实时速度蓝图.png" style="zoom:67%;" />

<img src="..\images\闯关游戏实战\实现角色移动\角色动画蓝图.png" style="zoom:67%;" />

### 2. 实现角色跳跃

#### 2.1 编写角色跳跃

打开内容侧滑菜单-内容-Code-Character-Input，右键新增输入-`输入操作`，命名为IA_Jump，因为属于按一下键盘跳一下的操作，不涉及到向量，所以不需要双击进入修改

返回IMC_Challenge，添加新的IA_Jump映射，同理需要根据路径进行区分，展开选择键值，按键盘`空格键`，修改完成后点击保存

<img src="..\images\闯关游戏实战\实现角色跳跃\上下文添加跳跃输入.png" style="zoom:67%;" />

返回BP_ChallengeCharacter的事件图标，右键搜索IA Jump添加，同理根据路径区分，右键搜索jump，选择角色-`Jump`

<img src="..\images\闯关游戏实战\实现角色跳跃\蓝图添加Jump.png" style="zoom:67%;" />

因为跳跃不是一个持续性动作，因此将IA_Jump的**Started引脚**连接到Jump左侧引脚，而不是Triggered引脚，点击编译和保存后，角色实现跳跃，但缺少动画

<img src="..\images\闯关游戏实战\实现角色跳跃\角色跳跃蓝图.png" style="zoom:67%;" />

#### 2.2 实现跳跃动画

返回ABP_ChallengeCharacter的AnimGraph，将Speed变量和BS1D_Challenge剪切，右键搜索state machine，选择动画-`状态机`，命名为Basic，将状态机右侧引脚连接到输出姿势的左侧引脚，双击状态机

<img src="..\images\闯关游戏实战\实现角色跳跃\添加状态机.png" style="zoom:67%;" />

进入状态机界面，其中节点左键长按**中心深灰色部分**为拖拽，长按**边缘浅灰色部分**为新增节点

长按边缘，选择添加状态，命名为Locomotion，之后继续添加状态，依次命名为Jump_Started，Jump_Loop，Jump_End

<img src="..\images\闯关游戏实战\实现角色跳跃\状态机添加状态.png" style="zoom:67%;" />

双击Locomotion，将之前剪切的节点粘贴到此界面中，如果剪切面板丢失可以在左侧我的蓝图界面拖拽变量-Speed，右侧资产浏览器界面拖拽BS1D_Challenge

<img src="..\images\闯关游戏实战\实现角色跳跃\Locomotion节点.png" style="zoom:67%;" />

点击顶部路径中的Basic返回上一级，双击进入Jump_Start界面，左键长按拖拽MM_Jump动画到界面内，连接右侧引脚到输出动画姿势的左侧引脚，双击进入Jump_Loop界面，拖拽连接MM_Fall_Loop动画，双击进入Jump_End界面，拖拽连接MM_Land动画

<img src="..\images\闯关游戏实战\实现角色跳跃\Jump_Start节点.png" style="zoom:67%;" />

<img src="..\images\闯关游戏实战\实现角色跳跃\Jump_Loop节点.png" style="zoom:67%;" />

<img src="..\images\闯关游戏实战\实现角色跳跃\Jump_End节点.png" style="zoom:67%;" />

**注意**：MM_Land动画节点为**绿色**，此时动画无法正常播放

双击进入MM_Land界面，在资产详情-附加设置-Additive动画，选择No Additive，默认为叠加动画，修改后**点击保存**，此时返回Jump_End会发现节点颜色变为一致的棕色

<img src="..\images\闯关游戏实战\实现角色跳跃\修改落地动画类型.png" style="zoom:67%;" />

此时点击编辑，编译器结果会出现多条warning，因为Locomotion-Jump_Start-Jump_Loop-Jump_End之间缺少过渡条件