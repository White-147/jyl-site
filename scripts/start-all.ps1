# start-all.ps1 — 一键启动可运行项目（面试演示用）
# 用法：双击 start-all.bat，或运行：
#   powershell -ExecutionPolicy Bypass -File start-all.ps1
# 脚本位于 D:\code\ 下（与各项目仓库平级），自动检测端口占用，已运行的会跳过。
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# 项目定义：名称 | 工作目录 | 启动命令 | 就绪检查端口 | 日志文件 | 说明
$projects = @(
  @{ Name = 'ShopRecommendation'; Dir = "$Root\ShopRecommendation"; Cmd = '.\mvnw.cmd spring-boot:run'; Port = 9800; Log = "$LogDir\shop.log"; Url = 'http://localhost:9800/'; Note = 'H2 内嵌库免安装，演示账号 demo/123456' },
  @{ Name = 'MiLuStudio';          Dir = "$Root\MiLuStudio\apps\web"; Cmd = 'npm run dev:local'; Port = 5368; Log = "$LogDir\milustudio.log"; Url = 'http://localhost:5173/'; Note = 'Web 工作台 + .NET Control API + Python Skills（首次启动较慢）' },
  @{ Name = 'XiaoLouAI';           Dir = "$Root\XiaoLouAI\XIAOLOU-main"; Cmd = 'npm run dev'; Port = 3000; Log = "$LogDir\xiaolou.log"; Url = 'http://localhost:3000/'; Note = '创作平台前端（完整功能需另行启动 .NET 后端）' },
  @{ Name = 'BookRecommendation-Backend'; Dir = "$Root\BookRecommendation\backend"; Cmd = '$env:SPRING_KAFKA_BOOTSTRAP_SERVERS="localhost:9092"; .\mvnw.cmd -q spring-boot:run'; Port = 8081; Log = "$LogDir\book-backend.log"; Url = 'http://localhost:8081/book_recommendation'; Note = '依赖本机 MySQL 服务（localhost:3306 root/root，建议先启动）与 JDK 8；Kafka 不可达时懒初始化仍可启动（预置推荐模式）' },
  @{ Name = 'BookRecommendation';  Dir = "$Root\BookRecommendation\frontend"; Cmd = 'npm run serve'; Port = 8080; Log = "$LogDir\book.log"; Url = 'http://localhost:8080/'; Note = '前端登录页（大数据实时链路见仓库 scripts\start-book.ps1：MySQL+Kafka+Hive+Spark）' }
)

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  一键启动可运行项目（面试演示）' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

foreach ($p in $projects) {
  $listening = Get-NetTCPConnection -LocalPort $p.Port -State Listen -ErrorAction SilentlyContinue
  if ($listening) {
    Write-Host ("[跳过] {0}  端口 {1} 已在运行：{2}" -f $p.Name, $p.Port, $p.Url) -ForegroundColor Yellow
    continue
  }
  Write-Host ("[启动] {0} ..." -f $p.Name) -ForegroundColor Green
  try {
    Start-Process powershell -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-Command', "Set-Location '$($p.Dir)'; $($p.Cmd) *> '$($p.Log)'"
    ) -WindowStyle Minimized
  } catch {
    Write-Host ("[失败] {0} 启动异常：{1}" -f $p.Name, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ''
Write-Host '等待服务就绪（最多 150 秒）...' -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(150)
foreach ($p in $projects) {
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    $listening = Get-NetTCPConnection -LocalPort $p.Port -State Listen -ErrorAction SilentlyContinue
    if ($listening) { $ready = $true; break }
    Start-Sleep -Seconds 3
  }
  $status = if ($ready) { '[OK] 就绪' } else { '[--] 未就绪（查看日志）' }
  $color = if ($ready) { 'Green' } else { 'Red' }
  Write-Host ("  {0,-20} {1}  {2}" -f $p.Name, $status, $p.Url) -ForegroundColor $color
  if (-not $ready) { Write-Host ("     日志：{0}" -f $p.Log) -ForegroundColor DarkGray }
}

Write-Host ''
Write-Host '演示提示：' -ForegroundColor Cyan
Write-Host '  · ShopRecommendation：打开 http://localhost:9800/ ，登录 demo / 123456'
Write-Host '  · BookRecommendation：打开 http://localhost:8080/ ，登录 2020001 / 123456（后端 http://localhost:8081/book_recommendation，需本机 MySQL 服务；大数据实时链路见 BookRecommendation 仓库 scripts\start-book.ps1）'
Write-Host '  · 各项目日志位于 logs\ 目录；全部停止可关闭对应最小化窗口'
Write-Host '==============================================' -ForegroundColor Cyan
