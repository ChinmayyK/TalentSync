#!/bin/bash

# TalentSync Development Start Script
# Starts infrastructure (PostgreSQL, Redis, MinIO) and both frontend/backend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 Starting TalentSync Development Environment${NC}"
echo ""

# Setup environment files if they don't exist
if [ ! -f talentsync-backend/.env ] && [ -f talentsync-backend/.env.example ]; then
    echo -e "${YELLOW}📝 Creating backend .env from .env.example...${NC}"
    cp talentsync-backend/.env.example talentsync-backend/.env
fi

if [ ! -f talentsync-frontend/.env.local ] && [ -f talentsync-frontend/.env.example ]; then
    echo -e "${YELLOW}📝 Creating frontend .env.local from .env.example...${NC}"
    cp talentsync-frontend/.env.example talentsync-frontend/.env.local
fi

# Kill any existing processes on the ports we need
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}⚠️  Killing existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

echo -e "${YELLOW}🧹 Cleaning up any existing processes...${NC}"
kill_port 3000  # Frontend
kill_port 3001  # Backend API
kill_port 4000  # Backend (alternate port)
echo ""

# Start Docker infrastructure (optional)
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 Starting infrastructure (PostgreSQL, Redis, MinIO)...${NC}"
    cd talentsync-backend
    docker-compose up -d
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}✅ Infrastructure started${NC}"
    echo ""
    
    # Wait for services to be ready
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 3
    DOCKER_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Docker not found - skipping infrastructure startup${NC}"
    echo -e "${YELLOW}   Make sure PostgreSQL and Redis are running externally${NC}"
    echo ""
    DOCKER_RUNNING=false
fi

# Start backend in background
echo -e "${YELLOW}🚀 Starting backend (NestJS)...${NC}"
cd talentsync-backend
npm run start:dev &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Start frontend in background
echo -e "${YELLOW}🚀 Starting frontend (Next.js)...${NC}"
cd talentsync-frontend
PORT=3000 npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TalentSync is starting up!${NC}"
echo ""
echo -e "   ${BLUE}Frontend${NC}:     http://localhost:3000"
echo -e "   ${BLUE}Backend${NC}:      http://localhost:3001"
echo -e "   ${BLUE}API Docs${NC}:     http://localhost:3001/api/docs"
echo -e "   ${BLUE}MinIO Console${NC}: http://localhost:9001  (minioadmin/minioadmin)"
echo ""

# Get local IP for mobile access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
if [ -n "$LOCAL_IP" ]; then
    echo -e "${YELLOW}📱 Mobile Access (same WiFi): ${BLUE}http://${LOCAL_IP}:3000${NC}"
    echo ""
fi

echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
# Small pause so user can see the URLs
sleep 2

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    if [ "$DOCKER_RUNNING" = true ]; then
        cd "$SCRIPT_DIR/talentsync-backend"
        docker-compose down
    fi
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
