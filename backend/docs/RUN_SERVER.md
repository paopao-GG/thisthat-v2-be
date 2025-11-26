# How to Run the THISTHAT Backend Server

## ✅ Quick Start

### Step 1: Open Terminal

Open PowerShell or Command Prompt and navigate to the backend directory:

```powershell
cd "C:\Users\satui\OneDrive\Desktop\05 GROWGAMI\01 WIP\thisthat\thisthat-v2\backend"
```

### Step 2: Start the Server

```bash
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB: thisthat_test
🚀 Server listening on http://0.0.0.0:3001
```

The server will automatically reload when you make code changes (hot reload enabled).

---

## 🧪 Testing the Server

### Option 1: Use the Test Script (Recommended)

In a **new terminal window**, run:

```powershell
cd "C:\Users\satui\OneDrive\Desktop\05 GROWGAMI\01 WIP\thisthat\thisthat-v2\backend"
.\scripts\test-api.ps1
```

This will run 6 comprehensive tests automatically.

### Option 2: Manual Testing

**Health Check:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

**Fetch Markets:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=10" -Method POST
```

**Get Statistics:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/stats"
```

**Get Markets:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=5"
```

---

## 🔍 Troubleshooting

### Server Won't Start

**1. Check MongoDB is Running:**
```powershell
docker ps | Select-String "mongo"
```

If not running:
```powershell
docker start mongodb
```

**2. Check Port 3001 is Available:**
```powershell
netstat -ano | findstr :3001
```

If port is in use, change `PORT` in `.env` file.

**3. Check Dependencies:**
```bash
npm install
```

**4. Check .env File:**
```powershell
Test-Path .env
Get-Content .env | Select-String "MONGODB"
```

### Server Starts But API Returns Errors

**1. Check Server Logs**
Look at the terminal where `npm run dev` is running for error messages.

**2. Verify MongoDB Connection:**
```powershell
docker exec mongodb mongosh thisthat_test --eval "db.markets.countDocuments()"
```

**3. Check Environment Variables:**
```powershell
Get-Content .env | Select-String "POLYMARKET"
```

---

## 📋 Server Information

- **URL:** http://localhost:3001
- **Health Endpoint:** http://localhost:3001/health
- **API Base:** http://localhost:3001/api/v1
- **MongoDB:** mongodb://localhost:27017
- **Database:** thisthat_test

---

## 🎯 What's Running

When the server starts, it will:

1. ✅ Load environment variables from `.env`
2. ✅ Connect to MongoDB (thisthat_test database)
3. ✅ Register API routes:
   - `/health` - Health check
   - `/api/v1/markets/*` - Market endpoints
   - `/api/v1/events/*` - Event endpoints (structure only)
4. ✅ Enable CORS for frontend (localhost:5173, localhost:3000)
5. ✅ Start listening on port 3001

---

## 🛑 Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

---

## 📚 Next Steps

Once the server is running:

1. ✅ Test the API endpoints
2. ✅ View markets in MongoDB Compass
3. ✅ Proceed to Phase 2 development

---

**Need Help?** Check the logs in the terminal where `npm run dev` is running for detailed error messages.

