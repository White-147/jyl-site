// 工作经历（时间取自最新简历 PDF）

export interface Experience {
  company: string
  role: string
  period: string
  summary: string
  points: string[]
}

export const experiences: Experience[] = [
  {
    company: '江苏艺途文化传媒有限公司',
    role: 'AI 工具平台开发 · 项目负责人',
    period: '2026/03 – 2026/05',
    summary: '参与 Windows 原生 AI 创作工具链建设，覆盖 MiLuStudio、XiaoLouAI、MiLuAssistantWeb 与 MiLuAssistantDesktop。',
    points: [
      '推进 MiLuStudio 从生产链 MVP 到 .NET 10 Control API、SQLite、Python Skills、Electron/NSIS、本地运行时与 External API Profile Center',
      '参与 OpenAI-compatible API、openai_chat、custom_http_json、Bearer/custom header/query key、models_endpoint/chat_smoke、dry-run/live_text 等模型接口与连接测试能力整理，支持多 Provider 配置',
      '调通人物替换本地 SAM2 + VACE/Wan2.1 链路，解决进度卡顿、Python 子进程超时与进程树清理问题',
      '参与账号权限、钱包/支付审核、任务队列与路由权限矩阵，使用 Vitest / xUnit / Synthetic E2E / GitHub Actions 支撑交付验证',
    ],
  },
  {
    company: '江苏沃叶软件有限公司',
    role: 'IT 支持 · ERP 实施与测试',
    period: '2024/05 – 2024/10',
    summary: '参与 ERP 定制系统的测试、现场实施与运维支持，覆盖数据校验、问题闭环与交付文档。',
    points: [
      '负责用户数据校验、流程验证、异常记录、问题复现与交付文档整理，高峰期单日核对与录入约 800 条用户/业务信息文本',
      '系统试用阶段曾单日整理并反馈 20+ 个前端展示、服务端运行、登录与权限相关问题，协助开发人员定位并验证修复结果',
      '参与现场实施、操作培训、项目报告/新闻稿与交付文档整理',
    ],
  },
  {
    company: '江苏莫比嗨客智能科技有限公司',
    role: 'AI 训练数据质检 · 数据分析',
    period: '2023/08 – 2023/10',
    summary: '参与文本、音频、图像等 AI 训练数据质检，按规则检查数据质量、标注一致性与异常样本。',
    points: [
      '日常处理音频数据 500+ 条、文本数据 50+ 条；通常在 1 小时内理解 800 字以上标注/质检规则并拆成可执行检查项',
      '最高同时跟进 4 个 B2B 数据质检项目，对接数据供给方、客户侧与外包处理团队，指导/培训 4 家数据处理或质检合作方',
      '辅助项目经理完成数据分析项目搭建与客户对接，整理规则理解偏差、样本问题与质检反馈',
    ],
  },
  {
    company: '昆山杰普软件科技有限公司',
    role: '助理讲师 · 软件开发工程师',
    period: '2022/12 – 2023/06',
    summary: '面向高校开展 Java、大数据课程讲解与实训辅导，参与校企合作项目交付。',
    points: [
      '面向高校学生讲解 Java、MySQL、Linux、Hadoop / HDFS 等课程与实训内容，处理 200+ 学生在环境安装、代码调试与项目运行中的问题',
      '参与包头师范学院 100+ 人大数据离线推荐项目实训，覆盖需求讲解、环境搭建、代码调试、运行排错与项目验收',
      '参与广西科技大学大数据实战项目答疑与软件安装支持，完成太原理工大学软件工程专业大数据方向毕业答辩与后期材料审核支持',
    ],
  },
]
