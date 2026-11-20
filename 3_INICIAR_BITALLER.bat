@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env.local" copy "env-local-ejemplo.txt" ".env.local" >nul
echo === Bitaller: servidor local ===
echo Antes de seguir, complete en .env.local: APP_URL y ACCESS_TOKEN
echo (se abre el Bloc de notas; guarde con Ctrl+S y cierrelo para continuar)
notepad .env.local
echo.
echo Compilando cambios...
call npm run build
if errorlevel 1 ( echo ERROR al compilar & pause & exit /b )
echo Iniciando en http://localhost:3100  (NO cierre esta ventana)
call npm start
pause
