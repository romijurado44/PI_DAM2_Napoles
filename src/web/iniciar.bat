@echo off
chcp 65001 >nul
title Pizzeria Napoles - servidor local
cd /d "%~dp0"
echo.
echo   Pizzeria Napoles  -  http://localhost:5500
echo   (cierra esta ventana para parar el servidor)
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:5500"
  python -m http.server 5500
) else (
  echo   No se ha encontrado Python: abro index.html directamente.
  start "" "%~dp0index.html"
  pause
)
