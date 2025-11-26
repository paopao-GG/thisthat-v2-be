# Market Fetching Architecture

## Overview

The market fetching system is designed with a **lazy loading** approach to efficiently handle market data that changes frequently (like prices). The architecture consists of two main components:

1. **Server-side service** - Background processes that save static market data to the database
2. **Client-side API route** - Endpoint that fetches real-time pricing data on-demand

---

## 1. Server-Side Service (Background Operations)

The server-side service handles background processes that fetch and store market data from Polymarket.

### Responsibilities

- Fetch data from Polymarket API
- Save market data to the database
- Only store **crucial static fields** that don't change frequently

### Fields Stored in Database

The service saves only essential static information:

- `id` - Market identifier
- `market title` - The market question/title
- `market description` - Detailed description of the market
- `market author` - Creator of the market
- `market due date` - Expiration/end date (already configured)
- Other static metadata (category, image URL, etc.)

### Fields NOT Stored

**Market prices and related dynamic data are NOT stored** because:
- Prices change every second
- Storing them would create stale data immediately
- It's inefficient to constantly update the database with rapidly changing values

---

## 2. JANITOR Service (Stale Market Cleanup)

A separate service called **JANITOR** handles markets that have reached their due date or become stale.

### Responsibilities

- Clean up stale markets that have passed their due date
- Handle markets that have already closed
- Check entries that are due/overdue
- Archive or remove expired market data

### When JANITOR Runs

- Scheduled background job
- Processes markets that have `expiresAt` date in the past
- Updates market status to `closed` or `archived`

---

## 3. Client-Side API Route

The client-side API route provides real-time market data to the frontend when needed.

### Workflow

1. **Query Database for Market IDs**
   - The API queries the database for random market IDs
   - Returns only the static data stored in the database

2. **Fetch Real-Time Pricing Data**
   - For each market ID, the API calls Polymarket API again
   - Specifically fetches current pricing data
   - Only at this point does it retrieve up-to-date market prices

3. **Return Combined Data**
   - Combines static database data with real-time pricing data
   - Returns complete, current market information to the client

### Benefits

- **Always up-to-date**: Prices are fetched fresh when requested
- **Efficient**: Database only stores static data that doesn't change frequently
- **Scalable**: Reduces database write operations significantly

---

## Architecture Pattern: Lazy Loading

This approach implements a **"fetch only when needed"** (lazy loading) pattern:

### Why Lazy Loading?

- **Market prices change every second** - Storing them would be wasteful
- **Database efficiency** - Reduces write operations and storage requirements
- **Real-time accuracy** - Client always gets current prices when requested
- **Separation of concerns** - Static data (database) vs. dynamic data (API)

### Data Flow

```
┌─────────────────┐
│  Polymarket API │
└────────┬────────┘
         │
         │ (Background Service)
         ▼
┌─────────────────┐
│   Database      │  ← Stores static fields only
│  (Static Data)  │     (id, title, description, author, due date)
└────────┬────────┘
         │
         │ (Client Request)
         ▼
┌─────────────────┐
│  API Route      │  ← Queries DB for IDs
└────────┬────────┘     Fetches prices from Polymarket
         │
         │ (Combined Response)
         ▼
┌─────────────────┐
│   Frontend      │  ← Receives static + real-time data
└─────────────────┘
```

---

## Implementation Notes

- The database serves as a **catalog** of available markets
- Pricing data is **always fetched fresh** from Polymarket API
- JANITOR service ensures the database stays clean and current
- This pattern balances data freshness with system efficiency

---

## Implementation Status

### ✅ PostgreSQL System (Primary - Recommended)

**Location:** `backend/src/services/market-ingestion.service.ts` and `backend/src/features/markets/`

**Status:** ✅ **FULLY COMPLIANT** with lazy loading pattern

- ✅ Only saves static fields (id, title, description, author, category, expiresAt)
- ✅ Does NOT save prices (thisOdds, thatOdds, liquidity, volume)
- ✅ Client API fetches prices on-demand from Polymarket API
- ✅ JANITOR service implemented and working

**Endpoints:**
- `GET /api/v1/markets/random` - Get random markets (static data)
- `GET /api/v1/markets/:id` - Get market by ID (static data)
- `GET /api/v1/markets/:id/live` - Fetch live prices on-demand
- `GET /api/v1/markets/:id/full` - Get market with static + live data combined

### ⚠️ MongoDB System (Legacy - Deprecated)

**Location:** `backend/src/features/fetching/market-data/`

**Status:** ⚠️ **UPDATED TO FOLLOW PATTERN** (kept for backward compatibility)

- ✅ Updated to NOT save prices (only static data)
- ⚠️ Marked as deprecated - use PostgreSQL system instead
- ⚠️ Routes registered as `/api/v1/markets/legacy/*` for backward compatibility

**Migration Path:**
- Old: `GET /api/v1/markets/legacy` → New: `GET /api/v1/markets/random`
- Old: `GET /api/v1/markets/legacy/fetch` → New: Use PostgreSQL ingestion service

**Note:** The MongoDB system has been updated to follow the lazy loading pattern but is kept only for backward compatibility. New implementations should use the PostgreSQL-based system.

