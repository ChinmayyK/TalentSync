#!/bin/bash

# TalentSync Lightweight Start Script
# Designed to prevent system resource exhaustion

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 Starting TalentSync (Lightweight Mode)${NC}"

# 1. Setup environment files
if [ ! -f talentsync-backend/.env ]; then
    echo -e "${YELLOW}📝 Creating backend .env...${NC}"
    cp talentsync-backend/.env.example talentsync-backend/.env
fi

if [ ! -f talentsync-frontend/.env.local ]; then
    echo -e "${YELLOW}📝 Creating frontend .env.local...${NC}"
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > talentsync-frontend/.env.local
fi

# 2. Cleanup ports
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}⚠️  Killing existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
    fi
}

echo -e "${YELLOW}🧹 Cleaning up ports...${NC}"
kill_port 3000
kill_port 3001
kill_port 5432
kill_port 6379

# 3. Start Infrastructure (Homebrew)
echo -e "${YELLOW}📦 Starting Homebrew infrastructure (PostgreSQL, Redis)...${NC}"
brew services start redis
brew services start postgresql@15

# 4. Wait for Database
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 5

# 5. Prisma Sync
echo -e "${YELLOW}🗄️  Synchronizing database schema...${NC}"
cd talentsync-backend
npx prisma generate
npx prisma migrate dev --name init || echo "Migration already applied or failed, skipping..."
npx prisma db seed || echo "Seeding failed or already seeded, skipping..."
cd "$SCRIPT_DIR"

# 6. Start Backend (in background with small delay)
echo -e "${YELLOW}🚀 Starting Backend...${NC}"
cd talentsync-backend
npm run start:dev > backend.log 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

echo -e "${YELLOW}⏳ Giving backend a moment to initialize...${NC}"
sleep 10

# 7. Start Frontend
echo -e "${YELLOW}🚀 Starting Frontend...${NC}"
cd talentsync-frontend
npm run dev
