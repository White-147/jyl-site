// 技能分组（见个人画像「技术栈画像」，不使用无意义的进度条）

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
    ],
  },
  {
    title: '前端',
    items: ['TypeScript', 'JavaScript', 'React', 'Vue 2', 'Vite', 'Ant Design', 'Element UI', 'ECharts', 'Axios', 'Thymeleaf'],
  },
  {
    title: '数据库与大数据',
    items: ['MySQL', 'PostgreSQL', 'SQLite', 'SQL', 'Hadoop / HDFS', 'Hive', 'Spark SQL', 'Spark Streaming', 'Kafka'],
  },
  {
    title: 'AI 与模型 API',
    items: [
      'Python',
      'FastAPI',
      'Selenium',
      'Python Sidecar',
      'Agent / Skills',
      'External API Profile',
      'OpenAI-compatible API',
      'Vertex Gemini / Veo',
      'Qwen-Omni',
      'Provider 配置',
    ],
  },
  {
    title: '桌面与本地化',
    items: ['Electron', 'electron-builder', 'NSIS', 'Windows Worker / Service', 'PowerShell', '嵌入式 Python', '本地端口与进程管理'],
  },
  {
    title: '工程化与测试',
    items: ['Git / GitHub', 'GitHub Actions', 'Vitest', 'xUnit', 'Playwright', 'Synthetic E2E', 'Linux / Ubuntu', 'Docker 基础'],
  },
]
