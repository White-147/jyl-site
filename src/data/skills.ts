// 技能分组（按真实工作经历与 D:\code 项目仓库解析，不使用无意义的进度条）
// 来源：个人画像主技术栈 + 各仓库依赖清单核实 + 真实工作经历
// 已排除虚构内容（如医院岗简历中的网络/硬件/安全运维类技能）

export interface SkillGroup {
  title: string
  items: string[]
}

export const skillGroups: SkillGroup[] = [
  {
    title: '后端与平台',
    items: [
      'Java',
      'Spring Boot',
      'Spring Security',
      'Spring Data JPA',
      'MyBatis-Plus',
      'RESTful API',
      'JWT',
      'C# / .NET 8/10',
      'ASP.NET Core',
      'EF Core',
      'Swagger / Knife4j',
      'Maven',
    ],
  },
  {
    title: '前端',
    items: [
      'TypeScript',
      'JavaScript',
      'React 19',
      'Vue 2',
      'Vite',
      'Tailwind CSS',
      'Ant Design',
      'Element UI',
      'ECharts',
      'Axios',
      'Thymeleaf',
      'HTML / CSS',
    ],
  },
  {
    title: '数据库与大数据',
    items: [
      'MySQL',
      'PostgreSQL',
      'SQLite',
      'SQL',
      'Hadoop / HDFS',
      'Hive',
      'Spark SQL',
      'Spark Streaming',
      'Kafka',
      '数据清洗与质检',
      '协同过滤推荐',
    ],
  },
  {
    title: 'AI 与模型 API',
    items: [
      'Python',
      'FastAPI',
      'Selenium',
      'Python Sidecar',
      'Agent / Skills',
      'agentscope',
      'External API Profile',
      'OpenAI-compatible API',
      'Vertex Gemini / Veo',
      'Qwen-Omni',
      '云雾 AI',
      'PixVerse',
      'Provider 配置',
      'LM Studio',
      'MCP',
      '本地多模态链路（SAM2 / VACE / Wan2.1）',
    ],
  },
  {
    title: '桌面与本地化',
    items: ['Electron', 'electron-builder', 'NSIS', 'Windows Worker / Service', 'PowerShell', '嵌入式 Python', 'C# 启动器', '本地端口与进程管理'],
  },
  {
    title: '媒体与文档处理',
    items: ['FFmpeg', 'OCR（Tesseract）', 'PDF（Poppler）', 'NLP（HanLP / LTP）', '音频数据处理'],
  },
  {
    title: '工程化与测试',
    items: ['Git / GitHub', 'GitHub Actions', 'Vitest', 'xUnit', 'Playwright', 'Synthetic E2E', 'Vite 构建', 'Linux / Ubuntu', 'Docker 基础'],
  },
  {
    title: '文档与培训',
    items: ['技术文档', '交付文档', '操作手册', '用户培训', '项目报告', 'Office 办公'],
  },
]
