@echo off
title Amni-Haven — Build Executable
color 0B
echo.
echo  ============================================
echo    AMNI-HAVEN — Build Distributable EXE
echo  ============================================
echo.
cd /d "%~dp0"
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo  [*] Node.js found: & node -v
echo.
echo  [*] Installing build tools...
call npm install --save-dev @yao-pkg/pkg 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [!] pkg install failed, trying global...
    call npm install -g @yao-pkg/pkg
)
echo.
echo  [*] Installing production dependencies...
call npm install --production 2>nul
echo.
if not exist "dist" mkdir dist
if not exist "dist\public" mkdir dist\public
if not exist "dist\src" mkdir dist\src
if not exist "dist\config" mkdir dist\config
echo  [*] Copying public assets...
xcopy /E /Y /Q "public" "dist\public\" >nul 2>&1
echo  [*] Copying source modules...
xcopy /E /Y /Q "src" "dist\src\" >nul 2>&1
echo  [*] Copying config...
xcopy /E /Y /Q "config" "dist\config\" >nul 2>&1
if exist ".env.example" copy /Y ".env.example" "dist\.env.example" >nul
if exist "LICENSE" copy /Y "LICENSE" "dist\LICENSE" >nul
echo.
echo  [*] Building executable with pkg...
echo     Target: Windows x64 (node18)
echo.
call npx @yao-pkg/pkg server.js --targets node18-win-x64 --output dist\AmniHaven.exe --compress GZip --options max-old-space-size=4096 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [!] pkg failed. Trying alternative approach...
    echo  [*] Creating launcher wrapper instead...
    goto :WRAPPER
)
echo.
if exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo  [*] Copying native SQLite3 binding...
    if not exist "dist\build\Release" mkdir "dist\build\Release"
    copy /Y "node_modules\better-sqlite3\build\Release\better_sqlite3.node" "dist\build\Release\" >nul
)
if exist "node_modules\better-sqlite3\prebuilds" (
    echo  [*] Copying SQLite3 prebuilds...
    xcopy /E /Y /Q "node_modules\better-sqlite3\prebuilds" "dist\prebuilds\" >nul 2>&1
)
echo.
echo  ============================================
echo    BUILD COMPLETE
echo  ============================================
echo.
echo  Output: dist\AmniHaven.exe
echo  Assets: dist\public\  dist\src\  dist\config\
echo.
echo  To distribute:
echo    1. Zip the entire "dist" folder
echo    2. Users extract and run AmniHaven.exe
echo    3. First-run wizard handles setup
echo.
echo  NOTE: The .exe embeds Node.js + your server code.
echo  The public/ and src/ folders must stay alongside it.
echo  PixelCipher encryption is baked into the binary.
echo.
pause
exit /b 0
:WRAPPER
echo.
echo  [*] Creating portable launcher (no compilation needed)...
(
echo @echo off
echo title Amni-Haven Server
echo color 0A
echo cd /d "%%~dp0"
echo if not exist node_modules (
echo     echo [*] Installing dependencies...
echo     call npm install --production
echo ^)
echo echo [*] Starting Amni-Haven...
echo node server.js
echo pause
) > dist\Start-AmniHaven.bat
copy /Y "package.json" "dist\package.json" >nul
copy /Y "package-lock.json" "dist\package-lock.json" >nul 2>&1
copy /Y "server.js" "dist\server.js" >nul
echo.
echo  ============================================
echo    PORTABLE BUILD COMPLETE
echo  ============================================
echo.
echo  Output: dist\ (portable folder)
echo  Run: dist\Start-AmniHaven.bat
echo  Requires Node.js on target machine.
echo.
pause
exit /b 0
