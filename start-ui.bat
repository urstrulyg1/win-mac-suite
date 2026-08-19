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

:: Add standard Node.js paths to current session PATH
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
if exist "%AppData%\npm" set "PATH=%AppData%\npm;%PATH%"

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

:: Fallback: Download and run Node.js installer directly via PowerShell
echo   [..] Downloading official Node.js installer...
powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\node_installer.msi'; Start-Process msiexec.exe -ArgumentList '/i', '%TEMP%\node_installer.msi', '/qn', '/norestart' -Wait; Remove-Item '%TEMP%\node_installer.msi' -Force } catch { Write-Error $_ }"

:REFRESH_PATH
:: Re-check standard paths after installation
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
if exist "%AppData%\npm" set "PATH=%AppData%\npm;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [!] Node.js was installed. Please restart your terminal or computer
    echo       if this window does not detect it immediately.
    echo.
    pause
    exit /b 1
)

:CHECK_NPM
for /f "tokens=*" %%i in ('node -v') do echo   [OK] Node.js %%i detected.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
for /f "tokens=*" %%i in ('npm -v 2^>nul') do echo   [OK] npm v%%i detected.
echo.

:: Install dependencies if node_modules is missing
if not exist "node_modules" (
    echo   [..] Installing project dependencies...
    call npm install --loglevel=error
    if %errorlevel% neq 0 (
        echo   [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
    echo   [OK] Dependencies installed successfully.
) else (
    echo   [OK] Dependencies ready.
)

echo.
echo   ========================================================
echo     Starting Web UI on http://localhost:5173
echo     Press Ctrl+C in this terminal to stop the server
echo   ========================================================
echo.

:: Launch browser in background after 1.5 seconds
start "" powershell -NoProfile -Command "Start-Sleep -Milliseconds 1500; Start-Process 'http://localhost:5173'"

:: Run Vite development server
call npm run dev -- --host
pause

