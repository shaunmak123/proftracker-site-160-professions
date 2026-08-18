@echo off
cd /d "%~dp0"
start "server" /min cmd /c "node dev-server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/index.html"
