@echo off
chcp 65001 >nul
title Cahier 本地启动器
cd /d "%~dp0site"

echo ==========================================
echo   Cahier 本地启动器
echo   地址: http://127.0.0.1:8765/
echo ==========================================

REM 检测 8765 是否已在监听
netstat -ano | findstr ":8765" | findstr "LISTENING" >nul
if %errorlevel%==0 goto open

echo 正在启动静态服务（python http.server 8765）...
start "Cahier 静态服务" /min cmd /c "cd /d ""%~dp0site\dist"" && python -m http.server 8765"
timeout /t 2 /nobreak >nul

:open
echo 正在打开浏览器...
start "" http://127.0.0.1:8765/
echo.
echo 浏览器已打开。关闭本窗口不会停止服务；
echo 如需停止服务，在任务管理器里结束 python 即可。
pause
