@echo off
echo Starting ThreatVision AI...

:: Start backend normally. Administrator is only required for firewall write actions.
echo Starting Backend API...
start "ThreatVision Backend" cmd /k "cd /d D:\internship\majorproject\app && npm run server"

:: Start frontend normally
echo Starting Frontend...
start "ThreatVision Frontend" cmd /k "cd /d D:\internship\majorproject\app && npm run dev -- --host 127.0.0.1"

:: Wait 5 seconds for servers to start
echo Waiting for servers to initialize...
timeout /t 5 /nobreak

:: Open browser
echo Opening Web App...
start http://127.0.0.1:5173/

exit
