# start-all.ps1 - one-click launcher for demo projects (interview presentation)
# Usage: double-click start-all.bat, or run:
#   powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
# Skips projects whose port is already in use; logs per project in logs\.
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $Root
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Project definitions: name | workdir | command | ready port | log file | url | note
$projects = @(
  @{ Name = 'ShopRecommendation';       Dir = "$Root\ShopRecommendation"; Cmd = '.\mvnw.cmd spring-boot:run'; Port = 9800; Log = "$LogDir\shop.log"; Url = 'http://localhost:9800/'; Note = 'H2 embedded, demo account demo/123456' },
  @{ Name = 'MiLuStudio';               Dir = "$Root\MiLuStudio\apps\web"; Cmd = 'npm run dev:local'; Port = 5368; Log = "$LogDir\milustudio.log"; Url = 'http://localhost:5173/'; Note = 'Web workbench + .NET Control API + Python Skills (first start is slow)' },
  @{ Name = 'XiaoLouAI';                Dir = "$Root\XiaoLouAI\XIAOLOU-main"; Cmd = 'npm run dev'; Port = 3000; Log = "$LogDir\xiaolou.log"; Url = 'http://localhost:3000/'; Note = 'Frontend only (full features require the .NET backend)' },
  @{ Name = 'SyLabAI';                  Dir = "$Root\SyLabAI\apps\web"; Cmd = 'npm run dev -- --port 3100'; Port = 3100; Log = "$LogDir\sylabai.log"; Url = 'http://localhost:3100/'; Note = 'Frontend only (full features require .NET 10 backend + SQL Server)' },
  @{ Name = 'MiLuAssistantWeb';         Dir = "$Root\MiLuAssistantWeb\console"; Cmd = 'npm run dev'; Port = 5173; Log = "$LogDir\miluweb.log"; Url = 'http://localhost:5173/'; Note = 'Console frontend only (model setup requires the Python backend)' },
  @{ Name = 'BookRecommendation-Backend'; Dir = "$Root\BookRecommendation\backend"; Cmd = '$env:SPRING_KAFKA_BOOTSTRAP_SERVERS="localhost:9092"; .\mvnw.cmd -q spring-boot:run'; Port = 8081; Log = "$LogDir\book-backend.log"; Url = 'http://localhost:8081/book_recommendation'; Note = 'Needs local MySQL (localhost:3306 root/root) and JDK 8; Kafka unreachable is tolerated (lazy init)' },
  @{ Name = 'BookRecommendation';       Dir = "$Root\BookRecommendation\frontend"; Cmd = 'npm run serve'; Port = 8080; Log = "$LogDir\book.log"; Url = 'http://localhost:8080/'; Note = 'Frontend; big-data pipeline see BookRecommendation scripts\start-book.ps1 (MySQL+Kafka+Hive+Spark)' }
)

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  One-click launcher for demo projects' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

foreach ($p in $projects) {
  $listening = Get-NetTCPConnection -LocalPort $p.Port -State Listen -ErrorAction SilentlyContinue
  if ($listening) {
    Write-Host ("[skip] {0}  port {1} already in use: {2}" -f $p.Name, $p.Port, $p.Url) -ForegroundColor Yellow
    continue
  }
  Write-Host ("[start] {0} ..." -f $p.Name) -ForegroundColor Green
  try {
    Start-Process powershell -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-Command', "Set-Location '$($p.Dir)'; $($p.Cmd) *> '$($p.Log)'"
    ) -WindowStyle Minimized
  } catch {
    Write-Host ("[fail] {0} start error: {1}" -f $p.Name, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ''
Write-Host 'Waiting for services (up to 150s)...' -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(150)
foreach ($p in $projects) {
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    $listening = Get-NetTCPConnection -LocalPort $p.Port -State Listen -ErrorAction SilentlyContinue
    if ($listening) { $ready = $true; break }
    Start-Sleep -Seconds 3
  }
  $status = if ($ready) { '[OK] ready' } else { '[--] not ready (see log)' }
  $color = if ($ready) { 'Green' } else { 'Red' }
  Write-Host ("  {0,-22} {1}  {2}" -f $p.Name, $status, $p.Url) -ForegroundColor $color
  if (-not $ready) { Write-Host ("     log: {0}" -f $p.Log) -ForegroundColor DarkGray }
}

Write-Host ''
Write-Host 'Demo tips:' -ForegroundColor Cyan
Write-Host '  - ShopRecommendation: open http://localhost:9800/ , login demo / 123456'
Write-Host '  - BookRecommendation: open http://localhost:8080/ , login 2020001 / 123456 (backend http://localhost:8081/book_recommendation, needs local MySQL; big-data pipeline: BookRecommendation scripts\start-book.ps1)'
