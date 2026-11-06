@echo off
setlocal

REM ==============================
REM FULL BUILD: knowledge + exe + install
REM ==============================
set "PROJECT_ROOT=C:\CDCSOFT\Help Center"
set "HELPCENTER_ROOT=C:\CDCSOFT"

cd /d "%PROJECT_ROOT%"

echo.
echo [1/4] Building OKF knowledge bundles (shipped copy)...
node "%PROJECT_ROOT%\scripts\buildOkfBundle.js" "%PROJECT_ROOT%\documents" "%PROJECT_ROOT%\okf"
IF ERRORLEVEL 1 (
  echo OKF build failed
  pause
  exit /b 1
)

echo.
echo [2/4] Deploying knowledge to %HELPCENTER_ROOT% ...
node "%PROJECT_ROOT%\scripts\buildOkfBundle.js" "%PROJECT_ROOT%\documents" "%HELPCENTER_ROOT%" --assistant
IF ERRORLEVEL 1 (
  echo Knowledge deploy failed
  pause
  exit /b 1
)

echo.
echo [3/4] Building installer...
call npm run dist
IF ERRORLEVEL 1 (
  echo npm run dist failed
  pause
  exit /b 1
)

echo.
echo [4/4] Installing...
call "%~dp0install.cmd"

exit /b 0
