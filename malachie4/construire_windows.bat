@echo off
chcp 65001 >nul
title Malachie 4 Projections — construction pour Windows
echo ============================================================
echo   Malachie 4 Projections — construction du programme Windows
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js n'est pas installe sur cet ordinateur.
  echo     Telechargez la version "LTS" sur  https://nodejs.org  puis relancez ce fichier.
  pause
  exit /b 1
)

echo [1/3] Installation des composants (une seule fois, environ 200 Mo)...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [!] L'installation a echoue. Verifiez la connexion Internet de cet ordinateur
  echo     (elle n'est necessaire que pour cette etape).
  pause
  exit /b 1
)

echo.
echo [2/3] Verification du logiciel...
call npm test

echo.
echo [3/3] Fabrication de l'installateur et de la version portable...
call npm run dist
if errorlevel 1 (
  echo.
  echo [!] La fabrication a echoue. Consultez le recapitulatif ci-dessus.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Termine ! Vos fichiers sont dans le dossier  dist\
echo     - Malachie4-Projections-2.0.0-x64.exe          (installateur)
echo     - Malachie4-Projections-portable-2.0.0.exe     (cle USB)
echo ============================================================
echo.
echo   Pour essayer le logiciel tout de suite sans rien installer : npm start
echo.
pause
