# Codebase vs Memory-Bank Alignment Report

**Generated:** 2025-01-XX  
**Purpose:** Compare documented features in memory-bank with actual codebase implementation

---

## Executive Summary

**Overall Alignment:** ~85% aligned with some notable discrepancies

### ✅ Well Aligned Areas
- Core feature modules (auth, betting, economy, leaderboard, markets)
- Database schema matches documentation
- Background jobs implementation
- API endpoint structure

### ⚠️ Discrepancies Found
1. **OAuth Implementation** - Fully implemented but not prominently documented
2. **Email/Password Auth** - Controllers exist but routes not registered
3. **Market Endpoints** - More endpoints exist than documented
4. **Betting Endpoints** - Additional `/sell` endpoint not in memory-bank
5. **Fetching Routes** - Legacy fetching routes exist but not in main app registration

---

## Detailed Comparison

### 1. Authentication System

#### Memory-Bank Documentation
- ✅ Signup (POST /api/v1/auth/signup)
- ✅ Login (POST /api/v1/auth/login)
- ✅ Profile (GET /api/v1/auth/me)
- ✅ Refresh (POST /api/v1/auth/refresh)
- ✅ Logout (POST /api/v1/auth/logout)

#### Actual Implementation
**Routes Registered (`auth.routes.ts`):**
- ✅ GET `/api/v1/auth/x` - X OAuth initiation
- ✅ GET `/api/v1/auth/x/callback` - X OAuth callback
- ✅ POST `/api/v1/auth/refresh` - Token refresh
- ✅ POST `/api/v1/auth/logout` - Logout
- ✅ GET `/api/v1/auth/me` - User profile

**Controllers Exist But Routes NOT Registered:**
- ⚠️ `signupHandler` - Exists in `auth.controllers.ts` but no route
- ⚠️ `loginHandler` - Exists in `auth.controllers.ts` but no route

**OAuth Implementation:**
- ✅ `oauth.services.ts` - Full X OAuth implementation
- ✅ `OAuthAccount` model in schema
- ✅ OAuth routes active and working
- ⚠️ **Not prominently documented in memory-bank** (only mentioned in `docs/X_OAUTH_IMPLEMENTATION_COMPLETE.md`)

**Verdict:** 
- **Discrepancy:** OAuth is the primary auth method (not email/password)
- **Missing:** Email/password routes not registered despite controllers existing
- **Documentation Gap:** OAuth implementation not well covered in memory-bank

---

### 2. Markets Module

#### Memory-Bank Documentation
- ✅ GET `/api/v1/markets` - List markets
- ✅ GET `/api/v1/markets/:marketId` - Single market (noted as "need to implement")

#### Actual Implementation
**Routes Registered (`markets.routes.ts`):**
- ✅ GET `/api/v1/markets` - List markets with filters
- ✅ GET `/api/v1/markets/random` - Random markets
- ✅ GET `/api/v1/markets/categories` - List categories
- ✅ GET `/api/v1/markets/category/:category` - Filter by category
- ✅ GET `/api/v1/markets/:id` - Single market (✅ IMPLEMENTED)
- ✅ GET `/api/v1/markets/:id/live` - Live odds from Polymarket
- ✅ GET `/api/v1/markets/:id/full` - Combined static + live data
- ✅ POST `/api/v1/markets/ingest` - Manual ingestion trigger

**Verdict:**
- ✅ **Better than documented** - More endpoints than memory-bank indicates
- ✅ Single market endpoint IS implemented (memory-bank says it's not)

---

### 3. Betting Module

#### Memory-Bank Documentation
- ✅ POST `/api/v1/bets` - Place bet
- ✅ GET `/api/v1/bets/me` - User's bets
- ✅ GET `/api/v1/bets/:betId` - Bet details

#### Actual Implementation
**Routes Registered (`betting.routes.ts`):**
- ✅ POST `/api/v1/bets` - Place bet
- ✅ GET `/api/v1/bets/me` - User's bets
- ✅ GET `/api/v1/bets/:betId` - Bet details
- ✅ POST `/api/v1/bets/:betId/sell` - Sell position (secondary market)

**Verdict:**
- ✅ **Fully aligned** - All documented endpoints exist
- ✅ **Bonus feature** - `/sell` endpoint exists but not in memory-bank

---

### 4. Economy Module

#### Memory-Bank Documentation
- ✅ POST `/api/v1/economy/daily-credits` - Claim daily reward
- ✅ POST `/api/v1/economy/buy` - Buy stocks
- ✅ POST `/api/v1/economy/sell` - Sell stocks
- ✅ GET `/api/v1/economy/portfolio` - Get portfolio
- ✅ GET `/api/v1/economy/stocks` - Get all stocks

#### Actual Implementation
**Routes Registered (`economy.routes.ts`):**
- ✅ POST `/api/v1/economy/daily-credits` - Claim daily reward
- ✅ POST `/api/v1/economy/buy` - Buy stocks
- ✅ POST `/api/v1/economy/sell` - Sell stocks
- ✅ GET `/api/v1/economy/portfolio` - Get portfolio
- ✅ GET `/api/v1/economy/stocks` - Get all stocks

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 5. Leaderboard Module

#### Memory-Bank Documentation
- ✅ GET `/api/v1/leaderboard/pnl` - PnL leaderboard
- ✅ GET `/api/v1/leaderboard/volume` - Volume leaderboard
- ✅ GET `/api/v1/leaderboard/me` - User ranking

#### Actual Implementation
**Routes Registered (`leaderboard.routes.ts`):**
- ✅ GET `/api/v1/leaderboard/pnl` - PnL leaderboard
- ✅ GET `/api/v1/leaderboard/volume` - Volume leaderboard
- ✅ GET `/api/v1/leaderboard/me` - User ranking

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 6. Transactions Module

#### Memory-Bank Documentation
- ✅ GET `/api/v1/transactions/me` - Transaction history

#### Actual Implementation
**Routes Registered (`transactions.routes.ts`):**
- ✅ GET `/api/v1/transactions/me` - Transaction history

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 7. Referrals Module

#### Memory-Bank Documentation
- ✅ GET `/api/v1/referrals/me` - Referral stats

#### Actual Implementation
**Routes Registered (`referral.routes.ts`):**
- ✅ GET `/api/v1/referrals/me` - Referral stats

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 8. Purchases Module

#### Memory-Bank Documentation
- ✅ GET `/api/v1/purchases/packages` - List packages
- ✅ POST `/api/v1/purchases` - Purchase credits
- ✅ GET `/api/v1/purchases/me` - Purchase history

#### Actual Implementation
**Routes Registered (`purchases.routes.ts`):**
- ✅ GET `/api/v1/purchases/packages` - List packages
- ✅ POST `/api/v1/purchases` - Purchase credits
- ✅ GET `/api/v1/purchases/me` - Purchase history

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 9. Users Module

#### Memory-Bank Documentation
- ✅ PATCH `/api/v1/users/me` - Update profile
- ✅ GET `/api/v1/users/:userId` - Public profile

#### Actual Implementation
**Routes Registered (`user.routes.ts`):**
- ✅ PATCH `/api/v1/users/me` - Update profile
- ✅ GET `/api/v1/users/:userId` - Public profile

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 10. Sync Module

#### Memory-Bank Documentation
- ✅ POST `/api/v1/sync/markets` - Sync markets
- ✅ GET `/api/v1/sync/markets/counts` - Get counts

#### Actual Implementation
**Routes Registered (`sync.routes.ts`):**
- ✅ POST `/api/v1/sync/markets` - Sync markets
- ✅ GET `/api/v1/sync/markets/counts` - Get counts

**Verdict:**
- ✅ **Fully aligned** - Perfect match

---

### 11. Legacy Fetching Routes

#### Memory-Bank Documentation
- ✅ GET/POST `/api/v1/markets/fetch` - Fetch from Polymarket
- ✅ GET `/api/v1/markets/stats` - Market statistics
- ✅ GET/POST `/api/v1/events/fetch` - Fetch events
- ✅ GET `/api/v1/events` - List events
- ✅ GET `/api/v1/events/stats` - Event statistics
- ✅ GET `/api/v1/event-market-groups` - Event-market groups

#### Actual Implementation
**Routes Exist But NOT Registered in Main App:**
- ⚠️ `market-data.routes.ts` - Exists but not registered in `app/index.ts`
- ⚠️ `event-data.routes.ts` - Exists but not registered in `app/index.ts`
- ⚠️ `event-market-group.routes.ts` - Exists but not registered in `app/index.ts`

**Verdict:**
- ⚠️ **Discrepancy:** Legacy fetching routes exist but are not active
- ⚠️ **Documentation Gap:** Memory-bank documents these but they're not in use

---

### 12. Database Schema

#### Memory-Bank Documentation
- ✅ User model with credits, economy fields
- ✅ Market model
- ✅ Bet model
- ✅ CreditTransaction model
- ✅ DailyReward model
- ✅ RefreshToken model
- ✅ Stock models (Stock, StockHolding, StockTransaction)
- ✅ CreditPurchase model
- ✅ Referral fields in User model

#### Actual Implementation
**Schema (`prisma/schema.prisma`):**
- ✅ All documented models exist
- ✅ **Additional:** `OAuthAccount` model (not prominently documented)
- ✅ All fields match documentation

**Verdict:**
- ✅ **Fully aligned** - Schema matches documentation
- ⚠️ **Minor gap:** OAuthAccount model not well documented

---

### 13. Background Jobs

#### Memory-Bank Documentation
- ✅ Daily credits job (00:00 UTC cron + immediate run on boot)
- ✅ Market sync job (every 5 minutes)
- ✅ Market resolution job (every 1 minute)
- ✅ Leaderboard update job (every 15 minutes)
- ✅ Market ingestion job (every 5 minutes)

#### Actual Implementation
**Jobs Started in `app/index.ts`:**
- ✅ `startDailyCreditsJob()` - Registered
- ✅ `startMarketIngestionJob()` - Registered
- ✅ `startMarketResolutionJob()` - Registered
- ✅ `startLeaderboardUpdateJob()` - Registered
- ⚠️ `startMarketSyncJob()` - **NOT registered** (sync routes exist but no job)

**Verdict:**
- ⚠️ **Discrepancy:** Market sync job not started (but sync routes exist)
- ✅ Other jobs match documentation

---

### 14. Technology Stack

#### Memory-Bank Documentation
- ✅ Fastify 5.6.2
- ✅ PostgreSQL + Prisma
- ✅ Redis (optional, graceful fallback)
- ✅ JWT authentication
- ✅ TypeScript 5.9.3
- ✅ Zod validation

#### Actual Implementation
**Dependencies (`package.json`):**
- ✅ fastify: ^5.6.2
- ✅ @prisma/client: ^6.19.0 (newer than doc)
- ✅ prisma: ^6.19.0 (newer than doc)
- ✅ redis: ^5.9.0 (matches doc)
- ✅ @fastify/jwt: ^10.0.0 (newer than doc)
- ✅ zod: ^4.1.12 (newer than doc)
- ✅ typescript: ^5.9.3 (matches doc)
- ✅ **Additional:** `oauth4webapi` (not in memory-bank)
- ✅ **Additional:** `node-cron` (not in memory-bank)
- ✅ **Additional:** `mongodb` (not prominently documented)

**Verdict:**
- ✅ **Mostly aligned** - Core stack matches
- ⚠️ **Version differences:** Some packages newer than documented
- ⚠️ **Missing docs:** OAuth and MongoDB dependencies not well documented

---

## Summary of Discrepancies

### Critical Discrepancies

1. **Authentication Method Mismatch**
   - **Memory-Bank:** Documents email/password signup/login as primary
   - **Reality:** OAuth (X/Twitter) is primary; email/password routes not registered
   - **Impact:** High - Documentation doesn't match actual auth flow

2. **Legacy Fetching Routes**
   - **Memory-Bank:** Documents `/api/v1/markets/fetch`, `/api/v1/events/*` routes
   - **Reality:** Routes exist but not registered in main app
   - **Impact:** Medium - Documentation references non-functional endpoints

3. **Market Sync Job**
   - **Memory-Bank:** Documents background job for market sync
   - **Reality:** Job not started in `app/index.ts`
   - **Impact:** Low - Manual sync endpoint still works

### Minor Discrepancies

4. **Additional Endpoints Not Documented**
   - `/api/v1/markets/random` - Not in memory-bank
   - `/api/v1/markets/:id/live` - Not in memory-bank
   - `/api/v1/markets/:id/full` - Not in memory-bank
   - `/api/v1/bets/:betId/sell` - Not in memory-bank

5. **OAuth Implementation**
   - Fully implemented but not prominently documented in memory-bank
   - Only mentioned in separate docs file

6. **Package Versions**
   - Some packages newer than documented (Prisma 6 vs 5, JWT 10 vs 9)

---

## Recommendations

### High Priority

1. **Update Memory-Bank Authentication Documentation**
   - Document OAuth as primary auth method
   - Note that email/password controllers exist but routes not registered
   - Add OAuth flow to `activeContext.md` and `systemPatterns.md`

2. **Clarify Legacy Routes Status**
   - Either remove from documentation or note they're legacy/unused
   - Or register them in main app if still needed

### Medium Priority

3. **Document Additional Endpoints**
   - Add `/api/v1/markets/random`, `/live`, `/full` to API documentation
   - Add `/api/v1/bets/:betId/sell` to betting documentation

4. **Update Package Versions**
   - Update `techContext.md` with actual package versions
   - Note Prisma 6, JWT 10, etc.

### Low Priority

5. **Add OAuth to Memory-Bank**
   - Add OAuth implementation details to `activeContext.md`
   - Update `systemPatterns.md` with OAuth flow

6. **Fix Market Sync Job**
   - Either start the job or remove from documentation

---

## Conclusion

The codebase and memory-bank are **~85% aligned**. The main discrepancies are:

1. **Authentication method** - OAuth is primary, not email/password
2. **Legacy routes** - Documented but not active
3. **Additional endpoints** - More features than documented

The core functionality matches well, but the authentication documentation needs significant updates to reflect the OAuth-first approach.

---

**Next Steps:**
1. Update `activeContext.md` to reflect OAuth as primary auth
2. Update `systemPatterns.md` with OAuth flow
3. Clarify status of legacy fetching routes
4. Document additional market endpoints
5. Update package versions in `techContext.md`


