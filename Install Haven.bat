@echo off
setlocal enabledelayedexpansion
title Haven — One-Click Installer
color 0A

echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║           HAVEN — One-Click Installer             ║
echo  ║    Private Chat Server Setup for Windows          ║
echo  ╚════════════════════════════════════════════════════╝
echo.
echo  This installer will:
echo    1. Check/install Node.js (if needed)
echo    2. Install Haven's dependencies
echo    3. Create your data directory
echo    4. Generate SSL certificates (if OpenSSL is available)
echo    5. Add a Windows Firewall rule for port 3000
echo    6. Create a desktop shortcut to launch Haven
echo.
echo  ───────────────────────────────────────────────────────
echo.
pause

:: ═══════════════════════════════════════════════════════════
:: STEP 1 — Check / Install Node.js
:: ═══════════════════════════════════════════════════════════
echo.
echo  ── Step 1/6: Checking Node.js ──
echo.

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :NODE_OK

color 0E
echo  [!] Node.js is not installed or not in PATH.
echo.
echo  Haven requires Node.js (free, ~30 MB download).
echo.
set /p "AUTOINSTALL=  Install Node.js automatically now? [Y/N]: "
if /i "!AUTOINSTALL!" NEQ "Y" goto :NODE_MANUAL

echo.
echo  [*] Launching Node.js installer...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-node.ps1"
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  [ERROR] Automatic install failed.
    goto :NODE_MANUAL
)
echo.
echo  [OK] Node.js installed!
echo.
echo  ════════════════════════════════════════════════════
echo  IMPORTANT: You must close this window and
echo  double-click "Install Haven.bat" again.
echo  Node.js needs a fresh terminal to be recognized.
echo  ════════════════════════════════════════════════════
echo.
pause
exit /b 0

:NODE_MANUAL
echo.
echo  Please install Node.js manually:
echo    1. Go to https://nodejs.org
echo    2. Download the LTS version
echo    3. Run the installer (accept defaults)
echo    4. Restart your PC
echo    5. Run this installer again
echo.
pause
exit /b 1

:NODE_OK
color 0A
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo  [OK] Node.js %NODE_VER% detected
echo.

:: ═══════════════════════════════════════════════════════════
:: STEP 2 — Install Dependencies
:: ═══════════════════════════════════════════════════════════
echo  ── Step 2/6: Installing dependencies ──
echo.

cd /d "%~dp0"
if not exist "node_modules\" (
    echo  [*] Running npm install...
    echo.
    npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo  [ERROR] npm install failed. Check the output above.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed
) else (
    echo  [OK] Dependencies already installed (node_modules exists)
    echo  [*] Checking for updates...
    npm install --prefer-offline 2>nul
)
echo.

:: ═══════════════════════════════════════════════════════════
:: STEP 3 — Create Data Directory
:: ═══════════════════════════════════════════════════════════
echo  ── Step 3/6: Setting up data directory ──
echo.

set "HAVEN_DATA=%APPDATA%\Haven"
if not exist "%HAVEN_DATA%" (
    mkdir "%HAVEN_DATA%"
    echo  [OK] Created data directory: %HAVEN_DATA%
) else (
    echo  [OK] Data directory exists: %HAVEN_DATA%
)

:: Copy .env template if it doesn't exist
if not exist "%HAVEN_DATA%\.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%HAVEN_DATA%\.env" >nul
        echo  [OK] Created .env config from template
    ) else (
        echo JWT_SECRET=change-me-to-something-random-and-long> "%HAVEN_DATA%\.env"
        echo  [OK] Created minimal .env config
    )
    echo.
    echo  ┌──────────────────────────────────────────────┐
    echo  │  TIP: You can customize your server later    │
    echo  │  by editing: %HAVEN_DATA%\.env               │
    echo  └──────────────────────────────────────────────┘
) else (
    echo  [OK] .env config already exists
)
echo.

:: ═══════════════════════════════════════════════════════════
:: STEP 4 — Generate SSL Certificates
:: ═══════════════════════════════════════════════════════════
echo  ── Step 4/6: SSL certificate setup ──
echo.

if exist "%HAVEN_DATA%\certs\cert.pem" (
    echo  [OK] SSL certificate already exists
    goto :SSL_DONE
)

if not exist "%HAVEN_DATA%\certs" mkdir "%HAVEN_DATA%\certs"

where openssl >nul 2>&1
if errorlevel 1 (
    echo  [!] OpenSSL not found — skipping SSL certificate generation.
    echo.
    echo  Haven will run in HTTP mode. This is fine for local use.
    echo  For voice chat over the internet, you'll need HTTPS.
    echo.
    echo  To enable HTTPS later:
    echo    1. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
    echo       (choose the "Light" version)
    echo    2. Restart your PC
    echo    3. Run this installer again
    goto :SSL_DONE
)

echo  [*] Generating self-signed SSL certificate...
openssl req -x509 -newkey rsa:2048 -keyout "%HAVEN_DATA%\certs\key.pem" -out "%HAVEN_DATA%\certs\cert.pem" -days 3650 -nodes -subj "/CN=Haven" 2>nul

if exist "%HAVEN_DATA%\certs\cert.pem" (
    echo  [OK] SSL certificate generated (valid for 10 years)
    echo  [OK] HTTPS will be enabled automatically
) else (
    echo  [!] SSL generation failed — Haven will run in HTTP mode.
)

:SSL_DONE
echo.

:: ═══════════════════════════════════════════════════════════
:: STEP 5 — Windows Firewall Rule
:: ═══════════════════════════════════════════════════════════
echo  ── Step 5/6: Firewall configuration ──
echo.

:: Check if rule already exists
netsh advfirewall firewall show rule name="Haven Chat" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] Firewall rule "Haven Chat" already exists
    goto :FW_DONE
)

echo  [*] Adding firewall rule for Haven (port 3000)...
echo  [*] You may see a UAC prompt — click Yes to allow.
echo.

:: Use PowerShell to run as admin
powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -Command \"New-NetFirewallRule -DisplayName ''Haven Chat'' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Description ''Allow Haven private chat server connections''\"' -Verb RunAs -Wait" 2>nul

netsh advfirewall firewall show rule name="Haven Chat" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [OK] Firewall rule added successfully
) else (
    echo  [!] Could not add firewall rule (admin access may have been denied).
    echo      You can add it manually later — see the tutorial:
    echo      docs\FIRST_TIME_SETUP.md
)

:FW_DONE
echo.

:: ═══════════════════════════════════════════════════════════
:: STEP 6 — Create Desktop Shortcut
:: ═══════════════════════════════════════════════════════════
echo  ── Step 6/6: Desktop shortcut ──
echo.

set "SHORTCUT=%USERPROFILE%\Desktop\Start Haven.lnk"
set "BAT_PATH=%~dp0Start Haven.bat"

if exist "%SHORTCUT%" (
    echo  [OK] Desktop shortcut already exists
    goto :SHORTCUT_DONE
)

:: Create shortcut using PowerShell
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%BAT_PATH%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Launch Haven Private Chat Server'; $s.Save()" 2>nul

if exist "%SHORTCUT%" (
    echo  [OK] Desktop shortcut created: "Start Haven"
) else (
    echo  [!] Could not create desktop shortcut.
    echo      You can launch Haven by double-clicking:
    echo      %BAT_PATH%
)

:SHORTCUT_DONE
echo.

:: ═══════════════════════════════════════════════════════════
:: DONE
:: ═══════════════════════════════════════════════════════════
color 0A
echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║         Installation Complete!                    ║
echo  ╚════════════════════════════════════════════════════╝
echo.
echo  ── What's been set up ──
echo.
echo    [✓] Node.js
echo    [✓] Haven dependencies (node_modules)
echo    [✓] Data directory: %HAVEN_DATA%
echo    [✓] Configuration: %HAVEN_DATA%\.env
echo    [✓] Desktop shortcut: "Start Haven"
echo.
echo  ── Next steps ──
echo.
echo    1. Double-click "Start Haven" on your desktop
echo       (or run "Start Haven.bat" in this folder)
echo.
echo    2. Your browser will open to Haven automatically
echo.
echo    3. Register your admin account:
echo       - Username: admin  (or whatever you set in .env)
echo       - Pick any password
echo.
echo    4. Create a channel and invite your friends!
echo.
echo  ── Need help? ──
echo.
echo    Read the full setup tutorial:
echo      %~dp0docs\FIRST_TIME_SETUP.md
echo.
echo  ── Want to launch Haven right now? ──
echo.
set /p "LAUNCH=  Start Haven now? [Y/N]: "
if /i "!LAUNCH!"=="Y" (
    echo.
    echo  [*] Launching Haven...
    start "" "%~dp0Start Haven.bat"
)

echo.
echo  ════════════════════════════════════════════════════
echo   Happy chatting!
echo  ════════════════════════════════════════════════════
echo.
pause
exit /b 0
