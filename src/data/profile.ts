// 个人信息：修改这里即可全局生效

export interface Stat {
  value: string
  suffix?: string
  label: string
}

export const profile = {
  name: '蒋宇龙',
  title: 'AI 应用平台型全栈工程师',
  subtitle: '数据科学与大数据技术本科 · 数据工程 / 业务系统交付 / Windows 原生桌面端工程化',
  email: 'jyl20010105@gmail.com',
  emailQq: '1004522750@qq.com',
  github: 'https://github.com/White-147',
  githubLabel: 'github.com/White-147',
  resumeUrl: '/resume.pdf',
  // 一句话定位（Hero 主标题下的副标题）
  hero: '从大数据与业务系统交付起步，逐步转向 AI 创作工具平台开发，能独立把前端、后端、数据与桌面端交付串起来。',
  // 关于我
  about: [
    '数据科学与大数据技术本科，早期围绕 Java / MySQL / Hadoop / Spark / Hive / Kafka 完成数据采集、清洗、后端接口与推荐计算的全链路项目，也曾参与 ERP 实施、AI 训练数据质检与高校大数据实训。',
    '近期聚焦 Windows 原生 AI 创作工具链建设，覆盖 MiLuStudio、XiaoLouAI、MiLuAssistant Web/Desktop 四个项目：前端页面、后端 Control API、PostgreSQL/SQLite 数据边界、Python Sidecar / Skills、本地桌面运行、安装包与测试验证均可独立串通。',
    '日常使用 Cursor Agent/Composer 与 Codex 辅助代码检索、架构梳理、重构设计、模型/API 配置排查、文档整理和阶段验证，曾结合 Claude Opus / Sonnet 系列、GPT-5.5 等模型进行项目开发辅助。',
  ],
  // 关键数据（均有据可查，不做无依据的对比式表述）
  stats: [
    { value: '8', label: '公开项目仓库（GitHub）' },
    { value: '4', label: 'AI 创作工具链项目' },
    { value: '800', suffix: '条/日', label: 'ERP 高峰期业务信息核对录入' },
    { value: '500', suffix: '+ 条/日', label: '音频训练数据质检' },
    { value: '200', suffix: '+', label: '学生开发与环境问题处理' },
    { value: '4', label: '数据处理/质检合作方培训指导' },
  ] satisfies Stat[],
} satisfies {
  name: string
  title: string
  subtitle: string
  email: string
  emailQq: string
  github: string
  githubLabel: string
  resumeUrl: string
  hero: string
  about: string[]
  stats: Stat[]
}
