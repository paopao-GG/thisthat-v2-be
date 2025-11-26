# Missing Backend Endpoints for Frontend Integration

This document lists the endpoints that the frontend needs but are **not yet implemented** in the backend.

## 🔴 Critical Missing Endpoints

### 1. Markets Endpoints (HIGH PRIORITY)

The backend has `markets.services.ts` with all the logic, but **no routes are registered**. These endpoints are documented but not exposed:

#### Missing Routes:
- ❌ `GET /api/v1/markets/random?count=10` - Get random markets for betting page
- ❌ `GET /api/v1/markets/categories` - Get list of all categories for filter dropdown
- ❌ `GET /api/v1/markets/category/:category?limit=20` - Get markets by category
- ❌ `GET /api/v1/markets/:id` - Get single market details
- ❌ `GET /api/v1/markets/:id/live` - Get live odds/prices for a market
- ❌ `GET /api/v1/markets/batch-live?ids=id1,id2,id3` - Batch fetch live prices (max 20 markets)
- ❌ `GET /api/v1/markets/:id/full` - Get market with static + live data combined

**Status:** Services exist in `backend/src/features/markets/markets.services.ts`, but no routes/controllers are registered in `backend/src/app/index.ts`

**Frontend Usage:**
- `BettingPage.tsx` - Needs random markets and category filtering
- `CategoryFilter.tsx` - Needs categories list
- `SwipeableCard.tsx` - Needs live odds for display

---

## 🟡 Partially Implemented / Needs Verification

### 2. User Profile Endpoints

**Frontend Needs:**
- ✅ `GET /api/v1/users/:userId` - Exists (public route)
- ✅ `GET /api/v1/auth/me` - Exists (returns user profile)
- ❓ `GET /api/v1/users/me/stats` - User stats (credits, volume, PnL, rank, winRate, etc.)
- ❓ `GET /api/v1/users/me/positions` - User's active positions/bets with PnL

**Status:** Basic user endpoints exist, but may need additional stats/positions endpoints

**Frontend Usage:**
- `ProfilePage.tsx` - Needs user stats and positions table
- `TopBar.tsx` - Needs user credits and streak

---

### 3. Betting Endpoints

**Frontend Needs:**
- ✅ `POST /api/v1/bets` - Exists (place bet)
- ✅ `GET /api/v1/bets/me` - Exists (get user bets)
- ✅ `GET /api/v1/bets/:betId` - Exists (get single bet)
- ❓ `GET /api/v1/bets/me/positions` - User's active positions (bets that haven't resolved)
- ❓ `GET /api/v1/bets/me/history` - Bet history with filters (time, status)

**Status:** Basic betting endpoints exist, but may need positions/history endpoints

**Frontend Usage:**
- `ProfilePage.tsx` - Needs positions table and activity history
- `BettingPage.tsx` - Needs to place bets

---

### 4. Leaderboard Endpoints

**Frontend Needs:**
- ✅ `GET /api/v1/leaderboard/volume` - Exists (volume leaderboard)
- ✅ `GET /api/v1/leaderboard/pnl` - Exists (PnL leaderboard)
- ✅ `GET /api/v1/leaderboard/me` - Exists (user ranking)
- ❓ `GET /api/v1/leaderboard/volume?timeFilter=today|weekly|monthly|all` - Time-filtered leaderboards
- ❓ `GET /api/v1/leaderboard/pnl?timeFilter=today|weekly|monthly|all` - Time-filtered leaderboards
- ❓ `GET /api/v1/leaderboard/volume?category=crypto` - Category-filtered leaderboards

**Status:** Basic leaderboard endpoints exist, but may need time/category filters

**Frontend Usage:**
- `LeaderboardPage.tsx` - Has time filter and category filter UI, but backend may not support them

---

### 5. Economy/Daily Credits Endpoints

**Frontend Needs:**
- ✅ `POST /api/v1/economy/daily-credits` - Exists (claim daily credits)
- ❓ `GET /api/v1/economy/daily-credits/status` - Get claim status (streak, next claim time, claimable amount)

**Status:** Claim endpoint exists, but may need status endpoint for better UX

**Frontend Usage:**
- `DailyCreditsSection.tsx` - Currently uses mock data for streak and claim status
- `HomePage.tsx` - Needs daily streak and claim availability

---

### 6. Referrals Endpoints

**Frontend Needs:**
- ✅ `GET /api/v1/referrals/me` - Exists (referral stats)
- ❓ `POST /api/v1/referrals/generate-code` - Generate referral code (if not auto-generated)
- ❓ `GET /api/v1/referrals/validate/:code` - Validate referral code before signup

**Status:** Basic referral endpoint exists

**Frontend Usage:**
- `ProfilePage.tsx` - Shows referral code and stats
- `ReferralModal.tsx` - Displays referral information

---

### 7. Purchases Endpoints

**Frontend Needs:**
- ✅ `GET /api/v1/purchases/packages` - Exists (list credit packages)
- ✅ `POST /api/v1/purchases` - Exists (create purchase)
- ✅ `GET /api/v1/purchases/me` - Exists (list user purchases)
- ❓ `POST /api/v1/purchases/stripe/create-intent` - Create Stripe payment intent (if using Stripe)
- ❓ `POST /api/v1/purchases/stripe/webhook` - Stripe webhook handler

**Status:** Basic purchase endpoints exist, but payment integration may be missing

**Frontend Usage:**
- `ProfilePage.tsx` - Shows purchase options (currently mock)

---

### 8. Transactions Endpoints

**Frontend Needs:**
- ✅ `GET /api/v1/transactions/me` - Exists (get user transactions)
- ❓ `GET /api/v1/transactions/me?type=credit|bet|purchase|referral` - Filter by transaction type
- ❓ `GET /api/v1/transactions/me?timeFilter=1D|1W|1M|ALL` - Filter by time period

**Status:** Basic transaction endpoint exists, but may need filters

**Frontend Usage:**
- `ProfilePage.tsx` - Activity tab (currently shows "coming soon")

---

## 📋 Summary by Priority

### 🔴 **CRITICAL - Must Implement First:**
1. **Markets Routes** - All market endpoints (random, categories, category/:category, batch-live)
   - Services exist, just need routes/controllers
   - Required for: BettingPage, CategoryFilter

### 🟡 **HIGH PRIORITY - Needed for Core Features:**
2. **User Stats Endpoint** - `GET /api/v1/users/me/stats` or enhance `/auth/me`
   - Required for: ProfilePage, TopBar
3. **User Positions Endpoint** - `GET /api/v1/bets/me/positions`
   - Required for: ProfilePage positions table
4. **Daily Credits Status** - `GET /api/v1/economy/daily-credits/status`
   - Required for: DailyCreditsSection, HomePage

### 🟢 **MEDIUM PRIORITY - Enhancements:**
5. **Leaderboard Filters** - Add timeFilter and categoryFilter query params
   - Required for: LeaderboardPage filters
6. **Bet History** - `GET /api/v1/bets/me/history` with filters
   - Required for: ProfilePage activity tab
7. **Transaction Filters** - Add type and timeFilter query params
   - Required for: ProfilePage activity tab

### 🔵 **LOW PRIORITY - Future Features:**
8. **Payment Integration** - Stripe endpoints for credit purchases
   - Required for: Credit purchase flow (marked as "final feature to implement")

---

## 🔧 Implementation Notes

### Markets Routes Implementation

The markets services already exist. You need to:

1. Create `backend/src/features/markets/markets.controllers.ts`
2. Create `backend/src/features/markets/markets.routes.ts`
3. Register routes in `backend/src/app/index.ts`:
   ```typescript
   import marketsRoutes from '../features/markets/markets.routes.js';
   // ...
   await fastify.register(marketsRoutes, { prefix: '/api/v1/markets' });
   ```

### User Stats Endpoint

Either:
- Enhance `GET /api/v1/auth/me` to include all stats, OR
- Create `GET /api/v1/users/me/stats` that aggregates:
  - Credits from credit ledger
  - Total volume from bets
  - Total PnL from resolved bets
  - Rank from leaderboard
  - Win rate from bets
  - Daily streak from economy

### Positions Endpoint

Create `GET /api/v1/bets/me/positions` that:
- Returns active bets (status: 'pending' or 'open')
- Calculates current PnL based on live market prices
- Includes market information
- Formats as positions table data

---

## 📝 Testing Checklist

After implementing missing endpoints, verify:

- [ ] `GET /api/v1/markets/random` returns markets
- [ ] `GET /api/v1/markets/categories` returns category list
- [ ] `GET /api/v1/markets/category/:category` filters correctly
- [ ] `GET /api/v1/markets/batch-live` returns live prices
- [ ] `GET /api/v1/users/me/stats` returns complete user stats
- [ ] `GET /api/v1/bets/me/positions` returns active positions with PnL
- [ ] `GET /api/v1/economy/daily-credits/status` returns claim status
- [ ] Leaderboard endpoints support timeFilter and categoryFilter

---

**Last Updated:** 2025-01-XX
**Status:** Frontend ready, backend needs market routes and some enhancements

