# Database Setup Guide

Complete guide for setting up PostgreSQL and MongoDB on a new computer.

## Overview

This project uses **two databases**:
- **PostgreSQL** (Required) - Main database for users, bets, transactions, etc. (managed by Prisma)
- **MongoDB** (Optional) - Used for market data caching (can run without it, but slower)

---

## PostgreSQL Setup

### Option 1: Install PostgreSQL Locally

#### Windows
1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer (PostgreSQL 15+ recommended)

2. **Install:**
   - Run the installer
   - Remember the password you set for the `postgres` user
   - Default port: `5432`
   - Default installation location: `C:\Program Files\PostgreSQL\15`

3. **Verify Installation:**
   ```powershell
   # Check if PostgreSQL service is running
   Get-Service postgresql*
   
   # Or test connection
   psql -U postgres -h localhost
   ```

#### macOS
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Verify
psql -U postgres -h localhost
```

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo -u postgres psql
```

### Option 2: Use Docker (Recommended for Development)

#### Windows/macOS/Linux
```bash
# Run PostgreSQL in Docker
docker run --name thisthat-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=thisthat_db \
  -p 5432:5432 \
  -d postgres:15

# Verify
docker ps | Select-String "postgres"
```

### Create Database

Once PostgreSQL is running, create the database:

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database
CREATE DATABASE thisthat_db;

# Exit
\q
```

Or using Docker:
```bash
docker exec -it thisthat-postgres psql -U postgres -c "CREATE DATABASE thisthat_db;"
```

### Configure Connection String

Update `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/thisthat_db?schema=public
```

**Format:** `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public`

---

## MongoDB Setup

### Option 1: Install MongoDB Locally

#### Windows
1. **Download MongoDB:**
   - Visit: https://www.mongodb.com/try/download/community
   - Download Windows installer

2. **Install:**
   - Run installer
   - Choose "Complete" installation
   - Install as Windows Service (recommended)

3. **Verify:**
   ```powershell
   # Check service
   Get-Service MongoDB
   
   # Test connection
   mongosh
   ```

#### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify
mongosh
```

#### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh
```

### Option 2: Use Docker (Recommended for Development)

```bash
# Run MongoDB in Docker
docker run --name thisthat-mongodb \
  -p 27017:27017 \
  -d mongo:7

# Verify
docker ps | Select-String "mongo"
```

### Create Database (Optional)

MongoDB creates databases automatically on first use. No manual creation needed.

### Configure Connection String

Update `backend/.env`:
```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test
```

---

## Complete Setup Steps

### 1. Install Databases

Choose one method for each:
- **PostgreSQL:** Local install OR Docker
- **MongoDB:** Local install OR Docker (optional but recommended)

### 2. Create `.env` File

Copy `backend/env.template` to `backend/.env`:

```bash
cd backend
cp env.template .env
```

### 3. Update `.env` with Database URLs

Edit `backend/.env`:

```env
# PostgreSQL (REQUIRED)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/thisthat_db?schema=public

# MongoDB (OPTIONAL - for market caching)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test

# Redis (OPTIONAL - for caching)
REDIS_URL=redis://localhost:6379
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Run Prisma Migrations

This creates all PostgreSQL tables:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates database schema)
npx prisma migrate dev --name init

# (Optional) View database in Prisma Studio
npx prisma studio
```

**Expected Output:**
```
✅ Prisma Client generated
✅ Migration applied
```

### 6. Test Database Connections

#### Test PostgreSQL:
```bash
# Using Prisma
npx prisma db pull

# Or using psql
psql -U postgres -h localhost -d thisthat_db -c "SELECT 1;"
```

#### Test MongoDB:
```bash
# Using mongosh
mongosh --eval "db.version()"

# Or using Node.js test script
node backend/scripts/test-mongodb-connection.js
```

### 7. Start the Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Connected to PostgreSQL
✅ Connected to MongoDB: thisthat_test
🚀 Server listening on http://0.0.0.0:3001
```

---

## Troubleshooting

### PostgreSQL Connection Failed

**Error:** `Can't reach database server`

**Solutions:**
1. Check if PostgreSQL is running:
   ```powershell
   # Windows
   Get-Service postgresql*
   
   # macOS/Linux
   sudo systemctl status postgresql
   ```

2. Verify connection string in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_db?schema=public
   ```

3. Test connection manually:
   ```bash
   psql -U postgres -h localhost -d thisthat_db
   ```

4. Check firewall/port 5432 is open

### MongoDB Connection Failed

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solutions:**
1. Check if MongoDB is running:
   ```powershell
   # Windows
   Get-Service MongoDB
   
   # macOS/Linux
   sudo systemctl status mongod
   ```

2. Test connection:
   ```bash
   mongosh
   ```

3. If using Docker, check container:
   ```bash
   docker ps | Select-String "mongo"
   docker start thisthat-mongodb
   ```

### Prisma Migration Errors

**Error:** `Migration failed`

**Solutions:**
1. Ensure database exists:
   ```sql
   CREATE DATABASE thisthat_db;
   ```

2. Check database permissions:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE thisthat_db TO postgres;
   ```

3. Reset migrations (⚠️ **WARNING:** Deletes all data):
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev --name init
   ```

### Port Already in Use

**Error:** `Port 5432 is already in use`

**Solutions:**
1. Find what's using the port:
   ```powershell
   # Windows
   netstat -ano | findstr :5432
   
   # macOS/Linux
   lsof -i :5432
   ```

2. Stop the conflicting service or use a different port

---

## Production Setup

For production, use managed database services:

### PostgreSQL Options:
- **AWS RDS**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **Supabase** (PostgreSQL with extras)
- **Railway** (PostgreSQL hosting)

### MongoDB Options:
- **MongoDB Atlas** (Free tier available)
- **AWS DocumentDB**
- **Azure Cosmos DB**

Update `.env` with production connection strings:
```env
DATABASE_URL=postgresql://user:password@prod-host:5432/thisthat_db?schema=public&sslmode=require
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/
```

---

## Quick Reference

### Start Services (Docker)
```bash
# PostgreSQL
docker start thisthat-postgres

# MongoDB
docker start thisthat-mongodb
```

### Stop Services (Docker)
```bash
docker stop thisthat-postgres thisthat-mongodb
```

### View Database (Prisma Studio)
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### View MongoDB Data
```bash
mongosh
use thisthat_test
db.markets.find().limit(5)
```

---

## Next Steps

After databases are set up:
1. ✅ Run Prisma migrations
2. ✅ Test server startup
3. ✅ Configure X OAuth (see `docs/X_OAUTH_SETUP.md`)
4. ✅ Start development!







