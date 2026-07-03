@echo off
chcp 65001 >nul
cd /d "%~dp0"
title rainrain
cls
echo ========================================
echo       rainrain
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js not detected.
  echo     Install the LTS version from https://nodejs.org , then run this file again.
  echo.
  pause
  exit /b 1
)

rem OneDrive-synced folders sync the build cache (.next) and break / slow down startup.
echo "%cd%" | findstr /i "OneDrive" >nul
if not errorlevel 1 (
  echo [!] This folder is inside OneDrive.
  echo     OneDrive syncs the internal build cache (.next) and can make startup fail or be very slow.
  echo     Strongly recommended: move this whole folder OUT of OneDrive
  echo     (e.g. to  C:\rainrain ) and start it from there.
  echo.
  pause
)

if not exist node_modules (
  echo Installing dependencies (first run only, needs internet, a few minutes)...
  call npm install || ( echo Install failed - check your internet connection. & pause & exit /b 1 )
)

if not exist .env.local call npm run setup

echo Generating / updating book covers (first time is slower)...
call npm run covers

echo Building the full-text index in the background (does not block startup)...
start "" /b cmd /c "npm run index >nul 2>nul"

echo Parsing the respondent dataset...
call npm run respondents

echo Preparing the interface (first build is slow, fast afterwards)...
call npm run build

echo.
echo Done! Opening http://localhost:3000 in your browser.
echo Access password: see .env.local
echo To stop the library: close this window or press Ctrl + C.
echo.

start "" http://localhost:3000
call npm run start
