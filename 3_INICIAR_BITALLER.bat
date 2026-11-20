@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env.local" copy "env-local-ejemplo.txt" ".env.local" >nul
echo === Bitaller: servidor local ===
echo Antes de seguir, complete en .env.local: APP_URL, META_ACCESS_TOKEN y META_APP_SECRET
echo (se abre el Bloc de notas; guarde con Ctrl+S y cierrelo para continuar)
notepad .env.local
echo.
echo Iniciando en http://localhost:3000  (NO cierre esta ventana)
call npm start
pause
