@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ============================================================
echo    RED SIGO - Lanzador Unificado
echo ============================================================
echo.
echo  Servicios disponibles:
echo    [1] API Gateway   (Flask, puerto 5000)
echo    [2] Server         (Go, puerto 80)
echo    [3] Process Manager (Go, puerto 8081)
echo    [4] Frontend Dev   (Vite, puerto 5173)
echo    [5] Tor Service
echo    [A] TODOS los servicios
echo    [Q] Salir
echo.
echo ============================================================

set /p CHOICE="Selecciona opcion: "

if /i "%CHOICE%"=="1" goto start_api
if /i "%CHOICE%"=="2" goto start_server
if /i "%CHOICE%"=="3" goto start_pm
if /i "%CHOICE%"=="4" goto start_frontend
if /i "%CHOICE%"=="5" goto start_tor
if /i "%CHOICE%"=="A" goto start_all
if /i "%CHOICE%"=="Q" goto end
echo Opcion no valida.
pause
goto end

:start_api
echo [INFO] Iniciando API Gateway (Flask)...
start "RED_SIGO - API" cmd /k "cd /d %~dp0\.. && python api\app.py"
goto end

:start_server
echo [INFO] Iniciando Server (Go)...
start "RED_SIGO - Server" cmd /k "cd /d %~dp0\..\server && go run ."
goto end

:start_pm
echo [INFO] Iniciando Process Manager (Go)...
start "RED_SIGO - Process Manager" cmd /k "cd /d %~dp0\..\process-manager && go run ."
goto end

:start_frontend
echo [INFO] Iniciando Frontend (Vite Dev)...
start "RED_SIGO - Frontend" cmd /k "cd /d %~dp0\..\frontend && npm run dev"
goto end

:start_tor
echo [INFO] Iniciando Tor Service...
call "%~dp0toggle_tor.bat"
goto end

:start_all
echo [INFO] Iniciando TODOS los servicios...
echo.

echo [1/5] API Gateway...
start "RED_SIGO - API" cmd /k "cd /d %~dp0\.. && python api\app.py"
timeout /t 2 /nobreak >nul

echo [2/5] Server Go...
start "RED_SIGO - Server" cmd /k "cd /d %~dp0\..\server && go run ."
timeout /t 2 /nobreak >nul

echo [3/5] Process Manager...
start "RED_SIGO - Process Manager" cmd /k "cd /d %~dp0\..\process-manager && go run ."
timeout /t 2 /nobreak >nul

echo [4/5] Frontend Dev...
start "RED_SIGO - Frontend" cmd /k "cd /d %~dp0\..\frontend && npm run dev"
timeout /t 1 /nobreak >nul

echo [5/5] Tor Service...
start "RED_SIGO - Tor" cmd /k "call %~dp0toggle_tor.bat"

echo.
echo ============================================================
echo   Todos los servicios iniciados en ventanas separadas.
echo.
echo   API Gateway:      http://localhost:5000
echo   Server:           http://localhost:80
echo   Process Manager:  http://localhost:8081
echo   Frontend Dev:     http://localhost:5173
echo   Tor SOCKS:        127.0.0.1:9050
echo ============================================================
pause

:end
