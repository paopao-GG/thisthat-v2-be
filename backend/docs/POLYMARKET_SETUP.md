# What's Needed to Fetch Data from Polymarket

## Overview

The Polymarket integration is **already implemented and working**. This document explains what's required and how it works.

---

## ✅ Current Status

**Phase 1 is COMPLETE** - The system has successfully fetched **947 markets** from Polymarket and stored them in MongoDB.

---

## Required Components

### 1. **Dependencies** ✅ Already Installed

All required packages are in `package.json`:

```json
{
  "axios": "^1.13.2",        // HTTP client for API calls
  "mongodb": "^7.0.0",       // Database for storing markets
  "dotenv": "^17.2.3"        // Environment variable management
}
```

**No additional packages needed!**

---

### 2. **Environment Variables** (Optional)

The Polymarket client works **WITHOUT an API key** for public endpoints. However, you can configure:

```env
# Optional: Polymarket API Key (for authenticated endpoints)
POLYMARKET_API_KEY=your_api_key_here

# Optional: Custom base URL (defaults to https://clob.polymarket.com)
POLYMARKET_BASE_URL=https://clob.polymarket.com

# Required: MongoDB connection
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test

# Optional: Server port
PORT=3001
```

**Note:** The Polymarket CLOB API `/markets` endpoint is **public** and doesn't require authentication. The API key is only needed for authenticated endpoints (which aren't used in V1).

---

### 3. **MongoDB Database** ✅ Already Set Up

**Requirements:**
- MongoDB running (Docker container `mongodb` on port 27017)
- Database: `thisthat_test`
- Collection: `markets` (auto-created)

**Current Status:** ✅ 947 markets already stored

---

## How It Works

### Architecture Flow

```
┌─────────────────────┐
│  Polymarket API    │
│  (Public Endpoint) │
│  GET /markets       │
└──────────┬──────────┘
           │ HTTP GET
           ▼
┌─────────────────────┐
│ Polymarket Client   │
│ (polymarket-client) │
│ - Axios HTTP client │
│ - Response unwrap   │
│ - Error handling    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Market Service     │
│ (market-data.svc)   │
│ - Normalize data    │
│ - Extract THIS/THAT │
│ - Calculate odds    │
│ - Determine status  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    MongoDB          │
│  (markets coll.)    │
│  Upsert operation   │
└─────────────────────┘
```

---

## Key Files

### 1. **Polymarket Client** (`src/lib/polymarket-client.ts`)

**Purpose:** HTTP client for Polymarket API

**Key Features:**
- ✅ Public API endpoint (no auth required)
- ✅ Handles response unwrapping (`{data: [...]}`)
- ✅ Error handling and retries
- ✅ TypeScript interfaces

**API Endpoints Used:**
- `GET /markets` - Fetch all markets (public, no auth needed)
- `GET /markets/:id` - Fetch single market (public)

**Code:**
```typescript
const client = getPolymarketClient();
const markets = await client.getMarkets({ limit: 1000 });
```

---

### 2. **Market Service** (`src/features/fetching/market-data/market-data.services.ts`)

**Purpose:** Normalize and save Polymarket data

**Key Functions:**
- `normalizeMarket()` - Converts Polymarket format to flat structure
- `fetchAndSaveMarkets()` - Fetches from API and saves to MongoDB
- `getAllMarkets()` - Retrieves from MongoDB
- `getMarketStats()` - Returns statistics

**Normalization Logic:**
- Extracts THIS/THAT from `outcomes` array
- Calculates odds from `tokens[].price`
- Determines status from `accepting_orders` field
- Flattens nested structure

---

### 3. **API Routes** (`src/features/fetching/market-data/market-data.routes.ts`)

**Endpoints:**
- `POST /api/v1/markets/fetch` - Fetch and save markets
- `GET /api/v1/markets` - Get markets from database
- `GET /api/v1/markets/stats` - Get statistics

---

## How to Fetch Data

### Method 1: Via API Endpoint (Recommended)

**Start the server:**
```bash
cd thisthat-v2/backend
npm run dev
```

**Fetch markets:**
```powershell
# Fetch active markets (default)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100" -Method POST

# Fetch all markets
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=false&limit=1000" -Method POST
```

**Or using curl:**
```bash
curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100"
```

---

### Method 2: Direct Code Usage

```typescript
import { getPolymarketClient } from './lib/polymarket-client.js';
import * as marketService from './features/fetching/market-data/market-data.services.js';

// Fetch and save markets
const result = await marketService.fetchAndSaveMarkets({
  active: true,
  limit: 100
});

console.log(`Saved ${result.saved} markets`);
```

---

## What Data is Fetched

### Polymarket Market Structure

```typescript
{
  condition_id: string;      // Unique market ID
  question: string;           // Market question
  description?: string;       // Market description
  outcomes: string[];         // ["YES", "NO"] or custom options
  tokens: Array<{            // Token prices (odds)
    token_id: string;
    outcome: string;
    price: number;           // 0.0 to 1.0 (odds)
  }>;
  accepting_orders: boolean;  // True = active market
  volume?: number;           // Total volume
  liquidity?: number;        // Market liquidity
  category?: string;         // Market category
  end_date_iso: string;      // Expiry date
  // ... other fields
}
```

### Normalized Structure (Stored in MongoDB)

```typescript
{
  conditionId: string;
  question: string;
  thisOption: string;        // First outcome (e.g., "YES")
  thatOption: string;       // Second outcome (e.g., "NO")
  thisOdds: number;         // 0.0 to 1.0
  thatOdds: number;         // 0.0 to 1.0
  status: 'active' | 'closed' | 'archived';
  volume: number;
  category: string;
  endDate: string;
  source: 'polymarket';
  // ... other fields
}
```

---

## Important Notes

### ✅ What Works

1. **Public API Access** - No API key needed for `/markets` endpoint
2. **Automatic Normalization** - Converts Polymarket format to THIS/THAT structure
3. **Status Detection** - Uses `accepting_orders` field (most reliable)
4. **Upsert Logic** - Updates existing markets, creates new ones
5. **Error Handling** - Graceful failures, continues on errors

### ⚠️ Limitations

1. **Events Endpoint** - `/events` endpoint returns 404 (not available)
2. **API Filters** - Polymarket API filters don't work reliably, filtering done client-side
3. **Rate Limits** - No documented rate limits, but be respectful
4. **Data Freshness** - Markets fetched on-demand, not real-time

### 🔍 Known Issues

1. **Status Field Unreliability** - Polymarket's `active`/`closed` fields are inconsistent
   - **Solution:** Use `accepting_orders === true` as the source of truth
   
2. **Response Wrapping** - API returns `{data: [...]}` instead of direct array
   - **Solution:** Client unwraps automatically

---

## Testing

### Test Script

Run the existing test script:
```powershell
cd thisthat-v2/backend
.\scripts\test-api.ps1
```

This will:
1. Test health check
2. Fetch markets from Polymarket
3. Get market statistics
4. Query markets from database
5. Test filters and pagination

---

## Troubleshooting

### Issue: Can't Connect to Polymarket API

**Check:**
- Internet connection
- Polymarket API status: https://clob.polymarket.com/markets
- Firewall/proxy settings

**Solution:**
```typescript
// Test direct API call
const response = await axios.get('https://clob.polymarket.com/markets');
console.log(response.data);
```

---

### Issue: MongoDB Connection Failed

**Check:**
```bash
# Verify MongoDB is running
docker ps | grep mongo

# Start MongoDB if not running
docker start mongodb

# Test connection
docker exec mongodb mongosh --eval "db.version()"
```

---

### Issue: No Markets Returned

**Possible Causes:**
1. API response format changed
2. Network timeout
3. API endpoint changed

**Debug:**
```typescript
// Add logging in polymarket-client.ts
console.log('API Response:', JSON.stringify(response.data, null, 2));
```

---

## Summary

### ✅ What You Have

- ✅ Polymarket API client (working)
- ✅ Data normalization (working)
- ✅ MongoDB storage (working)
- ✅ API endpoints (working)
- ✅ 947 markets already fetched

### 📋 What You Need

**Minimum Requirements:**
- ✅ MongoDB running (Docker)
- ✅ Node.js dependencies installed
- ✅ Backend server running

**Optional:**
- API key (not needed for public endpoints)
- Custom base URL (defaults work fine)

### 🚀 Ready to Use

The system is **fully functional** and ready to fetch Polymarket data. Just start the server and call the API endpoint!

---

## Next Steps

1. **Start Server:** `npm run dev`
2. **Fetch Markets:** `POST /api/v1/markets/fetch`
3. **View Markets:** `GET /api/v1/markets`
4. **Check Stats:** `GET /api/v1/markets/stats`

**That's it!** The Polymarket integration is complete and working. 🎉

