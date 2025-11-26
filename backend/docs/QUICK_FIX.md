# Quick Fix Guide

## Problem: Database Authentication Failed + Prisma Permission Error

### Solution 1: Create .env File (Easiest)

Run the setup script:

```powershell
cd backend
.\setup-env.ps1
```

This will prompt you for your PostgreSQL credentials and create the `.env` file.

### Solution 2: Manual .env Creation

1. Create a file named `.env` in the `backend` folder

2. Add this content (replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your actual PostgreSQL credentials):

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database (PostgreSQL) - REPLACE WITH YOUR CREDENTIALS!
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/thisthat_v1

# MongoDB (for testing Phase 1)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-token-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Polymarket API Configuration
POLYMARKET_API_KEY=019a791b-28ea-7268-ac34-5be03e2b746a
POLYMARKET_API_SECRET=fwtVZyPRX9GwpCPE4BaNmeE4ZWRdcoyGrcCpkrj92Bw=
POLYMARKET_API_PASSPHRASE=a21bef930f312fa00551433f77ff9c3e2cbc5f25a3f3d350e4be7aa5770cd931
POLYMARKET_BASE_URL=https://clob.polymarket.com

# App Configuration
MIN_BET_AMOUNT=10
MAX_BET_AMOUNT=10000
DAILY_REWARD_CREDITS=100
STARTING_CREDITS=1000
```

### Solution 3: Find Your PostgreSQL Credentials

**If you installed PostgreSQL yourself:**
- Username is usually `postgres`
- Password is what you set during installation
- Port is usually `5432`

**If you're not sure:**
1. Open **pgAdmin** (PostgreSQL GUI tool)
2. Look at the server connection settings
3. Or check Windows Services for PostgreSQL service name

**Test your credentials:**
```powershell
# Try connecting (replace with your username)
psql -U postgres -h localhost
# Enter your password when prompted
```

### Fix Prisma Permission Error

After creating `.env`, fix the Prisma client generation:

```powershell
cd backend

# 1. Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Delete old Prisma client
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# 3. Generate Prisma client
npx prisma generate

# 4. Create database if it doesn't exist
# (Replace postgres with your username)
psql -U postgres -h localhost -c "CREATE DATABASE thisthat_v1;"

# 5. Push schema to database
npx prisma db push
```

### Create Database (if it doesn't exist)

```powershell
# Connect to PostgreSQL (replace postgres with your username)
psql -U postgres -h localhost

# In psql prompt, run:
CREATE DATABASE thisthat_v1;
\q
```

### Complete Setup Commands

```powershell
cd backend

# 1. Create .env (use setup script or manual)
.\setup-env.ps1

# 2. Stop Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Clean Prisma client
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# 4. Generate Prisma client
npx prisma generate

# 5. Create database (if needed)
# psql -U YOUR_USERNAME -h localhost -c "CREATE DATABASE thisthat_v1;"

# 6. Push schema
npx prisma db push

# 7. Test it works
npx prisma studio
# This should open a browser window showing your database
```

### Still Having Issues?

1. **PostgreSQL not running?**
   ```powershell
   # Check if PostgreSQL service is running
   Get-Service -Name postgresql*
   
   # Start it if needed (replace with your service name)
   Start-Service postgresql-x64-15
   ```

2. **Don't remember PostgreSQL password?**
   - Use pgAdmin to reset it
   - Or reinstall PostgreSQL (last resort)

3. **Want easier setup?** Use SQLite instead (see FIX_DATABASE_SETUP.md)

