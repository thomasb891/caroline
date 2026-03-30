@echo off
title Hublo Gestion - Caroline
cd /d "%~dp0"
echo ============================================
echo    Hublo Gestion - Caroline
echo ============================================
echo.
echo Demarrage du serveur...
echo.
echo Acces local  : http://localhost:3050
echo Acces reseau : http://86.205.97.174:3050
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo ============================================
echo.
node server.js
pause
