@echo off
chcp 65001 >nul
title Malachie 4 Projections — Essai direct (LANCER.bat)
echo ============================================================================
echo   MALACHIE 4 PROJECTIONS — Lancement direct (Moyen 4)
echo ============================================================================
echo.

if exist "%~dp0malachie4\package.json" (
  cd /d "%~dp0malachie4"
) else (
  cd /d "%~dp0"
)

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js n'est pas installe sur ce PC.
  echo     Telechargez directement le fichier .exe deja construit sur GitHub
  echo     ^(aucun besoin de Node.js^) :
  echo     https://github.com/Chris-Oint/Malachie4-Projections/releases/latest
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/2] Premiere fois : installation automatique des composants ^(npm install^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [!] Echec de npm install. Verifiez la connexion Internet.
    pause
    exit /b 1
  )
)

echo [2/2] Ouverture de Malachie 4 Projections...
call npm start
