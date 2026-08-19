@echo off
setlocal EnableDelayedExpansion
title Windows System Update Suite v5.0 - Web UI
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo   ========================================================
echo     WINDOWS SYSTEM UPDATE ^& OPTIMIZATION SUITE v5.0
echo                       Web UI Launcher
echo   ========================================================
echo.

:: Add standard Node.js & npm locations to current session PATH
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
if exist "%AppData%\npm" set "PATH=%AppData%\npm;%PATH%"
if exist "%ProgramData%\chocolatey\bin" set "PATH=%ProgramData%\chocolatey\bin;%PATH%"

:: Check if Node.js is already available
where node >nul 2>&1
if %errorlevel% equ 0 goto :CHECK_NPM

echo   [i] Node.js is not detected on your system.
echo   [..] Automatically installing Node.js LTS, please wait...
echo.

:: Try installing via winget first
where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo   [..] Installing Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements
    goto :REFRESH_PATH
)

:: Try installing via chocolatey if winget is unavailable
where choco >nul 2>&1
if %errorlevel% equ 0 (
    echo   [..] Installing Node.js LTS via Chocolatey...
    choco install nodejs-lts -y --no-progress
    goto :REFRESH_PATH
)

:: Fallback: Download and run Node.js installer directly via PowerShell (TLS 1.2+)
echo   [..] Downloading official Node.js installer...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; " ^
  "$url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi'; " ^
  "$dest = Join-Path $env:TEMP 'node_installer.msi'; " ^
  "Write-Host '   [..] Fetching from '$url; " ^
  "Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing; " ^
  "Write-Host '   [..] Running MSI installer...'; " ^
  "Start-Process msiexec.exe -ArgumentList '/i', $dest, '/qn', '/norestart' -Wait; " ^
  "Remove-Item $dest -Force -ErrorAction SilentlyContinue; " ^
  "} catch { Write-Error $_; exit 1 }"

:REFRESH_PATH
:: Re-scan standard paths after installation
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
if exist "%AppData%\npm" set "PATH=%AppData%\npm;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Node.js installation finished, but 'node' could not be found in PATH.
    echo   Please close this command prompt and reopen it, or install Node.js manually
    echo   from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:CHECK_NPM
for /f "tokens=*" %%i in ('node -v 2^>nul') do echo   [OK] Node.js %%i detected.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "%AppData%\npm\npm.cmd" set "PATH=%AppData%\npm;%PATH%"
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] npm could not be found. Please ensure Node.js is installed properly.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v 2^>nul') do echo   [OK] npm v%%i detected.
echo.

:: Check dependencies and ensure complete installation
set "NEED_INSTALL=0"
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\systeminformation" set "NEED_INSTALL=1"
if not exist "node_modules\express" set "NEED_INSTALL=1"
if not exist "node_modules\concurrently" set "NEED_INSTALL=1"
if not exist "node_modules\vite" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
    echo   [..] Installing all required project dependencies (express, systeminformation, vite, tailwind, etc.)...
    call npm install --loglevel=error
    if %errorlevel% neq 0 (
        echo.
        echo   [ERROR] npm install encountered an error. Attempting clean install...
        call npm ci --loglevel=error || call npm install --loglevel=error
        if %errorlevel% neq 0 (
            echo   [FATAL] Dependency installation failed. Please inspect errors above.
            pause
            exit /b 1
        )
    )
    echo   [OK] Dependencies installed successfully.
) else (
    echo   [OK] Dependencies verified and ready.
)

echo.
echo   ========================================================
echo     Starting WinSuite Telemetry Backend + Web UI
echo     - Backend Telemetry API: http://127.0.0.1:3131
echo     - Web UI Dashboard:      http://localhost:5173
echo     Press Ctrl+C in this terminal to stop all servers
echo   ========================================================
echo.

:: Launch browser in background after 2 seconds
start "" powershell -NoProfile -Command "Start-Sleep -Milliseconds 2000; try { Start-Process 'http://localhost:5173' } catch {}"

:: Run both Backend Telemetry (server.js) and Frontend (Vite) concurrently
call npm start
if %errorlevel% neq 0 (
    echo.
    echo   [!] Development server exited.
)
pause

