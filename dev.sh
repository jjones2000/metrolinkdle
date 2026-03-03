#!/bin/bash

# --- 1. SETUP COLORS AND CLEANUP ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to kill both processes on exit
cleanup() {
    echo -e "\n${BLUE}🛑 Stopping Metrolinkdle...${NC}"
    kill $BACKEND_PID $FRONTEND_PID
    exit
}
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}🐝 Starting Metrolinkdle Local Development Environment${NC}"

# --- 2. BACKEND SETUP ---
echo -e "${BLUE}🐍 Setting up Backend (FastAPI)...${NC}"
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || echo "DATABASE_URL=sqlite:///./stats.db" > .env
fi

# Start Backend in background
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# --- 3. FRONTEND SETUP ---
echo -e "${BLUE}⚛️ Setting up Frontend (Vite + React)...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start Frontend in background
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✅ Both servers are starting up!${NC}"
echo -e "   - Backend: http://localhost:8000/docs"
echo -e "   - Frontend: http://localhost:5173"
echo -e "${BLUE}Press Ctrl+C to stop both servers.${NC}"

# Wait for background processes
wait
