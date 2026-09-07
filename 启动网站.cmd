@echo off
chcp 65001 >nul
cd /d "%~dp0site"
if not exist node_modules (
  echo 首次运行，正在安装依赖...
  call pnpm install
  if errorlevel 1 call npm install
)
echo ==========================================
echo   Cahier 本地开发服务器
echo   http://localhost:4321
echo   按 Ctrl+C 停止
echo ==========================================
call pnpm dev
if errorlevel 1 (
  echo [提示] pnpm 不可用，改用 npm 启动...
  call npm run dev
)
pause
