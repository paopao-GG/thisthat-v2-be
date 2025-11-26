# Lazy Loading Architecture Documentation

## Overview

The THISTHAT market system uses a **lazy loading pattern** to efficiently handle market data. This architecture separates static data (stored in PostgreSQL) from dynamic pricing data (fetched on-demand from Polymarket API).

---

## Architecture Pattern

### Why Lazy Loading?

Market prices (odds, liquidity, volume) change **every second** on Polymarket. Storing these prices in our database would:
- ❌ Create stale data immediately
- ❌ Waste database storage
- ❌ Require constant updates (inefficient)
- ❌ Increase API response times

**Solution:** Store only static data, fetch prices when needed.

---

## Components

### 1. Server-Side Ingestion Service

**Location:** `backend/src/services/market-ingestion.service.ts`

**Purpose:** Background service that periodically fetches markets from Polymarket and saves **static data only**.

**What Gets Saved:**
- ✅ Market ID (`polymarketId`)
- ✅ Title
- ✅ Description
- ✅ Author (`submitted_by`)
- ✅ THIS/THAT options
- ✅ Category
- ✅ Expiry date (`expiresAt`)
- ✅ Status (open/closed)

**What Does NOT Get Saved:**
- ❌ Odds (`thisOdds`, `thatOdds`)
- ❌ Liquidity
- ❌ Volume
- ❌ Price data

**Background Job:** Runs every 5 minutes (`backend/src/jobs/market-ingestion.job.ts`)

**Retry Logic:** Uses exponential backoff (3 retries, 1s → 2s → 4s delays)

---

### 2. Janitor Service

**Location:** `backend/src/services/market-janitor.service.ts`

**Purpose:** Cleans up stale and overdue markets.

**Tasks:**
1. **Close Expired Markets** - Marks markets past `expiresAt` as 'closed'
2. **Check Resolutions** - Queries Polymarket for resolved markets
3. **Process Payouts** - Settles bets and positions for resolved markets

**Background Job:** Runs every 1 minute (`backend/src/jobs/market-janitor.job.ts`)

**Retry Logic:** Uses exponential backoff for Polymarket API calls

---

### 3. Client API Routes

**Location:** `backend/src/features/markets/`

**Purpose:** Client-facing endpoints that fetch static data from PostgreSQL and live prices from Polymarket on-demand.

#### Static Data Endpoints (PostgreSQL)

- `GET /api/v1/markets/random` - Get random markets (static only)
- `GET /api/v1/markets/:id` - Get single market (static only)
- `GET /api/v1/markets/category/:category` - Get markets by category (static only)
- `GET /api/v1/markets/categories` - Get all categories

#### Live Pricing Endpoints (Polymarket API)

- `GET /api/v1/markets/:id/live` - Fetch live prices for a market
- `GET /api/v1/markets/batch-live?ids=id1,id2,id3` - Batch fetch live prices (max 20)
- `GET /api/v1/markets/:id/full` - Get market with static + live data combined

---

## Data Flow

### Flow 1: Background Ingestion (Every 5 Minutes)

```
Polymarket API
    ↓
Market Ingestion Service (with retry)
    ↓
Extract Static Data Only
    ↓
PostgreSQL (Market table)
```

**Example:**
```typescript
// What gets saved:
{
  polymarketId: "0x123...",
  title: "Will it rain tomorrow?",
  description: "Weather prediction",
  author: "user123",
  thisOption: "YES",
  thatOption: "NO",
  category: "weather",
  expiresAt: "2025-12-31T00:00:00Z",
  status: "open"
  // NO prices saved!
}
```

---

### Flow 2: Client Requests Markets (Static Data)

```
Frontend
    ↓
GET /api/v1/markets/random?count=10
    ↓
Markets Service (getRandomMarkets)
    ↓
PostgreSQL Query (static data only)
    ↓
Return to Frontend
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "market-1",
      "title": "Will it rain tomorrow?",
      "thisOption": "YES",
      "thatOption": "NO",
      "expiresAt": "2025-12-31T00:00:00Z"
      // NO prices in response
    }
  ]
}
```

---

### Flow 3: Client Needs Prices (Lazy Loading)

```
Frontend
    ↓
GET /api/v1/markets/:id/live
    ↓
Markets Service (fetchLivePriceData)
    ↓
Polymarket API (with retry)
    ↓
Extract Price Data
    ↓
Return to Frontend
```

**Response:**
```json
{
  "success": true,
  "data": {
    "polymarketId": "0x123...",
    "thisOdds": 0.65,
    "thatOdds": 0.35,
    "liquidity": 48238.52,
    "volume": 2181936.42,
    "volume24hr": 50000,
    "acceptingOrders": true
  }
}
```

---

## Retry Logic

### Exponential Backoff Strategy

All external API calls use exponential backoff to handle temporary failures:

```typescript
// Retry configuration
{
  maxRetries: 3,
  initialDelayMs: 1000,  // 1 second
  maxDelayMs: 10000,     // 10 seconds max
  backoffMultiplier: 2   // Double delay each retry
}

// Retry delays:
// Attempt 1: Immediate
// Attempt 2: Wait 1s
// Attempt 3: Wait 2s
// Attempt 4: Wait 4s (capped at 10s)
```

### Retryable Errors

- Network errors (no response)
- 5xx server errors
- 429 rate limit errors

### Non-Retryable Errors

- 4xx client errors (404, 400, etc.)
- Validation errors

---

## Error Handling

### Ingestion Service

- **Individual Market Errors:** Logged, but processing continues
- **API Failures:** Retried with exponential backoff
- **Fatal Errors:** Returns partial result instead of throwing

### Janitor Service

- **Market Processing Errors:** Logged, but continues with next market
- **Polymarket API Failures:** Retried with exponential backoff
- **Payout Errors:** Logged, but doesn't block other payouts

### Client API Routes

- **Market Not Found:** Returns 404
- **Missing Polymarket ID:** Returns 400
- **API Failures:** Returns 503 (Service Unavailable)
- **Database Errors:** Returns 500

---

## Performance Considerations

### Database Queries

- **Indexes:** `status`, `category`, `expiresAt`, `polymarketId`
- **Selective Fields:** Only fetches needed fields (not full records)
- **Pagination:** Limits results to prevent large queries

### API Calls

- **Batch Fetching:** Use `/batch-live` for multiple markets (more efficient)
- **Caching:** Consider adding Redis cache for frequently accessed markets
- **Rate Limiting:** Polymarket API has rate limits (respected by retry logic)

---

## Usage Examples

### Frontend: Get Markets and Prices

```typescript
// Step 1: Get static market data
const markets = await fetch('/api/v1/markets/random?count=10');
// Returns: Array of markets (no prices)

// Step 2: Fetch live prices for selected market
const liveData = await fetch(`/api/v1/markets/${marketId}/live`);
// Returns: { thisOdds, thatOdds, liquidity, volume, ... }

// OR: Get everything in one call
const fullMarket = await fetch(`/api/v1/markets/${marketId}/full`);
// Returns: Static data + live prices combined
```

### Batch Fetching (Recommended)

```typescript
// Fetch live prices for multiple markets at once
const marketIds = ['market-1', 'market-2', 'market-3'];
const livePrices = await fetch(
  `/api/v1/markets/batch-live?ids=${marketIds.join(',')}`
);
// Returns: Map of marketId -> live price data
```

---

## Background Jobs

### Market Ingestion Job

**Schedule:** Every 5 minutes  
**Function:** `startMarketIngestionJob()`  
**Service:** `market-ingestion.service.ts`

**What It Does:**
1. Fetches active markets from Polymarket (up to 500)
2. Extracts static data only
3. Upserts to PostgreSQL (create or update)
4. Logs results

**Logs:**
```
[Market Ingestion Job] Starting ingestion...
[Market Ingestion] Fetched 500 markets
[Market Ingestion] Complete: 50 created, 450 updated, 0 skipped, 0 errors
```

---

### Market Janitor Job

**Schedule:** Every 1 minute  
**Function:** `startMarketJanitorJob()`  
**Service:** `market-janitor.service.ts`

**What It Does:**
1. Finds expired markets (past `expiresAt`)
2. Closes them (status: 'closed')
3. Checks Polymarket for resolutions
4. Processes bet payouts
5. Settles positions

**Logs:**
```
[Market Janitor Job] Starting cleanup...
[Janitor] Closed expired market: Will it rain tomorrow?
[Janitor] Resolved market: Election 2024 -> this
[Janitor] Settled 5 positions, payout: 1000
```

---

## Database Schema

### Market Table (PostgreSQL)

```prisma
model Market {
  id              String   @id @default(uuid())
  polymarketId    String?  @unique
  
  // Static data (saved by ingestion)
  title           String
  description     String?
  thisOption      String
  thatOption      String
  author          String?
  category        String?
  expiresAt       DateTime?
  status          String   // 'open', 'closed', 'resolved'
  
  // NO price fields stored here!
  // Prices fetched on-demand from Polymarket API
  
  @@index([status])
  @@index([expiresAt])  // For Janitor queries
  @@index([polymarketId])
}
```

---

## Migration from Old System

### Route Changes

**Old Routes (Legacy):**
- `/api/v1/markets/fetch` - Now at `/api/v1/markets/legacy/fetch`
- `/api/v1/markets` - Now at `/api/v1/markets/legacy`

**New Routes:**
- `/api/v1/markets/random` - Get random markets
- `/api/v1/markets/:id` - Get market by ID
- `/api/v1/markets/:id/live` - Get live prices

---

## Testing

### Unit Tests

- ✅ `market-ingestion.service.test.ts` - Ingestion logic
- ✅ `market-janitor.service.test.ts` - Janitor logic
- ✅ `markets.services.test.ts` - Lazy loading functions
- ✅ `markets.controllers.test.ts` - API handlers
- ✅ `retry.test.ts` - Retry utility

### Running Tests

```bash
npm test
```

---

## Troubleshooting

### Issue: Markets not updating

**Check:**
1. Is ingestion job running? (Check server logs)
2. Is Polymarket API accessible?
3. Are there errors in ingestion logs?

### Issue: Live prices failing

**Check:**
1. Is Polymarket API rate-limited? (429 errors)
2. Are `polymarketId` values correct?
3. Check retry logs for failures

### Issue: Janitor not closing expired markets

**Check:**
1. Is janitor job running? (Check server logs)
2. Are `expiresAt` dates set correctly?
3. Check database for expired markets: `SELECT * FROM markets WHERE status = 'open' AND expires_at < NOW()`

---

## Future Improvements

- [ ] Add Redis caching for frequently accessed markets
- [ ] Add WebSocket support for real-time price updates
- [ ] Add rate limiting for client API calls
- [ ] Add metrics/monitoring for job performance
- [ ] Add alerting for job failures

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

