# 🚀 TalentSync - Windows Setup Guide

Complete step-by-step guide to run TalentSync on Windows from scratch.

---

## 📋 Prerequisites

### 1. Install Node.js (v18-20)

Download and install from [nodejs.org](https://nodejs.org/)

```powershell
# Verify installation
node --version   # Should show v18.x.x or v20.x.x
npm --version
```

> [!IMPORTANT]
> Node.js version must be **18.x or 20.x** (not 21+). The project requires `"node": ">=18.0.0 <21.0.0"`.

### 2. Install Docker Desktop

Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

- Enable **WSL 2 backend** during installation (recommended)
- Start Docker Desktop after installation
- Wait for Docker to fully start (system tray icon will be green)

```powershell
# Verify installation
docker --version
docker compose version
```

### 3. Install Git (if not already)

Download from [git-scm.com](https://git-scm.com/download/win)

---

## 📥 Step 1: Clone the Repository

```powershell
git clone <repository-url> talentsync
cd talentsync
```

---

## 📦 Step 2: Install Dependencies

Open PowerShell or Command Prompt:

```powershell
# Install backend dependencies
cd talentsync-backend
npm install

# Install frontend dependencies
cd ../talentsync-frontend
npm install

# Return to root
cd ..
```

---

## ⚙️ Step 3: Configure Environment Variables

### Backend Environment

```powershell
# Copy the example env file
copy talentsync-backend\.env.example talentsync-backend\.env
```

Edit `talentsync-backend\.env` if needed (default values work for local development):

```env
DATABASE_URL=postgresql://root:root@localhost:5432/talentsync
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
FRONTEND_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3001
```

### Frontend Environment

```powershell
# Copy the example env file (if exists)
copy talentsync-frontend\.env.example talentsync-frontend\.env.local
```

Or create `talentsync-frontend\.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🐳 Step 4: Start Infrastructure (Docker)

Start PostgreSQL, Redis, and MinIO:

```powershell
cd talentsync-backend
docker compose up -d
```

Verify containers are running:

```powershell
docker ps
```

You should see:
| Container | Port |
|-----------|------|
| `talentsync-postgres` | 5432 |
| `talentsync-redis` | 6379 |
| `talentsync-minio` | 9000, 9001 |

---

## 🗄️ Step 5: Initialize Database

```powershell
cd talentsync-backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed initial data
npx prisma db seed
```

> [!TIP]
> If you encounter migration issues, you can reset the database:
> ```powershell
> npx prisma migrate reset
> ```

---

## 🚀 Step 6: Start the Application

You'll need **two terminal windows**:

### Terminal 1 - Backend (NestJS)

```powershell
cd talentsync-backend
npm run start:dev
```

Wait until you see:
```
[Nest] LOG [NestApplication] Nest application successfully started
```

### Terminal 2 - Frontend (Next.js)

```powershell
cd talentsync-frontend
npm run dev
```

Wait until you see:
```
✓ Ready in X.Xs
```

---

## 🌐 Step 7: Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:3001 |
| **API Documentation** | http://localhost:3001/api/docs |
| **MinIO Console** | http://localhost:9001 |

### MinIO Credentials
- **Username**: `minioadmin`
- **Password**: `minioadmin`

---

## 🔧 Troubleshooting

### Port Already in Use

```powershell
# Find process using port (e.g., 3000)
netstat -ano | findstr :3000

# Kill the process using PID from above
taskkill /PID <PID> /F
```

### Docker Issues

```powershell
# Restart Docker containers
cd talentsync-backend
docker compose down
docker compose up -d

# View container logs
docker logs talentsync-postgres
docker logs talentsync-redis
```

### Database Connection Failed

1. Ensure Docker Desktop is running
2. Check PostgreSQL container is healthy:
   ```powershell
   docker ps
   ```
3. Verify `DATABASE_URL` in `.env` matches docker-compose settings

### Prisma Issues

```powershell
# Regenerate Prisma client
cd talentsync-backend
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Node Version Issues

```powershell
# Check current version
node --version

# If using nvm-windows, switch version
nvm install 20
nvm use 20
```

---

## 🛑 Stopping the Application

### Stop Frontend/Backend
Press `Ctrl+C` in each terminal window

### Stop Docker Infrastructure

```powershell
cd talentsync-backend
docker compose down
```

### Stop and Remove Data (Clean Reset)

```powershell
cd talentsync-backend
docker compose down -v   # -v removes volumes (database data)
```

---

## 📝 Quick Reference Commands

| Action | Command |
|--------|---------|
| Start infrastructure | `docker compose up -d` |
| Stop infrastructure | `docker compose down` |
| Start backend | `npm run start:dev` |
| Start frontend | `npm run dev` |
| Run migrations | `npx prisma migrate dev` |
| Reset database | `npx prisma migrate reset` |
| Open Prisma Studio | `npx prisma studio` |
| View API docs | http://localhost:3001/api/docs |

---

## 🖥️ Windows PowerShell Script (Optional)

Create `start.ps1` in the project root for one-click startup:

```powershell
# TalentSync Windows Start Script
Write-Host "🎯 Starting TalentSync Development Environment" -ForegroundColor Blue

# Start Docker infrastructure
Write-Host "📦 Starting infrastructure..." -ForegroundColor Yellow
Set-Location talentsync-backend
docker compose up -d
Set-Location ..
Start-Sleep -Seconds 3

# Start backend in new window
Write-Host "🚀 Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd talentsync-backend; npm run start:dev"

# Start frontend in new window
Write-Host "🚀 Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd talentsync-frontend; npm run dev"

Write-Host ""
Write-Host "✅ TalentSync is starting!" -ForegroundColor Green
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "   API Docs:  http://localhost:3001/api/docs" -ForegroundColor Cyan
```

Run with:
```powershell
.\start.ps1
```

> [!NOTE]
> You may need to enable script execution first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
