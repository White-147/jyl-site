@echo off
rem 一键启动可运行项目（面试演示用）——双击本文件即可
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
pause
