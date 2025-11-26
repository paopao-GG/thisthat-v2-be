# Quick Start Guide

## 🚀 Running the THISTHAT Backend

### Prerequisites Check

✅ **Dependencies:** Installed (`node_modules` exists)  
✅ **MongoDB:** Running (Docker container `mongodb`)  
✅ **Environment:** `.env` file configured with API credentials

---

## Step 1: Start the Server

```bash
cd thisthat-v2/backend
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB: thisthat_test
🚀 Server listening on http://0.0.0.0:3001
```

---

## Step 2: Test the Server

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX..."
}
```

### Fetch Markets from Polymarket
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=10" -Method POST
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Fetched and saved X markets",
  "data": {
    "saved": 10,
    "errors": 0
  }
}
```

### Get Market Statistics
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/stats" -Method GET
```

### Get Markets List
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=5" -Method GET
```

---

## Step 3: Run Full Test Suite

Use the provided PowerShell test script:

```powershell
cd thisthat-v2/backend
.\scripts\test-api.ps1
```

This will run 6 comprehensive tests:
1. Health check
2. Fetch markets from Polymarket
3. Get market statistics
4. Get markets list
5. Filter closed markets
6. Test pagination

---

## Troubleshooting

### Server Won't Start

**Check MongoDB:**
```powershell
docker ps | Select-String "mongo"
```

**Start MongoDB if not running:**
```powershell
docker start mongodb
```

**Check Port 3001:**
```powershell
netstat -ano | findstr :3001
```

### API Returns Errors

**Check server logs** - Look for error messages in the terminal where `npm run dev` is running.

**Verify .env file:**
```powershell
Get-Content .env | Select-String "POLYMARKET"
```

**Test MongoDB connection:**
```powershell
docker exec mongodb mongosh thisthat_test --eval "db.markets.countDocuments()"
```

---

## Available Endpoints

### Health
- `GET /health` - Server health check

### Markets
- `POST /api/v1/markets/fetch` - Fetch markets from Polymarket
  - Query params: `?active=true&limit=100`
- `GET /api/v1/markets` - Get markets from database
  - Query params: `?status=active&category=sports&limit=100&skip=0`
- `GET /api/v1/markets/stats` - Get market statistics

### Events (Structure only, API not available)
- `POST /api/v1/events/fetch` - Not functional (Polymarket limitation)
- `GET /api/v1/events` - Query events
- `GET /api/v1/events/stats` - Event statistics

---

## Development Commands

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npm run type-check

# Lint code
npm run lint

# Fix linting errors
npm run lint:fix
```

---

## Server Status

Once running, the server will:
- ✅ Connect to MongoDB automatically
- ✅ Load environment variables from `.env`
- ✅ Start on port 3001 (configurable)
- ✅ Enable CORS for frontend (localhost:5173, localhost:3000)
- ✅ Provide structured logging with Pino

---

## Next Steps

1. ✅ **Server Running** - You're here!
2. ⏭️ **Test API Endpoints** - Use test script or manual requests
3. ⏭️ **Phase 2** - Authentication & Credit System

---

**Server URL:** http://localhost:3001  
**Health Check:** http://localhost:3001/health  
**API Base:** http://localhost:3001/api/v1

