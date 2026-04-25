@echo off
setlocal enabledelayedexpansion
REM Navigate to tor/ folder (one level up from scripts/, then into tor/)
cd /d "%~dp0\..\tor"

set "TOR_BIN=tor_bin\tor.exe"
set "TORRC=tor_service\torrc"
set "PID_FILE=tor.pid"

if not exist "%TOR_BIN%" (
    echo [ERROR] No se encuentra %TOR_BIN%
    echo Por favor, coloca tor.exe en la carpeta 'tor_bin'.
    ping 127.0.0.1 -n 4 >nul
    exit /b 1
)

:start_tor
echo [INFO] Limpiando procesos antiguos para asegurar arranque limpio...
taskkill /IM tor.exe /F 2>nul
if exist "%PID_FILE%" del "%PID_FILE%"

echo [INFO] Iniciando Servicio Tor Hidden Service...
start "UCO Tor Service" /MIN "%TOR_BIN%" -f "%TORRC%"

echo [INFO] Verificando arranque (espera 5 segundos)...
ping 127.0.0.1 -n 6 >nul

set "NEW_PID="
for /f "tokens=2" %%a in ('tasklist /nh /fi "imagename eq tor.exe"') do set "NEW_PID=%%a"

if not defined NEW_PID (
    echo [ERROR] No se pudo iniciar Tor. 
    echo REVISA: Si el archivo torrc tiene errores o si el puerto 9050 esta ocupado.
    goto :end
)

echo !NEW_PID! > "%PID_FILE%"
echo [OK] Servicio Tor INICIADO CORRECTAMENTE (PID: !NEW_PID!).
echo.
echo ========================================
echo    DIRECCIONES ONION ACTIVAS
echo ========================================

set "FOUND_ONION=0"

if exist "hidden_service_webyapi\hostname" (
    echo [1] Web y API:
    type "hidden_service_webyapi\hostname"
    set "FOUND_ONION=1"
    echo.
)
if exist "hidden_service_2\hostname" (
    echo [2] Servicio Alternativo:
    type "hidden_service_2\hostname"
    set "FOUND_ONION=1"
    echo.
)
if exist "hidden_service_api\hostname" (
    echo [API] Backend Python:
    type "hidden_service_api\hostname"
    set "FOUND_ONION=1"
    echo.
)

REM Fallback: Buscar en todas las carpetas que contengan 'hostname'
for /d %%d in (*) do (
    if exist "%%d\hostname" (
        set "IS_KNOWN=0"
        if "%%d"=="hidden_service_webyapi" set "IS_KNOWN=1"
        if "%%d"=="hidden_service_2" set "IS_KNOWN=1"
        if "%%d"=="hidden_service_api" set "IS_KNOWN=1"
        
        if "!IS_KNOWN!"=="0" (
            echo [!] Servicio detectado en carpeta '%%d':
            type "%%d\hostname"
            set "FOUND_ONION=1"
            echo.
        )
    )
)

if "!FOUND_ONION!"=="0" (
    echo [?] Generando direcciones...
    echo Tor puede tardar hasta 60 segundos la primera vez.
    echo Vuelve a ejecutar este script en un momento.
)

echo ========================================
echo NOTA: El script permanecera abierto mientras 
echo Tor este funcionando (Monitoreando PID: !NEW_PID!).
echo ========================================

:monitor_loop
tasklist /fi "PID eq !NEW_PID!" 2>nul | find "!NEW_PID!" >nul
if !ERRORLEVEL! == 0 (
    ping 127.0.0.1 -n 6 >nul
    goto :monitor_loop
)

echo.
echo [INFO] El proceso Tor se ha cerrado.
if exist "%PID_FILE%" del "%PID_FILE%"

:end
echo.
echo Operacion finalizada.
exit /b 0
