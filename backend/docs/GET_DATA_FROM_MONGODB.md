# How to Get Markets and Events from MongoDB

These endpoints retrieve data **from your MongoDB database** (not from Polymarket API).

---

## 🎯 Main Endpoints

### Get Markets from MongoDB
```
GET /api/v1/markets
```

### Get Events from MongoDB
```
GET /api/v1/events
```

---

## 📋 Commands

### Basic Commands

#### Get Markets (Default: 100 markets)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets" -Method GET
```

#### Get Events (Default: 100 events)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events" -Method GET
```

---

### Filtered Commands

#### Get Active Markets Only
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=active&limit=20" -Method GET
```

#### Get Active Events Only
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?status=active&limit=20" -Method GET
```

#### Get Closed Markets
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=closed&limit=10" -Method GET
```

#### Get Closed Events
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?status=closed&limit=10" -Method GET
```

#### Get Featured Markets
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?featured=true&limit=10" -Method GET
```

#### Get Featured Events
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?featured=true&limit=10" -Method GET
```

#### Get Markets by Category
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?category=politics&limit=10" -Method GET
```

#### Get Events by Category
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?category=politics&limit=10" -Method GET
```

---

### Pagination

#### Page 1 (First 10 markets)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=0" -Method GET
```

#### Page 2 (Next 10 markets)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=10" -Method GET
```

#### Page 3 (Next 10 markets)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=20" -Method GET
```

Same for events:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?limit=10&skip=0" -Method GET
```

---

### View Full JSON Response

#### Markets (Pretty JSON)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=5" | ConvertTo-Json -Depth 10
```

#### Events (Pretty JSON)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?limit=5" | ConvertTo-Json -Depth 10
```

---

## 📝 Query Parameters

### Markets Endpoint (`/api/v1/markets`)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status: `active`, `closed`, `archived` | `?status=active` |
| `category` | string | Filter by category name | `?category=politics` |
| `featured` | boolean | Filter featured items | `?featured=true` |
| `limit` | number | Number of results (default: 100) | `?limit=20` |
| `skip` | number | Pagination offset (default: 0) | `?skip=10` |

### Events Endpoint (`/api/v1/events`)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status: `active`, `closed`, `archived` | `?status=active` |
| `category` | string | Filter by category name | `?category=sports` |
| `featured` | boolean | Filter featured items | `?featured=true` |
| `limit` | number | Number of results (default: 100) | `?limit=20` |
| `skip` | number | Pagination offset (default: 0) | `?skip=10` |

---

## 📊 Response Format

### Markets Response
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "conditionId": "0x...",
      "question": "Will Bitcoin reach $100k by 2025?",
      "thisOption": "Yes",
      "thatOption": "No",
      "thisOdds": 0.65,
      "thatOdds": 0.35,
      "status": "active",
      "category": "crypto",
      "volume": 125000,
      "endDate": "2025-12-31T23:59:59Z",
      "featured": false
    }
  ]
}
```

### Events Response
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
      "volume": 5000000
    }
  ]
}
```

---

## 🔍 Common Use Cases

### Use Case 1: Get All Active Markets for Display
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?status=active&limit=50" -Method GET
```

### Use Case 2: Get Featured Events
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?featured=true&limit=10" -Method GET
```

### Use Case 3: Get Markets by Category
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?category=crypto&limit=20" -Method GET
```

### Use Case 4: Paginated Results
```powershell
# Page 1
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=0" -Method GET

# Page 2
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?limit=10&skip=10" -Method GET
```

---

## ⚠️ Important Notes

1. **These endpoints read from MongoDB**, not from Polymarket API
2. **Server must be running** (`npm run dev`)
3. **MongoDB must be running** and contain data
4. If you get empty results, you may need to fetch data first:
   ```powershell
   # Fetch markets from Polymarket first
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100" -Method GET
   
   # Fetch events from Polymarket first
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=100" -Method GET
   ```

---

## 🆚 Difference: Fetch vs Get

| Endpoint | Purpose | Source |
|----------|---------|--------|
| `/api/v1/markets/fetch` | Fetch from Polymarket API | Polymarket API → MongoDB |
| `/api/v1/markets` | Get from MongoDB | MongoDB → Response |
| `/api/v1/events/fetch` | Fetch from Polymarket API | Polymarket API → MongoDB |
| `/api/v1/events` | Get from MongoDB | MongoDB → Response |

**Use `/fetch`** when you want to update your database with new data from Polymarket.  
**Use `/` (list)** when you want to retrieve data that's already in your MongoDB.

---

## 🚀 Quick Reference

```powershell
# Get markets from MongoDB
GET /api/v1/markets

# Get events from MongoDB
GET /api/v1/events

# With filters
GET /api/v1/markets?status=active&limit=20
GET /api/v1/events?status=active&limit=20
```

---

**Last Updated:** 2025-01-XX

