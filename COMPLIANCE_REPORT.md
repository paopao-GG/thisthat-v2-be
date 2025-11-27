# Compliance Report: MARKET_FETCHING.md & THISTHAT_PRD.md

**Date:** 2025-01-XX  
**Scope:** Codebase review against architecture and PRD requirements

---

## 🔴 MARKET_FETCHING.md Compliance Issues

### ❌ **CRITICAL: Database Schema Violation**

**Issue:** The `Market` model in `backend/prisma/schema.prisma` includes price fields that violate the lazy loading pattern.

**Location:** `backend/prisma/schema.prisma` lines 101-105

```prisma
// Odds (e.g., 0.6500 = 65%)
thisOdds        Decimal  @map("this_odds") @db.Decimal(5, 4)
thatOdds        Decimal  @map("that_odds") @db.Decimal(5, 4)

// Market metadata
liquidity       Decimal? @db.Decimal(18, 2)
```

**Problem:** According to MARKET_FETCHING.md:
- ✅ **Should store:** `id`, `title`, `description`, `author`, `category`, `expiresAt` (static fields)
- ❌ **Should NOT store:** `thisOdds`, `thatOdds`, `liquidity`, `volume` (dynamic price data)

**Impact:** 
- Database allows storing stale price data
- Services can read potentially outdated prices from database
- Violates the core lazy loading principle

**Fix Required:** Remove `thisOdds`, `thatOdds`, and `liquidity` fields from Market model (or mark them as deprecated/optional for backward compatibility only).

---

### ❌ **CRITICAL: Missing API Routes**

**Issue:** The documented lazy loading endpoints are not implemented.

**Expected Routes (per MARKET_FETCHING.md):**
- ❌ `GET /api/v1/markets/random` - Get random markets (static data only)
- ❌ `GET /api/v1/markets/:id` - Get single market (static data only)
- ❌ `GET /api/v1/markets/:id/live` - Fetch live prices on-demand
- ❌ `GET /api/v1/markets/:id/full` - Get market with static + live data combined
- ❌ `GET /api/v1/markets/batch-live` - Batch fetch live prices
- ❌ `GET /api/v1/markets/category/:category` - Get markets by category
- ❌ `GET /api/v1/markets/categories` - Get all categories

**Current Implementation:**
- ✅ `GET /api/v1/markets/` - Exists but violates lazy loading pattern (fetches live prices automatically)

**Location:** `backend/src/features/markets/markets.routes.ts` only has one route: `GET /`

**Problem:** The current `getMarketsHandler` automatically fetches live prices for the first 20 markets and falls back to database odds. This violates the lazy loading pattern where:
1. Static endpoints should return ONLY static data (no prices)
2. Prices should ONLY be fetched when explicitly requested via `/live` endpoints

**Fix Required:** Implement separate routes for static data vs. live prices as documented.

---

### ⚠️ **Service Layer Issues**

**Issue:** `getMarkets` function reads price fields from database.

**Location:** `backend/src/features/markets/markets.services.ts` lines 117-119, 142-144

```typescript
select: {
  // ...
  thisOdds: true,      // ❌ Reading from DB
  thatOdds: true,      // ❌ Reading from DB
  liquidity: true,     // ❌ Reading from DB
  // ...
}
```

**Problem:** Even though ingestion doesn't save prices, the service layer is selecting them from the database, which could return stale/null values.

**Fix Required:** Remove price fields from `getMarkets` select statement. Only include static fields.

---

### ✅ **What's Working Correctly**

1. **Market Ingestion Service** ✅
   - `backend/src/services/market-ingestion.service.ts` correctly only saves static fields
   - Does NOT save prices (thisOdds, thatOdds, liquidity)
   - Follows lazy loading pattern for ingestion

2. **Live Price Fetching** ✅
   - `fetchLivePriceData()` function correctly fetches from Polymarket API on-demand
   - Has proper retry logic with exponential backoff

3. **JANITOR Service** ✅
   - `backend/src/services/market-janitor.service.ts` properly handles stale markets
   - Closes expired markets
   - Checks for resolution from Polymarket

---

## ✅ THISTHAT_PRD.md Compliance Status

### ✅ Section 1: Swipe & Betting UI / Market Interaction

**Status:** ✅ **COMPLETE**

- ✅ Tap on THIS/THAT = select option to bet (`BettingControls.tsx`)
- ✅ Balance input = input risk amount (`BettingControls.tsx`)
- ✅ Swipe up/down = next/previous market (`BettingPage.tsx`, `SwipeableCard.tsx`)
- ✅ Single market card by default (`MarketCard.tsx`)
- ✅ Credits for V1 (not wallet/USDC)
- ✅ Market card shows title, description, odds, expiry
- ✅ Polymarket API integration

---

### ✅ Section 2: Credit System & Wallet Integration (V1)

**Status:** ✅ **COMPLETE** (matches PRD exactly)

- ✅ Daily claims with streak system
- ✅ Starting from 1000 credits, +500 per day up to 10000 max (18-day streak)
- ✅ Stays at 10000 until streak breaks, then resets to 1000
- ✅ Credit claim happens every 00:00 UTC (`daily-credits.job.ts`)
- ✅ Used for all bets in V1
- ✅ Minimum/maximum bet configurable (10-10,000 credits)
- ✅ Payouts mirror Polymarket odds
- ✅ Can be earned through referrals (`referral.routes.ts`)
- ✅ In-app purchases supported (`purchases.routes.ts`)

**Implementation:**
- Backend: `POST /api/v1/economy/daily-credits` ✅
- Frontend: `DailyCreditsSection.tsx` ✅
- Formula: `1000 + (streak - 1) * 500` capped at 10000 ✅

---

### ✅ Section 3: Market Selection / Categorization Logic

**Status:** ✅ **PARTIALLY COMPLETE** (V1 requirements met)

- ✅ Polymarket markets (via ingestion service)
- ✅ Credits markets (admin-created markets supported)
- ⏳ Cross markets (CreatorWall + Polymarket) - V2/V3 feature
- ✅ Single-card THIS/THAT markets (default)
- ⏳ Dual-card creator comparisons - V2/V3 feature

**Note:** V1 requirements are met. Cross markets and dual-card comparisons are V2/V3 features per PRD.

---

### ✅ Section 4: Market Creation

**Status:** ✅ **COMPLETE** (V1 requirements)

- ✅ Admin-only market creation (V1 requirement met)
- ⏳ Polymarket API integration for market creation - V2
- ⏳ Onchain markets with USDC - V2
- ⏳ Creator-driven markets with $THIS tokens - V3

---

### ✅ Section 5: Rankings, Rewards, Gamification

**Status:** ✅ **COMPLETE** (V1 scope)

**User Ranking:**
- ✅ Credits Earned (Overall PnL) - `overallPnL` field in User model
- ✅ Overall Volume - `totalVolume` field in User model
- ✅ Leaderboard system (`leaderboard.routes.ts`)

**User Goals:**
- ✅ Volume tracking ✅
- ✅ PnL tracking ✅
- ⏳ $THIS token allocation - V2/V3 (not in V1 scope)

**Rewards:**
- ✅ Leaderboard-based rewards system
- ⏳ $THIS token allocation - V2/V3 (not in V1 scope)
- ⏳ Token unlocking mechanism - V2/V3 (not in V1 scope)

**Note:** V1 focuses on credits only. Token economics ($THIS) are V2/V3 features per PRD.

---

### ✅ Section 6: System Architecture

**Status:** ✅ **COMPLETE**

- ✅ Frontend: React (not React Native, but web-based)
- ✅ Swipe engine + local caching
- ✅ Backend: Node.js
- ✅ Credit ledger system
- ✅ Ranking engine (`leaderboard-update.job.ts`)
- ✅ Ingestion pipeline (`market-ingestion.service.ts`)
- ✅ Polymarket Builder API integration
- ⏳ WalletConnect - V2 (not in V1 scope)

---

## 📋 Summary

### MARKET_FETCHING.md Compliance: ⚠️ **PARTIALLY COMPLIANT**

**Issues Found:**
1. ❌ Database schema includes price fields (should be removed)
2. ❌ Missing lazy loading API routes (`/random`, `/live`, `/full`, etc.)
3. ⚠️ Service layer reads price fields from database
4. ⚠️ Current route automatically fetches prices (violates lazy loading)

**What's Working:**
- ✅ Ingestion service correctly saves only static data
- ✅ Live price fetching function works correctly
- ✅ JANITOR service properly handles stale markets

**Action Items:**
1. Remove `thisOdds`, `thatOdds`, `liquidity` from Market schema (or mark as deprecated)
2. Implement proper lazy loading routes (`/random`, `/live`, `/full`, `/batch-live`)
3. Update `getMarkets` service to not select price fields
4. Separate static data endpoints from live price endpoints

---

### THISTHAT_PRD.md Compliance: ✅ **FULLY COMPLIANT** (V1 Scope)

**All V1 requirements are met:**
- ✅ Swipe & Betting UI
- ✅ Credit System (matches PRD formula exactly)
- ✅ Market Selection (V1 requirements)
- ✅ Market Creation (V1 requirements)
- ✅ Rankings & Gamification (V1 scope)

**V2/V3 Features (Not Required for V1):**
- ⏳ Wallet integration
- ⏳ USDC betting
- ⏳ $THIS token economics
- ⏳ Creator-driven markets
- ⏳ Cross markets (CreatorWall)

---

## 🎯 Recommendations

### Priority 1: Fix MARKET_FETCHING.md Compliance

1. **Update Database Schema**
   - Remove or deprecate `thisOdds`, `thatOdds`, `liquidity` from Market model
   - Create migration to remove these columns

2. **Implement Missing Routes**
   - Add `GET /api/v1/markets/random` (static data only)
   - Add `GET /api/v1/markets/:id` (static data only)
   - Add `GET /api/v1/markets/:id/live` (live prices only)
   - Add `GET /api/v1/markets/:id/full` (static + live combined)
   - Add `GET /api/v1/markets/batch-live` (batch live prices)
   - Add `GET /api/v1/markets/category/:category` (by category)
   - Add `GET /api/v1/markets/categories` (all categories)

3. **Update Service Layer**
   - Remove price fields from `getMarkets` select statement
   - Ensure `getRandomMarkets` only returns static data
   - Keep `fetchLivePriceData` separate for on-demand fetching

4. **Update Current Route**
   - Change `GET /api/v1/markets/` to return static data only
   - Or rename it to `/full` and make it explicitly fetch live prices

### Priority 2: Documentation Updates

1. Update `MARKET_FETCHING.md` implementation status to reflect current state
2. Document the schema migration plan
3. Update API documentation with correct endpoint behavior

---

**Report Generated:** 2025-01-XX  
**Next Review:** After implementing Priority 1 fixes




