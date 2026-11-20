@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Bitaller: tunel publico ===
echo Copie la URL que termina en .trycloudflare.com y NO cierre esta ventana.
echo.
where cloudflared >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" ( "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000 & pause & exit /b )
  if exist "%ProgramFiles%\cloudflared\cloudflared.exe" ( "%ProgramFiles%\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000 & pause & exit /b )
  echo No se encontro cloudflared. Ejecute primero 1_INSTALAR.bat y reinicie el PC si sigue fallando.
  pause & exit /b
)
cloudflared tunnel --url http://localhost:3000
pause
