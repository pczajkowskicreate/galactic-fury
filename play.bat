@echo off
title Galactic Fury
cd /d "%~dp0"

:: Try Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Galactic Fury is starting...
    start "" "http://localhost:8000"
    python -m http.server 8000
    goto :eof
)

:: Try Python via py launcher
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo Galactic Fury is starting...
    start "" "http://localhost:8000"
    py -m http.server 8000
    goto :eof
)

:: Try Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Galactic Fury is starting...
    start "" "http://localhost:8000"
    npx --yes serve -p 8000 -s .
    goto :eof
)

echo.
echo  ERROR: Python or Node.js not found.
echo  Install Python from https://python.org  (free, takes 2 minutes)
echo  Then double-click play.bat again.
echo.
pause
