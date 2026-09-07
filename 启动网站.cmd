@echo off
chcp 65001 >nul
title Cahier 本地启动器
cd /d "%~dp0site"

echo ==========================================
echo            Cahier 本地启动器
echo ==========================================
echo   [1] 开发模式（默认，http://localhost:4321）
echo   [2] 构建静态站点
echo   [3] 预览构建产物（先构建，http://localhost:4321）
echo ==========================================
choice /c 123 /n /m "请选择 [1/2/3]，直接回车默认 1: "
if errorlevel 3 goto preview
if errorlevel 2 goto build
goto dev

:dev
if not exist node_modules (
  echo 首次运行，正在安装依赖...
  call pnpm install
  if errorlevel 1 call npm install
)
echo 启动开发服务器：http://localhost:4321 （Ctrl+C 停止）
call pnpm dev
if errorlevel 1 ( echo [提示] pnpm 不可用，改用 npm... & call npm run dev )
pause
exit /b

:build
echo 正在构建静态站点到 site\dist ...
call pnpm build
if errorlevel 1 ( echo [提示] pnpm 不可用，改用 npm... & call npm run build )
echo 构建完成。
pause
exit /b

:preview
if not exist dist goto build
echo 预览构建产物：http://localhost:4321 （Ctrl+C 停止）
call pnpm preview
if errorlevel 1 ( echo [提示] pnpm 不可用，改用 npm... & call npm run preview )
pause
exit /b
