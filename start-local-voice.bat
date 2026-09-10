@echo off
setlocal

set "PROJECT_DIR=C:\Users\TORDAPC\Documents\Interaktiv_Jatekmester_DnD_Dashboard"

start "DND Dashboard - API" cmd /k "cd /d ""%PROJECT_DIR%\server"" && set LIVEKIT_API_KEY=%LIVEKIT_API_KEY% && set LIVEKIT_API_SECRET=%LIVEKIT_API_SECRET% && node index.js"
start "DND Dashboard - Angular" cmd /k "cd /d ""%PROJECT_DIR%\client"" && npm start"

echo LiveKit Cloud, az API es az Angular elinditva.
pause
