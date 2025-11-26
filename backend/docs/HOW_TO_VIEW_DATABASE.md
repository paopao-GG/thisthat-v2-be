# How to View the Database

You have **4 ways** to view your MongoDB database:

---

## Option 1: MongoDB Compass (GUI - Recommended) 🎯

**Best for:** Visual browsing, filtering, and exploring data

### Setup Steps:

1. **Download MongoDB Compass**
   - Visit: https://www.mongodb.com/products/tools/compass
   - Download and install the free version

2. **Connect to Your Database**
   - Open MongoDB Compass
   - Connection String: `mongodb://localhost:27017`
   - Click **Connect**

3. **Select Your Database**
   - Look for database: **`thisthat_test`**
   - Click on it to view collections

4. **View Collections**
   - **`markets`** - All Polymarket markets
   - **`events`** - All Polymarket events

### Features:
- ✅ Visual document browser
- ✅ Filter and search documents
- ✅ Edit documents directly
- ✅ View indexes and statistics
- ✅ Export data to JSON/CSV

---

## Option 2: PowerShell Script (Via API) 🚀

**Best for:** Quick stats and sample data viewing

### Usage:

```powershell
cd "C:\Users\satui\OneDrive\Desktop\05 GROWGAMI\01 WIP\thisthat\thisthat-v2\backend"
.\scripts\view-database.ps1
```

### What It Shows:
- Market statistics (total, active, closed, archived, featured)
- Event statistics
- Sample markets with THIS/THAT odds
- Category breakdowns

**Note:** Requires the backend server to be running (`npm run dev`)

---

## Option 3: API Endpoints (Direct HTTP) 🌐

**Best for:** Programmatic access or testing

### Market Endpoints:

```powershell
# Get market statistics
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/stats" -Method GET

# Get markets (with pagination)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=0" -Method GET

# Get filtered markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=active&limit=5" -Method GET
```

### Event Endpoints:

```powershell
# Get event statistics
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/stats" -Method GET

# Get events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?limit=10" -Method GET
```

### View Full JSON Response:

```powershell
# Markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=5" | ConvertTo-Json -Depth 10

# Events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?limit=5" | ConvertTo-Json -Depth 10
```

**Note:** Requires the backend server to be running (`npm run dev`)

---

## Option 4: MongoDB Shell (mongosh) 💻

**Best for:** Command-line queries and advanced operations

### Setup:

1. **Install MongoDB Shell** (if not already installed)
   - Usually comes with MongoDB installation
   - Or download: https://www.mongodb.com/try/download/shell

2. **Connect to Database**

```powershell
mongosh mongodb://localhost:27017
```

### Common Commands:

```javascript
// Switch to your database
use thisthat_test

// View all collections
show collections

// Count documents
db.markets.countDocuments()
db.events.countDocuments()

// View sample documents
db.markets.find().limit(5).pretty()
db.events.find().limit(5).pretty()

// Find specific market
db.markets.findOne({ question: /bitcoin/i })

// Find active markets
db.markets.find({ status: "active" }).limit(10).pretty()

// Count by status
db.markets.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Find events by category
db.events.find({ category: "politics" }).limit(5).pretty()
```

### Exit:
```javascript
exit
```

---

## Quick Reference

### Database Connection Info:

```
MongoDB URL: mongodb://localhost:27017
Database Name: thisthat_test
Collections:
  - markets (Polymarket market data)
  - events (Polymarket event data)
```

### Server Requirements:

- **MongoDB must be running** (via Docker or local installation)
- **Backend server must be running** (for API access - Options 2 & 3)

### Check if MongoDB is Running:

```powershell
# Check Docker container
docker ps | Select-String "mongo"

# Or test connection
mongosh mongodb://localhost:27017 --eval "db.adminCommand('ping')"
```

---

## Recommended Workflow

1. **Quick Stats:** Use `scripts/view-database.ps1` script
2. **Visual Browsing:** Use MongoDB Compass
3. **API Testing:** Use PowerShell `Invoke-RestMethod`
4. **Advanced Queries:** Use mongosh

---

## Troubleshooting

### "Cannot connect to MongoDB"

**Check:**
1. Is MongoDB running?
   ```powershell
   docker ps
   ```
2. Is it on port 27017?
   ```powershell
   netstat -an | Select-String "27017"
   ```

### "Database not found"

**Check:**
- Database name is `thisthat_test` (not `thisthat`)
- Have you fetched data yet?
  ```powershell
  # Fetch markets
  Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=10" -Method GET
  
  # Fetch events
  Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=10" -Method GET
  ```

### "404 Not Found" (API endpoints)

**Check:**
- Is backend server running?
  ```powershell
  cd "C:\Users\satui\OneDrive\Desktop\05 GROWGAMI\01 WIP\thisthat\thisthat-v2\backend"
  npm run dev
  ```
- Is it on port 3001?
- Check server logs for errors

---

## Next Steps

1. **Start MongoDB** (if not running):
   ```powershell
   docker-compose up -d
   # or
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Start Backend Server**:
   ```powershell
   cd "C:\Users\satui\OneDrive\Desktop\05 GROWGAMI\01 WIP\thisthat\thisthat-v2\backend"
   npm run dev
   ```

3. **Fetch Data** (if empty):
   ```powershell
   # Fetch markets
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100" -Method GET
   
   # Fetch events
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=100" -Method GET
   ```

4. **View Database**:
   - Use MongoDB Compass: `mongodb://localhost:27017` → `thisthat_test`
   - Or run: `.\scripts\view-database.ps1`

---

**Happy Exploring! 🎉**

