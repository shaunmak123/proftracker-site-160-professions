@echo off
cd /d "%~dp0"
start "server2" /min cmd /c "node dev-server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8081/index.html"
