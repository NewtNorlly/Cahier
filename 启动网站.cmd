@echo off
chcp 65001 >nul
title Cahier 本地启动器
cd /d "%~dp0site"

echo ==========================================
echo            Cahier 本地启动器
echo ==========================================
echo   [1] 直接打开现有构建（http://127.0.0.1:8765）
echo   [2] 重新构建后打开（先 npm run build 再起服务）
echo   [3] Astro 开发模式（http://localhost:4321，热更新）
echo ==========================================
choice /c 123 /n /m "请选择 [1/2/3]，直接回车默认 1: "
if errorlevel 3 goto dev
if errorlevel 2 goto build
goto serve

:serve
REM 8765 已被占用则直接打开浏览器；否则后台起 python 静态服务
netstat -ano | findstr ":8765" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo 检测到 8765 已在运行，直接打开浏览器...
  start "" http://127.0.0.1:8765/
  pause
  exit /b
)
echo 启动静态服务：http://127.0.0.1:8765/ （关窗即停止）
start "" http://127.0.0.1:8765/
python -m http.server 8765
pause
exit /b

:build
echo 正在构建静态站点到 site\dist ...
call npm run build
if errorlevel 1 (
  echo [错误] 构建失败，请查看上面的日志。
  pause
  exit /b 1
)
echo 构建完成，启动预览服务...
start "" http://127.0.0.1:8765/
python -m http.server 8765
pause
exit /b

:dev
if not exist node_modules (
  echo 首次运行，正在安装依赖...
  call npm install
)
echo 启动开发服务器：http://localhost:4321 （Ctrl+C 停止）
call npm run dev
pause
exit /b
