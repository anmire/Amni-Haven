@echo off
title Haven Server
color 0A
echo.
echo  ========================================
echo       HAVEN - Private Chat Server
echo  ========================================
echo.

:: ── Check Node.js ──
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :NODE_OK

color 0E
echo  [!] Node.js is not installed.
echo.
echo  Haven requires Node.js (free, ~30 MB download).
echo.
set /p "AUTOINSTALL=  Install Node.js automatically now? [Y/N]: "
if /i "%AUTOINSTALL%" NEQ "Y" goto :NODE_MANUAL

echo.
echo  [*] Launching Node.js installer...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-node.ps1"
if %ERRORLEVEL% NEQ 0 goto :NODE_MANUAL
echo.
echo  [OK] Node.js installed!
echo.
echo  ========================================
echo   Close this window and double-click
echo   Start Haven.bat again to continue.
echo  ========================================
echo.
pause
exit /b 0

:NODE_MANUAL
echo.
echo  Install Node.js from https://nodejs.org then run this again.
echo.
pause
exit /b 1

:NODE_OK
for /f "tokens=*" %%v in ('node -v') do echo  [OK] Node.js %%v detected

:: ── Data directory ──
set "HAVEN_DATA=%APPDATA%\Haven"
if not exist "%HAVEN_DATA%" mkdir "%HAVEN_DATA%"

:: ── Kill existing server ──
echo  [*] Checking for existing server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo  [!] Killing existing process on port 3000 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

:: ── Install / update dependencies (always runs — fast when up to date) ──
echo  [*] Installing dependencies...
cd /d "%~dp0"
call npm install
if %ERRORLEVEL% NEQ 0 goto :DEPS_FAIL
echo  [OK] Dependencies ready
echo.
goto :DEPS_DONE

:DEPS_FAIL
color 0C
echo.
echo  [ERROR] npm install failed. Check the output above.
pause
exit /b 1

:DEPS_DONE

:: ── SSL certs ──
if exist "%HAVEN_DATA%\certs\cert.pem" goto :SSL_DONE
if not exist "%HAVEN_DATA%\certs" mkdir "%HAVEN_DATA%\certs"

where openssl >nul 2>&1
if errorlevel 1 goto :NO_OPENSSL

echo  [*] Generating self-signed SSL certificate...
openssl req -x509 -newkey rsa:2048 -keyout "%HAVEN_DATA%\certs\key.pem" -out "%HAVEN_DATA%\certs\cert.pem" -days 3650 -nodes -subj "/CN=Haven" 2>nul
if exist "%HAVEN_DATA%\certs\cert.pem" goto :SSL_GEN_OK
echo  [!] SSL generation failed. Haven will run in HTTP mode.
goto :SSL_DONE

:SSL_GEN_OK
echo  [OK] SSL certificate generated
goto :SSL_DONE

:NO_OPENSSL
echo  [!] OpenSSL not found - skipping SSL. Haven will run in HTTP mode.

:SSL_DONE

:: ── Firewall rule (first run only) ──
netsh advfirewall firewall show rule name="Haven Chat" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :FW_DONE

echo  [*] Adding firewall rule for port 3000 (you may see a UAC prompt)...
powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -Command \"New-NetFirewallRule -DisplayName ''Haven Chat'' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Description ''Allow Haven private chat server connections''\"' -Verb RunAs -Wait" 2>nul

:FW_DONE

echo.
echo  [*] Data directory: %HAVEN_DATA%
echo  [*] Starting Haven server...
echo.

:: ── Start server ──
cd /d "%~dp0"
start /B node server.js

:: ── Wait for server ──
echo  [*] Waiting for server to start...
set RETRIES=0

:WAIT_LOOP
timeout /t 1 /nobreak >nul
set /a RETRIES+=1
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :SERVER_READY
if %RETRIES% GEQ 15 goto :SERVER_FAIL
goto :WAIT_LOOP

:SERVER_FAIL
color 0C
echo.
echo  [ERROR] Server failed to start after 15 seconds.
echo  Check the output above for errors.
pause
exit /b 1

:SERVER_READY

:: ── Detect protocol ──
set "HAVEN_PROTO=http"
if not exist "%HAVEN_DATA%\certs\cert.pem" goto :SHOW_STATUS
if not exist "%HAVEN_DATA%\certs\key.pem" goto :SHOW_STATUS
set "HAVEN_PROTO=https"

:SHOW_STATUS
echo.
if "%HAVEN_PROTO%"=="https" goto :SHOW_HTTPS
goto :SHOW_HTTP

:SHOW_HTTPS
echo  ========================================
echo    Haven is LIVE on port 3000 (HTTPS)
echo  ========================================
echo.
echo  Local:    https://localhost:3000
echo  LAN:      https://YOUR_LOCAL_IP:3000
echo  Remote:   https://YOUR_PUBLIC_IP:3000
echo.
echo  First time? Your browser will show a security
echo  warning (self-signed cert). Click "Advanced"
echo  then "Proceed" to continue.
goto :OPEN_BROWSER

:SHOW_HTTP
echo  ========================================
echo    Haven is LIVE on port 3000 (HTTP)
echo  ========================================
echo.
echo  Local:    http://localhost:3000
echo  LAN:      http://YOUR_LOCAL_IP:3000
echo  Remote:   http://YOUR_PUBLIC_IP:3000
echo.
echo  NOTE: Running without SSL. Voice chat and
echo  remote connections work best with HTTPS.
echo  See README for how to enable HTTPS.

:OPEN_BROWSER
echo.
echo  [*] Opening browser...
start %HAVEN_PROTO%://localhost:3000

echo.
echo  ----------------------------------------
echo   Server is running. Close this window
echo   or press Ctrl+C to stop the server.
echo  ----------------------------------------
echo.

:: Keep window open so server stays alive
:KEEPALIVE
timeout /t 3600 /nobreak >nul
goto :KEEPALIVE
