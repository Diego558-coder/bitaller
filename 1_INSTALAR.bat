@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Bitaller: instalacion (solo la primera vez) ===
where node >nul 2>nul
if errorlevel 1 (
  echo Instalando Node.js LTS...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo Node quedo instalado. CIERRE esta ventana y vuelva a abrir 1_INSTALAR.bat
  pause
  exit /b
)
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo Instalando cloudflared, el tunel gratis de Cloudflare...
  winget install -e --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
)
if not exist ".env.local" copy "env-local-ejemplo.txt" ".env.local" >nul
echo Instalando dependencias (tarda unos minutos)...
call npm install
if errorlevel 1 ( echo ERROR en npm install & pause & exit /b )
echo Compilando...
call npm run build
if errorlevel 1 ( echo ERROR al compilar & pause & exit /b )
echo.
echo ==== LISTO. Ahora abra 2_TUNEL.bat ====
pause
