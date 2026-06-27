@echo off
setlocal
cd /d "%~dp0\.."

echo ============================================================
echo    RED SIGO - Build Release
echo ============================================================
echo.

REM ---- Load .env for Go builds that need env vars ----
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "LINE=%%A"
        if not "!LINE:~0,1!"=="#" (
            set "%%A=%%B"
        )
    )
)

echo [1/6] Cleaning previous release...
if exist release rmdir /s /q release
mkdir release
mkdir release\static
mkdir release\api
mkdir release\configs
mkdir release\web
mkdir release\scripts
mkdir release\tor\tor_bin
mkdir release\tor\tor_service
mkdir release\indexar\db

echo [2/6] Compiling Process Manager...
cd process-manager
go build -ldflags="-s -w" -o ..\release\process-manager.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Process Manager build failed!
    exit /b %errorlevel%
)
cd ..

echo [3/6] Compiling Server...
cd server
go build -ldflags="-s -w" -o ..\release\server.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Server build failed!
    exit /b %errorlevel%
)
cd ..

echo [4/6] Building Frontend (Vite)...
cd frontend
call pnpm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    exit /b %errorlevel%
)
cd ..

echo [5/6] Assembling release folder...

REM Frontend SPA -> static/
xcopy /E /I /Y frontend\dist release\static >nul

REM Admin panel files -> static/
if exist frontend\static\admin.html copy frontend\static\admin.html release\static\ >nul
if exist frontend\static\admin.js copy frontend\static\admin.js release\static\ >nul
if exist frontend\static\login.html copy frontend\static\login.html release\static\ >nul
if exist frontend\static\style.css copy frontend\static\style.css release\static\ >nul
if exist frontend\static\app.js copy frontend\static\app.js release\static\ >nul
if exist frontend\static\img xcopy /E /I /Y frontend\static\img release\static\img >nul

REM API (Python)
copy api\app.py release\api\ >nul
if exist api\requirements.txt copy api\requirements.txt release\api\ >nul

REM Configs
copy configs\config.json release\configs\ >nul
copy configs\licenses.json release\configs\ >nul

REM Process Manager Web UI
xcopy /E /I /Y web release\web >nul

REM Scripts
copy scripts\toggle_tor.bat release\scripts\ >nul
copy scripts\rebuild_frontend.bat release\scripts\ >nul

REM Tor
if exist tor\tor_bin\* xcopy /E /I /Y tor\tor_bin release\tor\tor_bin >nul
if exist tor\tor_service\torrc copy tor\tor_service\torrc release\tor\tor_service\ >nul

REM Environment template
if exist .env.example copy .env.example release\ >nul

echo [6/6] Updating local static/ for development...
if exist static rmdir /s /q static
mkdir static
xcopy /E /I /Y frontend\dist static >nul
if exist frontend\static\admin.html copy frontend\static\admin.html static\ >nul
if exist frontend\static\admin.js copy frontend\static\admin.js static\ >nul
if exist frontend\static\login.html copy frontend\static\login.html static\ >nul
if exist frontend\static\style.css copy frontend\static\style.css static\ >nul
if exist frontend\static\app.js copy frontend\static\app.js static\ >nul
if exist frontend\static\img xcopy /E /I /Y frontend\static\img static\img >nul

echo.
echo ============================================================
echo    BUILD COMPLETE
echo ============================================================
echo.
echo  Release contents:
echo    release\process-manager.exe   (Orchestrator)
echo    release\server.exe            (Web Server)
echo    release\api\                  (Python API)
echo    release\static\               (Frontend SPA)
echo    release\web\                  (Process Manager UI)
echo    release\configs\              (Configuration files)
echo    release\scripts\              (Utility scripts)
echo    release\tor\                  (Tor service)
echo.
echo  To run: execute process-manager.exe from the release folder.
echo ============================================================
pause
