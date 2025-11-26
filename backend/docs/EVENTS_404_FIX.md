# Events 404 Error - Explanation & Fix

## Why Events Was Returning 404

### Historical Issue (Before Fix)

The events endpoint was returning **404** because:

1. **Wrong API Base URL**
   - Code was using `https://clob.polymarket.com` (CLOB API)
   - CLOB API does **NOT** have an `/events` endpoint
   - CLOB API is only for trading operations (orders, positions, etc.)

2. **Wrong API Endpoint**
   - CLOB API: `https://clob.polymarket.com/events` → **404 Not Found**
   - Gamma API: `https://gamma-api.polymarket.com/events` → **200 OK**

### Current Status (After Fix) ✅

**All events endpoints are now working!**

---

## What Was Fixed

### 1. ✅ Updated Base URL

**Before:**
```typescript
this.baseUrl = 'https://clob.polymarket.com'; // ❌ No /events endpoint
```

**After:**
```typescript
this.baseUrl = 'https://gamma-api.polymarket.com'; // ✅ Has /events endpoint
```

### 2. ✅ Updated API Endpoints

**CLOB API** (for trading):
- Base: `https://clob.polymarket.com`
- Endpoints: `/orders`, `/positions`, `/fills`, etc.
- **NO** `/events` or `/markets` endpoints
- Requires authentication (signature-based)

**Gamma API** (for data):
- Base: `https://gamma-api.polymarket.com`
- Endpoints: `/markets`, `/events`, `/search`, etc.
- **Public** (no authentication needed)
- Returns market and event data

---

## Current Working Endpoints

### ✅ Events Endpoints (All Working)

1. **Fetch Events from Polymarket**
   ```
   GET /api/v1/events/fetch?active=true&limit=10
   POST /api/v1/events/fetch?active=true&limit=10 (backward compatibility)
   ```
   - Fetches events from Polymarket Gamma API
   - Saves to MongoDB
   - Returns: `{ success: true, data: { saved: X, errors: 0 } }`

2. **Get Events from Database**
   ```
   GET /api/v1/events?limit=10&skip=0
   ```
   - Retrieves events from MongoDB
   - Supports filtering: `status`, `category`, `featured`
   - Returns: `{ success: true, count: X, data: [...] }`

3. **Get Event Statistics**
   ```
   GET /api/v1/events/stats
   ```
   - Returns statistics about events in database
   - Returns: `{ success: true, data: { totalEvents, activeEvents, ... } }`

---

## Testing Events Endpoints

### Test 1: Fetch Events
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/fetch?active=true&limit=10" -Method GET
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Fetched and saved X events",
  "data": {
    "saved": 10,
    "errors": 0
  }
}
```

### Test 2: Get Events
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events?limit=5" -Method GET
```

**Expected Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "eventId": "...",
      "title": "...",
      "status": "active",
      ...
    }
  ]
}
```

### Test 3: Get Event Stats
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/events/stats" -Method GET
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 10,
    "activeEvents": 8,
    "closedEvents": 2,
    ...
  }
}
```

---

## Why It Works Now

### Polymarket API Architecture

**Two Separate APIs:**

1. **Gamma API** (`gamma-api.polymarket.com`)
   - ✅ Public endpoints
   - ✅ No authentication needed
   - ✅ `/markets` endpoint
   - ✅ `/events` endpoint
   - ✅ `/search` endpoint
   - **Purpose:** Read market/event data

2. **CLOB API** (`clob.polymarket.com`)
   - ⚠️ Authenticated endpoints only
   - ⚠️ Requires signature-based auth
   - ✅ `/orders` endpoint
   - ✅ `/positions` endpoint
   - ❌ **NO** `/events` endpoint
   - ❌ **NO** `/markets` endpoint
   - **Purpose:** Trading operations

### Our Implementation

**Before Fix:**
- Using CLOB API → `/events` → **404 Not Found** ❌

**After Fix:**
- Using Gamma API → `/events` → **200 OK** ✅

---

## Verification

### Check Polymarket API Directly

**Gamma API (Works):**
```powershell
Invoke-RestMethod -Uri "https://gamma-api.polymarket.com/events?limit=5" -Method GET
```
✅ Returns 200 with events data

**CLOB API (Doesn't Have Events):**
```powershell
Invoke-RestMethod -Uri "https://clob.polymarket.com/events" -Method GET
```
❌ Returns 404 (endpoint doesn't exist)

---

## Summary

### Why 404 Happened

1. ❌ **Wrong API:** Using CLOB API instead of Gamma API
2. ❌ **Wrong Endpoint:** CLOB API doesn't have `/events`
3. ❌ **Wrong Base URL:** `clob.polymarket.com` instead of `gamma-api.polymarket.com`

### What Was Fixed

1. ✅ **Updated Base URL:** Now using `gamma-api.polymarket.com`
2. ✅ **Updated Endpoints:** Using correct Gamma API endpoints
3. ✅ **Updated Parameters:** Using Gamma API query parameters
4. ✅ **Updated Routes:** Added GET method support

### Current Status

✅ **All events endpoints are working!**
- `/api/v1/events/fetch` - ✅ Working
- `/api/v1/events` - ✅ Working
- `/api/v1/events/stats` - ✅ Working

---

## If You Still See 404

### Check These:

1. **Server Running?**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/health"
   ```

2. **Correct URL?**
   - ✅ `http://localhost:3001/api/v1/events/fetch`
   - ❌ `http://localhost:3001/api/v1/events/fetch/` (trailing slash)

3. **Correct Method?**
   - ✅ `GET /api/v1/events/fetch`
   - ✅ `POST /api/v1/events/fetch` (also works)

4. **Server Restarted?**
   - Make sure you restarted the server after code changes
   - Run: `npm run dev`

5. **Check Server Logs**
   - Look at the terminal where `npm run dev` is running
   - Check for any error messages

---

**Status:** ✅ Fixed - Events endpoints are working  
**Last Updated:** 2025-01-XX

