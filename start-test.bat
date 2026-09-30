@echo off
REM -------------------------------------------------------------
REM  SEFY - local test launcher. Double-click to start.
REM  Serves the project on http://localhost:3000 and opens the
REM  app + the terminal in the browser. Close this window to stop.
REM -------------------------------------------------------------
setlocal
cd /d "%~dp0"
set PORT=3000
set "PATH=C:\Program Files\nodejs;%PATH%"
title SEFY - serveur de test (port %PORT%)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js est introuvable. Installez-le depuis https://nodejs.org
  pause
  exit /b 1
)

REM Open the pages a moment after the server starts
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:%PORT%/index.html & start "" http://localhost:%PORT%/terminal.html?t=1"

if exist "node_modules\express" (
  echo SEFY en cours d'execution sur http://localhost:%PORT%
  echo   App      : http://localhost:%PORT%/index.html
  echo   Terminal : http://localhost:%PORT%/terminal.html?t=1   ^(t=1 rouge, 2 bleu, 3 jaune^)
  echo   Admin    : http://localhost:%PORT%/admin.html
  echo Fermez cette fenetre pour arreter le serveur.
  echo.
  node server.js
) else (
  echo express absent - utilisation de "npx serve"
  npx -y serve -l %PORT% .
)

pause
