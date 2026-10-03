@echo off
chcp 65001 >nul
title Malachie 4 Projections — Mode Secours (Anti-clignotement)
echo ============================================================================
echo   MALACHIE 4 PROJECTIONS — Lancement en MODE SECOURS (Moyen 5)
echo   ^(Desactive l'acceleration GPU si la transparence clignote sur ce PC^)
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
  echo     Si vous avez deja installe le logiciel .exe, lancez-le avec :
  echo     Malachie4-Projections-portable-2.0.0.exe --mode-secours --disable-gpu
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

set M4_SECOURS=1
echo [2/2] Ouverture en Mode Secours ^(sans clignotement de transparence^)...
call npx electron . --mode-secours --disable-gpu --disable-transparent-visuals
