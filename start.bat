@echo off
chcp 65001
title FreeBuddy Final Clean Start

node -v >nul 2>&1 || (echo Node.js 18+ Required && pause && exit /b 1)

cd network_service
if not exist node_modules npm install
start "FreeBuddy-Network" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak >nul

cd backend
if not exist node_modules npm install
start "FreeBuddy-Backend" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak >nul

cd frontend
if not exist node_modules npm install
start "FreeBuddy-Frontend" cmd /k "npm run dev"
cd ..

echo Start Success
echo Frontend:http://127.0.0.1:5173
echo Backend:http://127.0.0.1:3100
pause
