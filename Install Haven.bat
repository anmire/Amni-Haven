@echo off
title Haven Installer
color 0A
echo.
echo  ========================================
echo       HAVEN - Installer Launcher
echo  ========================================
echo.
echo  [*] Launching graphical installer...
echo.

:: Launch the PowerShell WPF installer
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0Install Haven.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [!] Installer exited with an error. Check the output above.
    echo.
    pause
)
