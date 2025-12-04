# THISTHAT – Planned Changes (Prioritized)

**Priority Order:** #1 = Highest Priority → #10 = Lowest Priority

---

## 1. **Rate Limiting** 🔴 HIGHEST PRIORITY
**Status:** ✅ Accomplished  
**Impact:** Security & Stability Critical  
**Effort:** Low (1-2 hours) - ✅ COMPLETE

- ✅ Set up rate limiting for:
  - ✅ Critical processes (betting, economy, purchases) - 30 req/min
  - ✅ Internal jobs - 1 req/min (configured, ready for use)
  - ✅ External API calls (market ingestion) - 5 req/min
  - ✅ User-facing endpoints - 100 req/min (standard)
  - ✅ Auth endpoints - Split implementation:
    - OAuth & token management (`/x`, `/callback`, `/refresh`, `/logout`) - 10 req/15min (strict, prevents brute force)
    - User profile (`/me`) - 100 req/min (standard, more lenient since it requires auth)
- ✅ Protects against abuse and sudden traffic spikes.
- ✅ Uses in-memory storage (works without Redis, graceful fallback)
- ✅ Per-user rate limiting (uses user ID if authenticated, IP otherwise)
- ✅ Configurable via environment variables
- ✅ Smart separation: `/me` endpoint has higher limit (100 req/min) since it's not an auth attempt
- **Implementation:** `@fastify/rate-limit` plugin with different limits per route group
- **Files:** `src/lib/rate-limit.config.ts`, `src/app/index.ts`, `src/features/*/routes.ts`

---

## 2. **Error Handling & Failover** 🔴 HIGH PRIORITY
**Status:** ✅ Accomplished  
**Impact:** Production Stability Critical  
**Effort:** Medium (4-6 hours) - ✅ COMPLETE

- ✅ Implemented robust error handling and failover for all features:
  - ✅ Failed to bet - Retry logic with exponential backoff, transaction rollback on failure
  - ✅ Failed to sell - Circuit breaker + retry with fallback to stored odds, plus transaction refactor so Polymarket live price fetch happens **outside** the Prisma transaction (prevents deadlocks/timeouts)
  - ✅ Failed to fetch market - Circuit breaker pattern, graceful degradation (returns null)
  - ✅ Polymarket API rate/usage limits - Automatic retry with exponential backoff, circuit breaker protection
  - ✅ Other API or network failures - Comprehensive retry logic, structured error responses
- ✅ Standardized error response format across all endpoints
- ✅ Enhanced error handling in all controllers (betting, economy, markets)
- ✅ Circuit breaker pattern for external API calls (Polymarket)
- ✅ Retry logic with exponential backoff for transient failures
- ✅ Graceful degradation (fallback to cached/stored data when external APIs fail)
- ✅ Structured error classification (network, rate limit, validation, database, etc.)
- ✅ Global error handler middleware for unhandled errors
- **Implementation:** 
  - `src/lib/error-handler.ts` - Circuit breakers, structured errors, retry logic
  - `src/lib/error-response.ts` - Standardized error response builders
  - `src/lib/retry.ts` - Exponential backoff retry utilities
  - Enhanced all controllers with consistent error handling
  - Polymarket client wrapped with circuit breaker and retry logic
- **Files:** `src/lib/error-handler.ts`, `src/lib/error-response.ts`, `src/lib/retry.ts`, `src/features/*/controllers.ts`, `src/lib/polymarket-client.ts`

---

## 3. **Auth Security Review** 🔴 HIGH PRIORITY
**Status:** 🔄 Partially Done  
**Impact:** Security Critical  
**Effort:** Medium (3-4 hours)

- Perform a security audit of the authentication flow.
- Check if the backend can be exploited via the frontend:
  - Token handling
  - Redirects/callbacks
  - Public endpoints
  - Any exposed secrets or insecure assumptions
- **Why Third:** Security document exists but needs formal audit and implementation of recommendations (rate limiting, HttpOnly cookies, etc.).

---

## 4. **Skipped Markets Time Window** 🟡 MEDIUM PRIORITY
**Status:** ❌ Not Started  
**Impact:** User Experience  
**Effort:** Low (2-3 hours)

- Current: markets marked as "viewed"/"skipped" never show again.
- Change: add a **time window** (e.g., 3 days) after which skipped markets can appear again.
- Allows markets to re-enter the user's feed after the cooldown period.
- **Why Fourth:** Quick win that improves UX and market discovery without major architectural changes.

---

## 5. **Continuous Prefetching per Category** 🟡 MEDIUM PRIORITY
**Status:** ✅ Accomplished  
**Impact:** User Experience  
**Effort:** Medium (4-5 hours)

- ✅ Continuous background monitoring job (`category-prefetch.job.ts`) detects low-count categories every 5 minutes.
- ✅ Redis-backed prefetch queue (`prefetch-queue.service.ts`) with retries, backoff, and dead-letter handling keeps ingestion resilient.
- ✅ Category cache service ensures prefetched batches are stored in Redis for instant delivery to clients.
- ✅ Manual triggers now wait for queue completion (better DX for scripts/admin tools).
- ✅ Env toggles for cache TTL, queue retries, concurrency, and manual timeout documented in `backend/env.template`.
- **Why Fifth:** Ensures users never run out of fresh markets per category without manual intervention.

---

## 6. **Database Separation** 🟢 LOWER PRIORITY
**Status:** ✅ Accomplished  
**Impact:** Scalability Optimization  
**Effort:** Medium (3-4 hours) - ✅ COMPLETE

- ✅ Created two separate PostgreSQL databases:
  - ✅ `thisthat_markets` - Stores market data only
  - ✅ `thisthat_users` - Stores user data, bets, transactions, etc.
- ✅ Split Prisma schemas:
  - ✅ `schema.markets.prisma` - Market model with markets database connection
  - ✅ `schema.users.prisma` - User, Bet, CreditTransaction, etc. with users database connection
- ✅ Updated all services to use correct database clients:
  - ✅ `marketsPrisma` for market operations
  - ✅ `usersPrisma` for user/bet/transaction operations
- ✅ Removed MongoDB entirely (no longer needed)
- ✅ Updated database client exports in `src/lib/database.ts`
- ✅ Migration documentation and scripts provided
- **Implementation:** Two separate Prisma datasources, separate client instances
- **Files:** `prisma/schema.markets.prisma`, `prisma/schema.users.prisma`, `src/lib/database.ts`, all service files updated

---

## 7. **Static Test Data** 🟢 LOWER PRIORITY
**Status:** ❌ Not Started  
**Impact:** Development Convenience  
**Effort:** Low (2-3 hours)

- Add static seed data to:
  - Populate users
  - Test leaderboards
  - Test the in-app economy (bets, wins, losses, balances, etc.)
- **Why Seventh:** Development/testing convenience. Not needed for production but helpful for QA and demos.

---

## 8. **Scenario & Risk Mapping** 🟢 LOWER PRIORITY
**Status:** ❌ Not Started  
**Impact:** Documentation & Planning  
**Effort:** Medium (4-6 hours)

- Single out all possible:
  - Scenarios
  - Errors
  - Issues that may happen to the system
- Design and document **countermeasures** for each identified risk.
- **Why Eighth:** Important for long-term planning but not blocking for launch. Can be done incrementally.

---

## 9. **Input Sanitization** ✅ ALREADY DONE
**Status:** ✅ Accomplished  
**Impact:** Security (Already Implemented)

- ✅ Implemented sanitation and validation for all database inputs:
  - ✅ Prevent SQL injection / NoSQL injection (Prisma ORM)
  - ✅ Prevent XSS via stored or reflected inputs (Zod validation)
  - ✅ Enforce schemas and types at the backend (TypeScript + Zod)
- **Note:** Already complete. Zod validation on all endpoints, Prisma prevents SQL injection.

---

## 10. **Frictionless Leaderboards** ✅ ALREADY DONE
**Status:** ✅ Accomplished  
**Impact:** Performance (Already Implemented)

- ✅ Architecture implemented:
  - ✅ Leaderboard data comes from the main database (no separate leaderboard table)
  - ✅ Function/service fetches raw data, processes rankings, caches in Redis
  - ✅ Client fetches leaderboard data directly from cache for fast responses
- **Note:** Already complete. See `leaderboard.services.ts` - fetches from DB, processes, caches in Redis (5 min TTL).

---

---

## 11. **AMM (Automated Market Maker) Implementation** 🟢 FEATURE ADDITION
**Status:** ✅ Accomplished
**Impact:** Major System Upgrade - Polymarket-Style Betting
**Effort:** High (12-16 hours) - ✅ COMPLETE

- ✅ Implemented Constant Product Market Maker (CPMM) formula: `x * y = k`
- ✅ Created complete AMM service with buy/sell functions
- ✅ Transformed betting from odds-based to share-based
- ✅ Added dynamic pricing with price impact calculations
- ✅ Implemented early position selling (sell before resolution)
- ✅ Database schema updates:
  - ✅ Markets: Added `yesReserve`, `noReserve` (AMM reserves)
  - ✅ Bets: Added `sharesReceived`, `priceAtBet` (share tracking)
- ✅ Updated market resolution for share-based payouts (1 share = 1 credit if wins)
- ✅ Reserve initialization on market creation/import synced with Polymarket odds
- ✅ REST API endpoints:
  - ✅ `POST /api/v1/bets` - Place bet using AMM (updated)
  - ✅ `POST /api/v1/bets/:id/sell` - Sell position early (updated)
  - ✅ `GET /api/v1/bets/quote` - Get trade quote (new, public)
- ✅ Backwards compatible with legacy odds-based bets
- ✅ 0.3% trading fee (30 basis points)
- ✅ Initial liquidity: 10,000 per market for better price stability
- **Implementation:**
  - `src/services/amm.service.ts` - Core CPMM logic
  - `src/features/betting/betting.services.amm.ts` - AMM betting service
  - Updated controllers, routes, market ingestion, and resolution services
- **Documentation:**
  - `AMM_IMPLEMENTATION_COMPLETE.md` - Complete implementation summary
  - `AMM_DEPLOYMENT_GUIDE.md` - Step-by-step deployment guide
  - `CPMM_IMPLEMENTATION_GUIDE.md` - Technical specification
  - `thisthat-cpmm-full-guide.md` - Original design document
- **Testing:**
  - `scripts/test-amm-endpoints.ts` - Comprehensive test suite
  - `migrate-amm.bat` - Windows migration script
  - `npm run test:amm` - Test command added to package.json
- **Benefits:**
  - Dynamic pricing based on supply/demand
  - Users bet against each other (no house risk)
  - Fair market discovery through CPMM
  - Early exit capability for all positions
  - Slippage protection (large bets get worse prices)
  - Compatible with Polymarket ecosystem

---

## Summary

**Critical for Launch (Do First):**
1. Rate Limiting ✅
2. Error Handling & Failover ✅
3. Auth Security Review

**Improve UX (Do Next):**
4. Skipped Markets Time Window
5. Continuous Prefetching per Category ✅

**Optimize Later:**
6. Database Separation ✅ (COMPLETE)
7. Static Test Data
8. Scenario & Risk Mapping

**Already Complete:**
9. Input Sanitization ✅
10. Frictionless Leaderboards ✅

**Major Features Added:**
11. AMM (Automated Market Maker) ✅ (COMPLETE)
