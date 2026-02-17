@echo off
chcp 65001 >nul 2>&1
title Haven - Setup Wizard
mode con cols=72 lines=40
color 0B

:: ==============================================================
::  Haven - Interactive Setup and Usage Wizard (Windows)
::  One-click guided walkthrough for new server hosters
::
::  NOTE: This script uses goto labels instead of nested if blocks
::  to avoid the Windows batch parser crash with nested parentheses.
:: ==============================================================

set "HAVEN_DIR=%~dp0"
set "HAVEN_DATA=%APPDATA%\Haven"
set "STEP=0"
set "TOTAL_STEPS=8"

goto :WELCOME

:: -- Helper: section header -----------------------------------------
:HEADER
set /a STEP+=1
cls
color 0B
echo.
echo   +----------------------------------------------------+
echo   ^|            Haven SETUP WIZARD                      ^|
echo   ^|               Step %STEP% of %TOTAL_STEPS%                          ^|
echo   +----------------------------------------------------+
echo.
echo   %~1
echo   ----------------------------------------------------
echo.
goto :eof

:: -- Helper: press any key ------------------------------------------
:CONTINUE
echo.
echo   ----------------------------------------------------
echo   Press any key to continue to the next step...
pause >nul
goto :eof

:: ==============================================================
::  WELCOME SCREEN
:: ==============================================================
:WELCOME
cls
echo.
echo.
echo       +----------------------------------------------+
echo       ^|                                              ^|
echo       ^|        Welcome to HAVEN                      ^|
echo       ^|                                              ^|
echo       ^|      Private Chat Server Setup Wizard        ^|
echo       ^|                                              ^|
echo       +----------------------------------------------+
echo.
echo.
echo   This wizard will walk you through:
echo.
echo     SETUP
echo       1.  Check prerequisites (Node.js)
echo       2.  Install dependencies
echo       3.  Create data directory and config
echo       4.  Generate SSL certificates
echo.
echo     LEARN
echo       5.  Create your admin account
echo       6.  Channels and messaging features
echo       7.  Voice chat and screen sharing
echo       8.  Admin tools, themes and security
echo.
echo   ----------------------------------------------------
echo.
echo     [S]  Start setup wizard
echo     [Q]  Quit
echo.
set /p "CHOICE=   Your choice: "
if /i "%CHOICE%"=="S" goto :STEP1
if /i "%CHOICE%"=="Q" goto :QUIT
goto :WELCOME

:: ==============================================================
::  STEP 1 - CHECK NODE.JS
:: ==============================================================
:STEP1
call :HEADER "CHECK PREREQUISITES"

echo   Haven runs on Node.js. Let's make sure it's installed.
echo.

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :NODE_FOUND

:: -- Node.js NOT found --
color 0C
echo   [X] Node.js is NOT installed.
echo.
echo   Haven needs Node.js to run. Here's how to get it:
echo.
echo     1. Open your browser to  https://nodejs.org
echo     2. Click the big green "LTS" button
echo     3. Run the installer (accept all defaults)
echo     4. RESTART YOUR PC after installing
echo     5. Run this wizard again
echo.
echo   ----------------------------------------------------
echo.
echo     [D]  Open nodejs.org in your browser now
echo     [Q]  Quit (install Node.js first, then come back)
echo.
set /p "CHOICE=   Your choice: "
if /i "%CHOICE%" NEQ "D" goto :QUIT
start https://nodejs.org
echo.
echo   Browser opened! Install Node.js, restart your PC,
echo   then run this wizard again.
echo.
pause
goto :QUIT

:: -- Node.js found --
:NODE_FOUND
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo   [OK] Node.js found: %NODE_VER%
echo.

:: Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto :NPM_MISSING

for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
echo   [OK] npm found: v%NPM_VER%
echo.
goto :CHECK_OPENSSL

:NPM_MISSING
color 0E
echo   [!] npm not found. This usually means Node.js didn't
echo       install correctly. Try reinstalling from nodejs.org.
pause
goto :QUIT

:: Check OpenSSL (optional)
:CHECK_OPENSSL
where openssl >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :OPENSSL_FOUND

echo   [--] OpenSSL not found (optional - Haven will use HTTP)
echo        For voice chat over the internet, install OpenSSL later.
echo        Download: https://slproweb.com/products/Win32OpenSSL.html
goto :STEP1_DONE

:OPENSSL_FOUND
echo   [OK] OpenSSL found (HTTPS will be enabled)

:STEP1_DONE
call :CONTINUE
goto :STEP2

:: ==============================================================
::  STEP 2 - INSTALL DEPENDENCIES
:: ==============================================================
:STEP2
call :HEADER "INSTALL DEPENDENCIES"

echo   Haven needs some packages from npm (Node's package manager).
echo   This downloads everything Haven needs to run.
echo.

if not exist "%HAVEN_DIR%node_modules\" goto :DEPS_FIRST_RUN

:: -- node_modules already exists --
echo   [OK] Dependencies already installed (node_modules exists).
echo.
echo   Want to reinstall? This can fix broken installs.
echo.
echo     [S]  Skip (already installed)
echo     [R]  Reinstall (npm install)
echo.
set /p "CHOICE=   Your choice: "
if /i "%CHOICE%" NEQ "R" goto :DEPS_DONE

echo.
echo   Installing... this may take a minute.
echo.
cd /d "%HAVEN_DIR%"
npm install
echo.
if %ERRORLEVEL% EQU 0 goto :DEPS_REINSTALL_OK

echo   [X] npm install failed. Check the errors above.
goto :DEPS_DONE

:DEPS_REINSTALL_OK
echo   [OK] Dependencies reinstalled successfully.
goto :DEPS_DONE

:: -- First run, no node_modules --
:DEPS_FIRST_RUN
echo   Installing... this may take 1-2 minutes on first run.
echo.
cd /d "%HAVEN_DIR%"
npm install
echo.
if %ERRORLEVEL% EQU 0 goto :DEPS_FIRST_OK

color 0C
echo   [X] npm install failed. Check the errors above.
echo       Common fix: delete node_modules and try again.
pause
goto :QUIT

:DEPS_FIRST_OK
echo   [OK] Dependencies installed successfully!

:DEPS_DONE
call :CONTINUE
goto :STEP3

:: ==============================================================
::  STEP 3 - DATA DIRECTORY AND CONFIG
:: ==============================================================
:STEP3
call :HEADER "DATA DIRECTORY AND CONFIGURATION"

echo   Haven stores all your data (messages, users, uploads)
echo   separately from the code, so updates never erase anything.
echo.
echo   Data location:  %HAVEN_DATA%
echo.

if exist "%HAVEN_DATA%" goto :DATA_EXISTS
mkdir "%HAVEN_DATA%"
echo   [OK] Created data directory.
goto :DATA_DIR_DONE

:DATA_EXISTS
echo   [OK] Data directory already exists.

:DATA_DIR_DONE
echo.

:: .env file
if exist "%HAVEN_DATA%\.env" goto :ENV_EXISTS
if not exist "%HAVEN_DIR%.env.example" goto :ENV_NO_TEMPLATE
copy "%HAVEN_DIR%.env.example" "%HAVEN_DATA%\.env" >nul
echo   [OK] Created .env config from template.
goto :ENV_DONE

:ENV_NO_TEMPLATE
echo   [!] No .env.example found. Config will be created on first boot.
goto :ENV_DONE

:ENV_EXISTS
echo   [OK] Config file (.env) already exists.

:ENV_DONE
echo.

echo   +-----------------------------------------------------+
echo   ^|  KEY SETTINGS IN YOUR .env FILE:                    ^|
echo   ^|                                                     ^|
echo   ^|  PORT=3000          - Server port                   ^|
echo   ^|  SERVER_NAME=Haven  - Display name for your server  ^|
echo   ^|  ADMIN_USERNAME=admin - Register with this name     ^|
echo   ^|                        to get admin powers           ^|
echo   ^|                                                     ^|
echo   ^|  Location: %APPDATA%\Haven\.env
echo   ^|  Edit with: Notepad, VS Code, any text editor       ^|
echo   +-----------------------------------------------------+

call :CONTINUE
goto :STEP4

:: ==============================================================
::  STEP 4 - SSL CERTIFICATES
:: ==============================================================
:STEP4
call :HEADER "SSL CERTIFICATES"

echo   HTTPS encrypts all traffic between Haven and users.
echo   It's required for voice/video chat over the internet.
echo.

if not exist "%HAVEN_DATA%\certs\cert.pem" goto :GEN_CERT

:: -- Cert already exists --
echo   [OK] SSL certificate already exists.
echo       Location: %HAVEN_DATA%\certs\
echo.
echo   Want to regenerate? Only do this if you have problems.
echo.
echo     [S]  Skip (keep existing cert)
echo     [R]  Regenerate SSL certificate
echo.
set /p "CHOICE=   Your choice: "
if /i "%CHOICE%" NEQ "R" goto :STEP4_DONE

:GEN_CERT
where openssl >nul 2>&1
if errorlevel 1 goto :NO_OPENSSL

echo   Generating self-signed SSL certificate...
echo.
if not exist "%HAVEN_DATA%\certs" mkdir "%HAVEN_DATA%\certs"
openssl req -x509 -newkey rsa:2048 -keyout "%HAVEN_DATA%\certs\key.pem" -out "%HAVEN_DATA%\certs\cert.pem" -days 3650 -nodes -subj "/CN=Haven" 2>nul

if not exist "%HAVEN_DATA%\certs\cert.pem" goto :CERT_FAILED

echo   [OK] SSL certificate generated! (valid for 10 years)
echo       Location: %HAVEN_DATA%\certs\
echo.
echo   +-----------------------------------------------------+
echo   ^|  NOTE: Your browser will show a security warning.   ^|
echo   ^|  This is normal! Self-signed certs aren't trusted   ^|
echo   ^|  by default, but the encryption still works.        ^|
echo   ^|                                                     ^|
echo   ^|  Chrome/Edge: Click "Advanced" then "Proceed"       ^|
echo   ^|  Firefox: Click "Advanced" then "Accept the Risk"   ^|
echo   +-----------------------------------------------------+
goto :STEP4_DONE

:NO_OPENSSL
color 0E
echo   [!] OpenSSL not found - skipping certificate generation.
echo.
echo   Haven will still work, but in HTTP mode:
echo     - Chat and messaging work perfectly
echo     - Voice chat only works on your local machine
echo     - Remote voice/video requires HTTPS
echo.
echo   To enable HTTPS later:
echo     1. Install OpenSSL: slproweb.com/products/Win32OpenSSL.html
echo     2. Run this wizard again (or restart Start Haven.bat)
color 0B
goto :STEP4_DONE

:CERT_FAILED
color 0E
echo   [!] Certificate generation failed.
echo       Haven will run in HTTP mode (still works, no voice remotely).
color 0B

:STEP4_DONE
call :CONTINUE
goto :STEP5

:: ==============================================================
::  STEP 5 - CREATE YOUR ADMIN ACCOUNT (GUIDE)
:: ==============================================================
:STEP5
call :HEADER "CREATE YOUR ADMIN ACCOUNT"

echo   Now the setup is done! Let's learn how to use Haven.
echo.
echo   When you first open Haven in your browser, you need to
echo   register the ADMIN account before anyone else does.
echo.
echo   +-----------------------------------------------------+
echo   ^|                                                     ^|
echo   ^|  HOW TO BECOME ADMIN:                               ^|
echo   ^|                                                     ^|
echo   ^|  1. Open Haven in your browser                      ^|
echo   ^|     (the URL is shown when you start the server)    ^|
echo   ^|                                                     ^|
echo   ^|  2. Click "Register" (NOT Login)                    ^|
echo   ^|                                                     ^|
echo   ^|  3. Username:  admin                                ^|
echo   ^|     (or whatever ADMIN_USERNAME is in your .env)    ^|
echo   ^|                                                     ^|
echo   ^|  4. Choose a STRONG password                        ^|
echo   ^|     (this account controls your entire server!)     ^|
echo   ^|                                                     ^|
echo   ^|  5. You're logged in with full admin powers         ^|
echo   ^|                                                     ^|
echo   +-----------------------------------------------------+
echo.
echo   [!] IMPORTANT: Do this BEFORE sharing the server with
echo       anyone. The first person to register as "admin"
echo       gets admin powers.
echo.
echo   Want a different admin username? Edit your .env file:
echo     %HAVEN_DATA%\.env
echo     Change: ADMIN_USERNAME=your_name

call :CONTINUE
goto :STEP6

:: ==============================================================
::  STEP 6 - CHANNELS AND MESSAGING
:: ==============================================================
:STEP6
call :HEADER "CHANNELS AND MESSAGING"

echo   Channels are rooms where conversations happen.
echo.
echo   CREATING CHANNELS:
echo     - Look at the left sidebar
echo     - Type a channel name in the text field
echo     - Click "Create" - the channel appears instantly
echo.
echo   SUGGESTED STARTER CHANNELS:
echo   +-----------------+----------------------------------+
echo   ^|  #general        ^|  Main hangout, random chat       ^|
echo   ^|  #media          ^|  Links, images, memes            ^|
echo   ^|  #gaming         ^|  Game discussion, LFG            ^|
echo   ^|  #voice-chat     ^|  Text companion for voice calls  ^|
echo   +-----------------+----------------------------------+
echo.
echo   MESSAGING FEATURES:
echo   +-----------------------------------------------------+
echo   ^|  **bold**           = bold text                     ^|
echo   ^|  *italic*           = italic text                   ^|
echo   ^|  ~~strikethrough~~  = strikethrough                 ^|
echo   ^|  `code`             = inline code                   ^|
echo   ^|  ^|^|spoiler^|^|        = hidden until clicked          ^|
echo   ^|  @username          = mention (autocomplete)        ^|
echo   +-----------------------------------------------------+
echo.
echo   OTHER FEATURES:
echo     - Reactions: hover a message and click the emoji
echo     - Replies: click the reply arrow on any message
echo     - File sharing: drag-and-drop or paste images
echo     - GIF search: set up GIPHY key in admin settings
echo.
echo   KEYBOARD SHORTCUTS:
echo     Enter         = Send message
echo     Shift+Enter   = New line
echo     Ctrl+F        = Search messages
echo     /             = Slash commands (/shrug, /roll, etc.)

call :CONTINUE
goto :STEP7

:: ==============================================================
::  STEP 7 - VOICE CHAT AND SCREEN SHARING
:: ==============================================================
:STEP7
call :HEADER "VOICE CHAT AND SCREEN SHARING"

echo   Haven has peer-to-peer voice and screen sharing.
echo   Audio goes directly between users, not through your server.
echo.
echo   HOW TO USE VOICE:
echo   +-----------------------------------------------------+
echo   ^|  1. Join any text channel                           ^|
echo   ^|  2. Click the microphone icon (Join Voice)          ^|
echo   ^|  3. Allow mic access when your browser asks         ^|
echo   ^|  4. Adjust others' volume with their slider         ^|
echo   ^|  5. Click the phone icon to leave voice             ^|
echo   +-----------------------------------------------------+
echo.
echo   SCREEN SHARING:
echo     - Click "Share Screen" to broadcast your display
echo     - Multiple people can share at the same time
echo     - Each person gets their own tile in a grid
echo.
echo   AUDIO CUES:
echo     - Hear tones when users join or leave voice
echo     - Names glow green when someone is speaking
echo.
echo   +-----------------------------------------------------+
echo   ^|  NOTE: Voice requires HTTPS for remote users.       ^|
echo   ^|  If OpenSSL was set up in Step 4, you're good.      ^|
echo   ^|  On localhost, voice always works.                   ^|
echo   +-----------------------------------------------------+

call :CONTINUE
goto :STEP8

:: ==============================================================
::  STEP 8 - ADMIN, THEMES AND SECURITY
:: ==============================================================
:STEP8
call :HEADER "ADMIN TOOLS, THEMES AND SECURITY"

echo   ADMIN PANEL (gear icon in sidebar):
echo   +-----------------------------------------------------+
echo   ^|  Kick      = Disconnects a user (they can rejoin)   ^|
echo   ^|  Mute      = Timed silence (can't send messages)    ^|
echo   ^|  Ban       = Permanent block from server            ^|
echo   ^|  Roles     = Assign moderator permissions           ^|
echo   ^|  Settings  = Server name, EULA, message limits      ^|
echo   +-----------------------------------------------------+
echo.
echo   THEMES (20+ built-in):
echo     Haven, Discord, Matrix, Cyberpunk, Nord, Dracula,
echo     Tron, HALO, Lord of the Rings, Bloodborne, Windows 95...
echo     Each user picks their own theme, it's per-person.
echo.
echo   VISUAL EFFECTS (stackable on any theme):
echo     CRT scanlines, Matrix rain, Snowfall, Campfire embers
echo.
echo   SECURITY (automatic):
echo   +-----------------------------------------------------+
echo   ^|  [OK] Passwords hashed with bcrypt                  ^|
echo   ^|  [OK] JWT session tokens                            ^|
echo   ^|  [OK] Rate limiting against brute-force              ^|
echo   ^|  [OK] CSP headers block cross-site scripting         ^|
echo   ^|  [OK] All user input sanitized                       ^|
echo   ^|  [OK] JWT + VAPID keys auto-generated                ^|
echo   +-----------------------------------------------------+
echo.
echo   BACKUPS - all your data is in one folder:
echo     %HAVEN_DATA%\
echo     Just copy it somewhere safe periodically.
echo.
echo   AUTO-START ON BOOT:
echo     Press Win+R, type shell:startup, press Enter.
echo     Drop a "Start Haven" shortcut into that folder.

call :CONTINUE
goto :FINISH

:: ==============================================================
::  FINISH - INVITE FRIENDS AND LAUNCH
:: ==============================================================
:FINISH
cls
color 0A
echo.
echo.
echo       +----------------------------------------------+
echo       ^|                                              ^|
echo       ^|          Setup Complete!                      ^|
echo       ^|                                              ^|
echo       +----------------------------------------------+
echo.
echo.
echo   +------- HOW FRIENDS CONNECT ------------------------+
echo   ^|                                                     ^|
echo   ^|  SAME WIFI (easiest):                               ^|
echo   ^|    1. Find your local IP: run  ipconfig             ^|
echo   ^|       Look for "IPv4 Address" (e.g. 192.168.1.50)  ^|
echo   ^|    2. Friends open: https://YOUR_IP:3000            ^|
echo   ^|    3. They click through cert warning and register  ^|
echo   ^|                                                     ^|
echo   ^|  OVER THE INTERNET:                                 ^|
echo   ^|    1. Find your public IP: whatismyip.com            ^|
echo   ^|    2. Port forward 3000 TCP on your router           ^|
echo   ^|       (router admin: usually 192.168.1.1)           ^|
echo   ^|    3. Friends open: https://PUBLIC_IP:3000           ^|
echo   ^|                                                     ^|
echo   ^|  NO PORT FORWARDING? Use Haven's built-in tunnel:   ^|
echo   ^|    Enable it in Admin Settings, Tunnel section       ^|
echo   ^|                                                     ^|
echo   +-----------------------------------------------------+
echo.
echo   ----------------------------------------------------
echo.
echo     [L]  Launch Haven now (runs Start Haven.bat)
echo     [O]  Open data folder (%HAVEN_DATA%)
echo     [Q]  Quit
echo.
set /p "CHOICE=   Your choice: "
if /i "%CHOICE%"=="L" goto :DO_LAUNCH
if /i "%CHOICE%"=="O" goto :DO_OPEN
goto :QUIT

:DO_LAUNCH
echo.
echo   Launching Haven...
start "" "%HAVEN_DIR%Start Haven.bat"
goto :QUIT

:DO_OPEN
explorer "%HAVEN_DATA%"
goto :FINISH

:: ==============================================================
:QUIT
echo.
echo   Thanks for using Haven! Happy chatting.
echo.
exit /b 0
