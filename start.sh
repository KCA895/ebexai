#!/bin/bash

# EbexAI Production Startup Script

echo "🚀 Starting EbexAI in Production Mode..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Create .env file with:"
    echo "GROQ_API_KEY=your_api_key_here"
    echo "PORT=3001"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting backend server on port 3001..."
npm start &
BACKEND_PID=$!

sleep 2

echo "🌐 Starting frontend server on port 3000..."
python3 -m http.server 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ EbexAI is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:3001"
echo "📊 Dashboard: http://localhost:3000/dashboard.html"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all servers..."
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

wait
