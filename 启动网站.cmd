@echo off
title Cahier ����������

cd /d "%~dp0"

echo ==========================================
echo   Cahier ����������
echo   http://127.0.0.1:8765/
echo   (ͨ�� 127.0.0.1 ����ʱ, �ʼ�ֽ�Զ����ñ��ر༭)
echo ==========================================

REM ---- check dist ----
if not exist "%~dp0site\dist\index.html" (
  echo.
  echo [ERROR] site\dist\index.html not found.
  echo          Please run:  cd site ^&^& npm run build
  echo.
  pause
  exit /b 1
)

REM ---- locate python (avoid WindowsApps stub) ----
set "PYEXE="
if exist "C:\Users\NewtN\AppData\Local\Python\bin\python.exe" set "PYEXE=C:\Users\NewtN\AppData\Local\Python\bin\python.exe"
if not defined PYEXE if exist "C:\Windows\py.exe" set "PYEXE=C:\Windows\py.exe"
if not defined PYEXE (
  echo.
  echo [ERROR] cannot find python. Install Python 3 and tell me the path.
  echo.
  pause
  exit /b 1
)
echo Using: %PYEXE%

REM ---- port already listening? ----
netstat -ano | findstr ":8765 " | findstr "LISTENING" >nul
if %errorlevel%==0 goto open

echo Starting static server on port 8765 ...
start "Cahier ��̬����" /min /D "%~dp0site" "%PYEXE%" "%~dp0site\local-server.py"
timeout /t 2 /nobreak >nul

netstat -ano | findstr ":8765 " | findstr "LISTENING" >nul
if errorlevel 1 (
  echo.
  echo [ERROR] port 8765 not listening. See the Cahier server window.
  echo.
  pause
  exit /b 1
)

:open
echo Opening browser ...
start "" "http://127.0.0.1:8765/"
echo.
echo Done. Close this window will NOT stop the server.
echo To stop: kill python.exe in Task Manager.
echo.
pause
