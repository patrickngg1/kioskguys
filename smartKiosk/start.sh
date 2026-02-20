#!/usr/bin/env bash
set -e

PORT_BACKEND=8000
PORT_FRONTEND=5173

echo "🧹 Cleaning up old processes..."

# Kill anything using backend port
if lsof -ti :$PORT_BACKEND > /dev/null ; then
  lsof -ti :$PORT_BACKEND | xargs kill -9
  echo "Killed process on port $PORT_BACKEND"
fi

# Kill anything using frontend port
if lsof -ti :$PORT_FRONTEND > /dev/null ; then
  lsof -ti :$PORT_FRONTEND | xargs kill -9
  echo "Killed process on port $PORT_FRONTEND"
fi

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

echo "⏳ Waiting for Django to be ready..."

# Wait until port 8000 responds
until curl -s http://127.0.0.1:8000 > /dev/null; do
  sleep 1
done

echo "✅ Django is ready!"

echo "🚀 Starting frontend (Vite)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  → http://127.0.0.1:8000"
echo "Frontend → http://127.0.0.1:5173"
echo "Press Ctrl+C to stop everything"

wait
