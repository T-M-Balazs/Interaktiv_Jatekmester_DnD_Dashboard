@echo off
setlocal

set "PROJECT_DIR=C:\Users\TORDAPC\Documents\Interaktiv_Jatekmester_DnD_Dashboard"
set "CLIENT_DIR=%PROJECT_DIR%\client"
set "SERVER_DIR=%PROJECT_DIR%\server"

start "DND Dashboard - API" cmd /k "cd /d ""%SERVER_DIR%"" && set LIVEKIT_API_KEY=%LIVEKIT_API_KEY% && set LIVEKIT_API_SECRET=%LIVEKIT_API_SECRET% && node index.js"
start "DND Dashboard - Angular" cmd /k "cd /d ""%CLIENT_DIR%"" && npm start"
timeout /t 8 /nobreak >nul
start "DND Dashboard - ngrok" cmd /k "cd /d ""%CLIENT_DIR%"" && ngrok.exe http 44491"

echo LiveKit Cloud, az API, Angular es ngrok elinditva.
echo A publikus ngrok URL az ngrok ablakaban jelenik meg.
pause