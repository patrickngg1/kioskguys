#!/usr/bin/env bash
set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "❌ nvm not found. Install nvm first."
  exit 1
fi

cleanup() {
  echo ""
  echo "🛑 Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit
}

trap cleanup SIGINT SIGTERM

echo "🔧 Using Node 24..."
nvm use 24

echo "📦 Installing frontend dependencies..."
npm install --legacy-peer-deps

echo "🚀 Starting Django backend..."
python3 manage.py runserver &
BACKEND_PID=$!

echo "🚀 Starting frontend (Vite)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers running"
echo "Backend  → http://127.0.0.1:8000"
echo "Frontend → http://127.0.0.1:5173"
echo ""
echo "Press Ctrl+C to stop everything"

wait
