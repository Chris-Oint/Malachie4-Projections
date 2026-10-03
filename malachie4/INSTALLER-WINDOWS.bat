@echo off
chcp 65001 >nul
title Malachie 4 Projections — INSTALLER-WINDOWS (Construction Setup .exe)
echo ============================================================================
echo   MALACHIE 4 PROJECTIONS — Construction de l'Installateur Windows (.exe)
echo   (Moyen 3 : construit le Setup .exe et la version portable .exe)
echo ============================================================================
echo.

if exist "%~dp0malachie4\package.json" (
  cd /d "%~dp0malachie4"
) else (
  cd /d "%~dp0"
)

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js n'est pas installe sur cet ordinateur.
  echo     - Moyen sans Node.js (le plus simple) : telechargez directement le Setup .exe
  echo       deja construit sur votre compte GitHub :
  echo       https://github.com/Chris-Oint/Malachie4-Projections/releases/latest
  echo     - Ou installez Node.js LTS depuis https://nodejs.org puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/3] Premiere utilisation : installation des composants ^(environ 1 a 2 min^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [!] Echec de npm install. Verifiez votre connexion Internet.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Composants deja presents ^(node_modules^).
)

echo.
echo [2/3] Verification rapide du logiciel...
call npm test

echo.
echo [3/3] Construction du Setup .exe installable et de la version portable...
call npm run dist
if errorlevel 1 (
  echo [!] La construction avec signature d'icone a rencontre un blocage, essai en mode direct...
  call npx electron-builder --win --x64 -c.win.signAndEditExecutable=false
  if errorlevel 1 (
    echo [!] Echec de la construction.
    pause
    exit /b 1
  )
)

if exist "livraison\" (
  if not exist "dist\" mkdir "dist"
  copy /Y "livraison\*.exe" "dist\" >nul 2>nul
)

echo.
echo ============================================================================
echo   TERMINE AVEC SUCCES ! Vos logiciels Windows (.exe) sont prets :
echo     - Dossier : %cd%\livraison\  ^(et %cd%\dist\^)
echo     - Installateur Setup : Malachie4-Projections-2.0.0-x64.exe
echo     - Version Portable   : Malachie4-Projections-portable-2.0.0.exe
echo ============================================================================
echo.
if exist "livraison\" explorer "livraison"
pause
