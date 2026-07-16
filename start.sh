#!/bin/bash
set -e
node -v | awk -F'v|\\.' '{if($2<18)exit 1}'

cd network_service
[ ! -d node_modules ] && npm install
npm run dev &
sleep 3
cd ..

cd backend
[ ! -d node_modules ] && npm install
npm run dev &
sleep 3
cd ..

cd frontend
[ ! -d node_modules ] && npm install
npm run dev &
cd ..

echo Start Success
echo Frontend:http://127.0.0.1:5173
echo Backend:http://127.0.0.1:3100
