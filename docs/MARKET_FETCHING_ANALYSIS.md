# Market Fetching Implementation Analysis

## Summary

**Status:** ⚠️ **PARTIALLY COMPLIANT** - The new PostgreSQL-based system correctly follows the lazy loading pattern, but legacy MongoDB-based code still exists that violates it.

---

## ✅ What's Working Correctly (New System)

### 1. Server-Side Service (PostgreSQL) ✅

**File:** `backend/src/services/market-ingestion.service.ts`

**Status:** ✅ **CORRECTLY IMPLEMENTED**

- ✅ Only saves static fields:
  - `polymarketId`, `title`, `description`, `thisOption`, `thatOption`, `author`, `category`, `imageUrl`, `status`, `expiresAt`
- ✅ **Does NOT save prices:**
  - No `thisOdds`, `thatOdds`, `liquidity`, `volume` stored
- ✅ Comment explicitly states: *"Price data (odds, liquidity, volume) is NOT saved - it's fetched live by client API"*

**Code Evidence:**
```typescript
// extractStaticData() only extracts static fields
return {
  polymarketId: market.conditionId || market.condition_id,
  title: market.question,
  description: market.description || null,
  thisOption,
  thatOption,
  author: market.submitted_by || null,
  category: market.category || null,
  // NO prices saved!
};
```

### 2. Client-Side API Route ✅

**File:** `backend/src/features/markets/markets.services.ts`

**Status:** ✅ **CORRECTLY IMPLEMENTED**

- ✅ `getRandomMarkets()` - Returns static data only from PostgreSQL
- ✅ `fetchLivePriceData()` - Fetches real-time prices from Polymarket API on-demand
- ✅ `getMarketWithLiveData()` - Combines static + live data

**Code Evidence:**
```typescript
// Static data only
export async function getRandomMarkets(count: number = 10): Promise<MarketStaticData[]> {
  // Returns: id, title, description, thisOption, thatOption, author, category, status, expiresAt
  // NO prices!
}

// Live prices fetched on-demand
export async function fetchLivePriceData(polymarketId: string): Promise<MarketLiveData | null> {
  // Fetches from Polymarket API: thisOdds, thatOdds, liquidity, volume
}
```

### 3. JANITOR Service ✅

**File:** `backend/src/services/market-janitor.service.ts`

**Status:** ✅ **EXISTS AND WORKS**

- ✅ Closes expired markets (`expiresAt` in the past)
- ✅ Checks for resolved markets from Polymarket
- ✅ Processes payouts for resolved markets
- ✅ Handles stale/overdue markets

**Code Evidence:**
```typescript
// Closes expired markets
async function getExpiredMarkets() {
  return prisma.market.findMany({
    where: {
      status: 'open',
      expiresAt: { lte: now },
    },
  });
}
```

---

## ❌ What's NOT Following the Pattern (Legacy System)

### Legacy MongoDB System ❌

**File:** `backend/src/features/fetching/market-data/market-data.services.ts`

**Status:** ❌ **VIOLATES LAZY LOADING PATTERN**

**Issues:**
1. ❌ `normalizeMarket()` includes price fields:
   - `thisOdds`, `thatOdds`, `volume`, `volume24hr`, `liquidity`
2. ❌ `fetchAndSaveMarkets()` saves ALL data including prices to MongoDB
3. ❌ Routes still registered (as `/api/v1/markets/legacy` for backward compatibility)

**Code Evidence:**
```typescript
// ❌ WRONG: Includes prices
return {
  conditionId: polymarketData.conditionId,
  question: polymarketData.question,
  thisOdds,        // ❌ Price data stored!
  thatOdds,        // ❌ Price data stored!
  volume: polymarketData.volume,           // ❌ Price data stored!
  liquidity: polymarketData.liquidity,     // ❌ Price data stored!
  // ...
};
```

**Routes:**
- `GET /api/v1/markets/legacy/fetch` - Fetches and saves to MongoDB (with prices)
- `GET /api/v1/markets/legacy` - Returns markets from MongoDB (with prices)

---

## Architecture Comparison

### Current State (Two Systems)

```
┌─────────────────────────────────────────────────────────┐
│                    Polymarket API                       │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
    ┌───────────▼──────────┐  ┌──────▼──────────────┐
    │  NEW System (✅)     │  │  OLD System (❌)     │
    │  PostgreSQL          │  │  MongoDB             │
    └───────────┬──────────┘  └──────┬───────────────┘
                │                     │
    ┌───────────▼──────────┐  ┌──────▼──────────────┐
    │  Static Data Only     │  │  ALL Data + Prices  │
    │  - id, title, desc    │  │  - id, title, desc  │
    │  - author, category   │  │  - thisOdds ❌      │
    │  - expiresAt          │  │  - thatOdds ❌       │
    │  NO prices ✅         │  │  - liquidity ❌      │
    └───────────────────────┘  └─────────────────────┘
```

### Desired State (Single System)

```
┌─────────────────────────────────────────────────────────┐
│                    Polymarket API                       │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
    ┌───────────▼──────────┐  ┌──────▼──────────────┐
    │  Background Service   │  │  Client API         │
    │  (Every 5 min)        │  │  (On-demand)        │
    └───────────┬──────────┘  └──────┬───────────────┘
                │                     │
    ┌───────────▼──────────┐  ┌──────▼──────────────┐
    │  PostgreSQL           │  │  Fetch Live Prices  │
    │  Static Data Only ✅  │  │  from Polymarket ✅  │
    └───────────────────────┘  └─────────────────────┘
```

---

## Recommendations

### 1. ✅ Keep New System (PostgreSQL)
- Continue using `market-ingestion.service.ts` for background ingestion
- Continue using `markets.services.ts` for client-facing API
- This correctly implements lazy loading

### 2. ⚠️ Deprecate Legacy System (MongoDB)
- **Option A:** Remove MongoDB routes entirely
  - Delete `backend/src/features/fetching/market-data/` (or mark as deprecated)
  - Remove route registration from `app/index.ts`
  
- **Option B:** Keep for backward compatibility but document as deprecated
  - Add deprecation warnings to responses
  - Document migration path to new endpoints
  - Set removal date (e.g., "Will be removed in v2")

### 3. 📝 Update Documentation
- Document that MongoDB system is legacy
- Update API docs to point to new PostgreSQL endpoints
- Add migration guide for frontend

---

## Operational Diagnostics & Scripts (2025-11-27)

To debug the “no fresh markets” blockers without redeploying, a set of targeted scripts now lives under `backend/scripts/tests/`:

- `npm run show:ingest-config` &nbsp;→ prints the effective `MARKET_INGEST_CRON`, limit overrides, and Polymarket endpoint/key usage so you can spot misconfigured env vars immediately.
- `npm run test:cron` &nbsp;→ boots the actual `startMarketIngestionJob()` loop for ~15 seconds, emits `[Market Ingestion Job]` logs, and proves whether the scheduled job can talk to Polymarket in the current runtime/binary.
- `npm run test:polymarket` &nbsp;→ performs a one-off ingestion (default limit 50), logs markets/tokens returned, estimates credit consumption, and shows how many rows were created/updated in Postgres.
- `npm run list:markets` &nbsp;→ prints the latest `updatedAt` timestamps for the top N markets (default 25) so you can verify the database is actually growing beyond the first page the frontend requests.

These scripts directly address the previously identified blockers:
- **“Cron never fires”** → run `npm run test:cron` against the deployed bundle or container.
- **“Need on-demand ingestion”** → use `npm run test:polymarket` while building an authenticated HTTP endpoint if required.
- **“Silent ingestion failures”** → every script surfaces upstream errors and prints the offending payloads.
- **“No new rows in Postgres”** → `npm run list:markets` shows exactly what the client would see once pagination/viewed caches are cleared.

---

## Compliance Checklist

| Requirement | New System (PostgreSQL) | Legacy System (MongoDB) |
|------------|------------------------|------------------------|
| Server-side service saves static data only | ✅ Yes | ❌ No (saves prices) |
| Client API fetches prices on-demand | ✅ Yes | ❌ No (returns stored prices) |
| Prices NOT stored in database | ✅ Yes | ❌ No (stored in MongoDB) |
| JANITOR service exists | ✅ Yes | N/A |
| Lazy loading pattern | ✅ Yes | ❌ No |

---

## Conclusion

**The new PostgreSQL-based system correctly follows the lazy loading pattern described in `MARKET_FETCHING.md`.**

**However, legacy MongoDB-based code still exists that violates this pattern by storing prices.**

**Recommendation:** Deprecate or remove the legacy MongoDB system to ensure full compliance with the documented architecture.

