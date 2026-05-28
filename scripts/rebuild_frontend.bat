@echo off
setlocal

REM Rebuild the frontend SPA from release\frontend\ and replace the
REM release\static\ assets. Run this from inside release\ (or anywhere
REM with a release\frontend\ sibling). Requires pnpm + node.

cd /d "%~dp0\.."

if not exist frontend (
    echo [ERROR] No se encuentra la carpeta frontend\ junto a este script.
    exit /b 1
)

echo [1/3] Instalando dependencias...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] pnpm install fallo.
    exit /b %errorlevel%
)

echo [2/3] Compilando frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build fallo.
    exit /b %errorlevel%
)
cd ..

echo [3/3] Reemplazando static\...
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
echo  Frontend actualizado en static\
endlocal
