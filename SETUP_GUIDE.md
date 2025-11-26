# THISTHAT V3 - Complete Setup Guide

This guide will walk you through setting up THISTHAT V3 from scratch.

## 📋 Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] PostgreSQL v14+ installed and running
- [ ] MongoDB v6+ installed and running
- [ ] Redis installed (optional but recommended)
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## 🔧 Step-by-Step Setup

### Step 1: Verify Prerequisites

**Check Node.js:**
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v8 or higher
```

**Check PostgreSQL:**
```bash
psql --version  # Should be v14 or higher
```

**Check MongoDB:**
```bash
mongosh --version  # Should be v6 or higher
```

### Step 2: Database Setup

#### PostgreSQL Setup

1. **Start PostgreSQL service:**
   ```bash
   # Windows (if installed as service)
   net start postgresql-x64-14
   
   # Or check if running
   pg_isready
   ```

2. **Create database:**
   ```bash
   psql -U postgres
   ```
   Then in psql:
   ```sql
   CREATE DATABASE thisthat_db;
   \q
   ```

3. **Verify database exists:**
   ```bash
   psql -U postgres -l | grep thisthat_db
   ```

#### MongoDB Setup

1. **Start MongoDB:**
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # Or run directly
   mongod --dbpath "C:\data\db"
   ```

2. **Verify MongoDB is running:**
   ```bash
   mongosh --eval "db.version()"
   ```

#### Redis Setup (Optional)

See `REDIS_SETUP_GUIDE.md` for detailed Redis setup instructions.

**Quick Windows Setup:**
```bash
# Option 1: Use WSL
wsl
sudo apt-get update
sudo apt-get install redis-server
redis-server

# Option 2: Download Windows build
# https://github.com/microsoftarchive/redis/releases
```

### Step 3: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd thisthat-v3/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   # Copy from example if exists, or create new
   # See Environment Variables section below
   ```

4. **Set up environment variables:**
   Create `backend/.env` with:
   ```env
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=development
   
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/thisthat_db?schema=public"
   MONGODB_URL="mongodb://localhost:27017"
   MONGODB_DB_NAME="thisthat_test"
   
   JWT_ACCESS_SECRET="change-this-to-a-random-secret-key-in-production"
   JWT_REFRESH_SECRET="change-this-to-another-random-secret-key-in-production"
   
   REDIS_URL="redis://localhost:6379"
   POLYMARKET_BASE_URL="https://gamma-api.polymarket.com"
   ```

5. **Initialize database:**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   ```

6. **Verify setup:**
   ```bash
   # Test database connection
   npm run test:db  # If test script exists
   
   # Or start server to check
   npm run dev
   ```

### Step 4: Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file (if needed):**
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Verify setup:**
   ```bash
   npm run dev
   ```

### Step 5: Initial Data Setup

1. **Fetch markets from Polymarket:**
   ```bash
   # Start backend server first
   cd backend
   npm run dev
   
   # In another terminal, fetch markets
   curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100"
   
   # Or use PowerShell
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100" -Method POST
   ```

2. **Sync markets to PostgreSQL:**
   ```bash
   curl -X POST "http://localhost:3001/api/v1/sync/markets"
   ```

### Step 6: Verify Installation

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Frontend:**
   - Open http://localhost:5173
   - Should see the THISTHAT homepage

3. **Create Test Account:**
   - Navigate to Signup page
   - Create an account
   - Verify you receive 1000 starting credits

## 🧪 Testing the Setup

### Backend Tests

```bash
cd backend
npm test              # Run all tests
npm run test:coverage # Run with coverage
```

### Manual API Testing

Use the provided scripts in `backend/scripts/`:

```bash
# Test API endpoints
.\scripts\test-api.ps1

# View database contents
.\scripts\view-database.ps1
```

## 🐛 Troubleshooting

### Database Connection Issues

**PostgreSQL:**
```bash
# Check if PostgreSQL is running
pg_isready

# Check connection string format
# Should be: postgresql://user:password@host:port/database?schema=public

# Test connection manually
psql -U postgres -d thisthat_db -c "SELECT 1;"
```

**MongoDB:**
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Check connection
mongosh "mongodb://localhost:27017"
```

### Port Conflicts

**Backend (3001):**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Frontend (5173):**
```powershell
# Find process using port 5173
netstat -ano | findstr :5173

# Kill process
taskkill /PID <PID> /F
```

### Prisma Issues

```bash
# Reset Prisma client
npx prisma generate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or just push schema
npx prisma db push
```

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or for Windows PowerShell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

## 📊 Verification Checklist

After setup, verify:

- [ ] Backend server starts without errors
- [ ] Frontend dev server starts without errors
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:3001/health
- [ ] Can create a user account
- [ ] User receives 1000 starting credits
- [ ] Can fetch markets from Polymarket
- [ ] Markets sync to PostgreSQL
- [ ] Can place a bet (if markets are synced)

## 🚀 Next Steps

1. **Read Documentation:**
   - `README.md` - Project overview
   - `backend/docs/QUICK_START.md` - Backend quick start
   - `docs/THISTHAT_PRD.md` - Product requirements

2. **Explore Features:**
   - Sign up and login
   - Place bets on markets
   - Claim daily credits
   - Trade stocks
   - View leaderboards

3. **Development:**
   - Check `backend/memory-bank/PROGRESS_SUMMARY.md` for current status
   - Review `backend/docs/API_ENDPOINTS.md` for API reference
   - See `backend/docs/TESTING_QUICK_START.md` for testing guide

## 📞 Getting Help

- Check `backend/docs/` for backend-specific documentation
- Check `docs/` for project-wide documentation
- Review error messages in console/logs
- Check `backend/memory-bank/` for project context

---

**Setup Complete!** 🎉

You should now have a fully functional THISTHAT V3 installation.

