# THISTHAT Backend API Endpoints

**Base URL:** `http://localhost:3001`

---

## 🎯 Most Important Endpoints

### 1. **Fetch Events from Polymarket** ⭐
```
GET /api/v1/events/fetch
POST /api/v1/events/fetch
```
**Description:** Fetches events from Polymarket API and saves them to MongoDB.

**Query Parameters:**
- `active` (optional): `true` or `false` - Filter active events (default: `true`)
- `limit` (optional): Number of events to fetch (default: `100`)

**Example:**
```powershell
# Fetch active events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=50" -Method GET

# Fetch all events (including closed)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=false&limit=100" -Method GET
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched and saved 50 events",
  "data": {
    "saved": 50,
    "errors": 0
  }
}
```

---

### 2. **List Markets** ⭐
```
GET /api/v1/markets
```
**Description:** Retrieves markets from MongoDB database.

**Query Parameters:**
- `status` (optional): `active` | `closed` | `archived` - Filter by status
- `category` (optional): Category name (e.g., `politics`, `sports`)
- `featured` (optional): `true` or `false` - Filter featured markets
- `limit` (optional): Number of markets to return (default: `100`)
- `skip` (optional): Number of markets to skip for pagination (default: `0`)

**Example:**
```powershell
# Get all markets (default: 100)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets" -Method GET

# Get active markets only
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=active&limit=20" -Method GET

# Get featured markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?featured=true&limit=10" -Method GET

# Get markets by category
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?category=politics&limit=10" -Method GET

# Pagination (page 2, 10 per page)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=10" -Method GET
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "conditionId": "...",
      "question": "Will Bitcoin reach $100k by 2025?",
      "thisOption": "Yes",
      "thatOption": "No",
      "thisOdds": 0.65,
      "thatOdds": 0.35,
      "status": "active",
      "category": "crypto",
      "volume": 125000,
      "endDate": "2025-12-31T23:59:59Z",
      ...
    }
  ]
}
```

---

## 📋 All API Endpoints

### Health & System

#### Health Check
```
GET /health
```
**Description:** Check if server is running.

**Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XXT12:00:00.000Z"
}
```

---

#### Hello Endpoint
```
GET /api/hello
```
**Description:** Test endpoint.

**Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/hello" -Method GET
```

**Response:**
```json
{
  "message": "Hello from TypeScript Fastify!"
}
```

---

### Markets Endpoints

#### 1. Fetch Markets from Polymarket
```
GET /api/v1/markets/fetch
POST /api/v1/markets/fetch
```
**Description:** Fetches markets from Polymarket API and saves them to MongoDB.

**Query Parameters:**
- `active` (optional): `true` or `false` - Filter active markets (default: `true`)
- `limit` (optional): Number of markets to fetch (default: `100`)

**Example:**
```powershell
# Fetch active markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100" -Method GET

# Fetch all markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=false&limit=500" -Method GET
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched and saved 100 markets",
  "data": {
    "saved": 100,
    "errors": 0
  }
}
```

---

#### 2. List Markets (from Database)
```
GET /api/v1/markets
```
**Description:** Retrieves markets from MongoDB database.

**Query Parameters:**
- `status` (optional): `active` | `closed` | `archived`
- `category` (optional): Category name
- `featured` (optional): `true` | `false`
- `limit` (optional): Number of results (default: `100`)
- `skip` (optional): Pagination offset (default: `0`)

**Example:**
```powershell
# Get all markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets" -Method GET

# Get active markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=active&limit=20" -Method GET

# Get featured markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?featured=true" -Method GET

# Get markets by category
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?category=sports" -Method GET

# Pagination
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=0" -Method GET
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "conditionId": "0x...",
      "question": "Will X happen?",
      "thisOption": "Yes",
      "thatOption": "No",
      "thisOdds": 0.65,
      "thatOdds": 0.35,
      "status": "active",
      "category": "politics",
      "volume": 50000,
      "endDate": "2025-12-31T23:59:59Z",
      "featured": false,
      ...
    }
  ]
}
```

---

#### 3. Get Market Statistics
```
GET /api/v1/markets/stats
```
**Description:** Returns statistics about markets in the database.

**Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/stats" -Method GET
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMarkets": 947,
    "activeMarkets": 823,
    "closedMarkets": 98,
    "archivedMarkets": 26,
    "featuredMarkets": 45,
    "categoryCounts": {
      "politics": 234,
      "sports": 189,
      "crypto": 156,
      ...
    }
  }
}
```

---

### Events Endpoints

#### 1. Fetch Events from Polymarket ⭐
```
GET /api/v1/events/fetch
POST /api/v1/events/fetch
```
**Description:** Fetches events from Polymarket API and saves them to MongoDB.

**Query Parameters:**
- `active` (optional): `true` or `false` - Filter active events (default: `true`)
- `limit` (optional): Number of events to fetch (default: `100`)

**Example:**
```powershell
# Fetch active events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=50" -Method GET

# Fetch all events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=false&limit=100" -Method GET
```

**Response:**
```json
{
  "success": true,
  "message": "Fetched and saved 50 events",
  "data": {
    "saved": 50,
    "errors": 0
  }
}
```

---

#### 2. List Events (from Database)
```
GET /api/v1/events
```
**Description:** Retrieves events from MongoDB database.

**Query Parameters:**
- `status` (optional): `active` | `closed` | `archived`
- `category` (optional): Category name
- `featured` (optional): `true` | `false`
- `limit` (optional): Number of results (default: `100`)
- `skip` (optional): Pagination offset (default: `0`)

**Example:**
```powershell
# Get all events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events" -Method GET

# Get active events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?status=active&limit=20" -Method GET

# Get featured events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?featured=true" -Method GET

# Get events by category
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?category=politics" -Method GET

# Pagination
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?limit=10&skip=0" -Method GET
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "eventId": "...",
      "title": "2024 US Presidential Election",
      "subtitle": "Who will win?",
      "status": "active",
      "category": "politics",
      "featured": true,
      "startDate": "2024-11-05T00:00:00Z",
      "endDate": "2024-11-06T00:00:00Z",
      "volume": 5000000,
      ...
    }
  ]
}
```

---

#### 3. Get Event Statistics
```
GET /api/v1/events/stats
```
**Description:** Returns statistics about events in the database.

**Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/stats" -Method GET
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 150,
    "activeEvents": 120,
    "closedEvents": 25,
    "archivedEvents": 5,
    "featuredEvents": 30,
    "categoryCounts": {
      "politics": 45,
      "sports": 35,
      "crypto": 28,
      ...
    }
  }
}
```

---

## 🔧 Common Use Cases

### Use Case 1: Initial Data Fetch
```powershell
# 1. Fetch events from Polymarket
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=100" -Method GET

# 2. Fetch markets from Polymarket
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100" -Method GET

# 3. Verify data was saved
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/stats" -Method GET
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/stats" -Method GET
```

### Use Case 2: Display Active Markets
```powershell
# Get active markets for display
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=active&limit=20" -Method GET
```

### Use Case 3: Display Featured Events
```powershell
# Get featured events
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?featured=true&limit=10" -Method GET
```

### Use Case 4: Pagination
```powershell
# Page 1 (first 10)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=0" -Method GET

# Page 2 (next 10)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=10" -Method GET

# Page 3 (next 10)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=20" -Method GET
```

---

## 📝 Response Format

All endpoints return JSON with the following structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "count": 10,  // For list endpoints
  "message": "..."  // For action endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## ⚠️ Important Notes

1. **Server Must Be Running:** All endpoints require the backend server to be running (`npm run dev`)

2. **MongoDB Must Be Running:** Fetch and list endpoints require MongoDB to be running

3. **Fetch vs List:**
   - **Fetch endpoints** (`/fetch`): Get data from Polymarket API and save to database
   - **List endpoints** (`/`): Get data from your MongoDB database

4. **Rate Limiting:** Currently no rate limiting, but be mindful when fetching large amounts of data

5. **Pagination:** Use `limit` and `skip` for pagination:
   - `limit`: Number of results per page
   - `skip`: Number of results to skip (for page 2, skip = limit)

---

## 🚀 Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/v1/markets/fetch` | GET/POST | Fetch markets from Polymarket |
| `/api/v1/markets` | GET | List markets from database |
| `/api/v1/markets/stats` | GET | Get market statistics |
| `/api/v1/events/fetch` | GET/POST | Fetch events from Polymarket |
| `/api/v1/events` | GET | List events from database |
| `/api/v1/events/stats` | GET | Get event statistics |

---

**Last Updated:** 2025-01-XX

