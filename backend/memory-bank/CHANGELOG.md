# Changelog

All notable changes to the THISTHAT Backend project will be documented in this file.

## [V1.0.2] - 2025-01-XX - Referrals & Credit Purchases

### ✅ Added - Referral System
- **Referral Codes**
  - Optional referral codes on user signup
  - 8-character alphanumeric codes generated automatically
  - Awards +200 credits to referrer when new user signs up
  - Tracks referral count and total credits earned
- **Referral Endpoints**
  - GET /api/v1/referrals/me - Get referral stats and recent referrals
  - Returns referral code, count, credits earned, and list of referred users
- **Frontend Integration**
  - Profile page displays referral code with copy functionality
  - Shows referral stats (count, credits earned)
  - Displays recent referrals list

### ✅ Added - Credit Purchase System
- **Credit Packages**
  - Starter: 500 credits ($4.99)
  - Boost: 1,000 credits ($9.99)
  - Pro: 2,500 credits ($19.99)
  - Whale: 5,000 credits ($34.99)
- **Purchase Endpoints**
  - GET /api/v1/purchases/packages - List available credit packages
  - POST /api/v1/purchases - Purchase credits (simulated settlement for V1)
  - GET /api/v1/purchases/me - Get purchase history
- **Transaction Logging**
  - All purchases logged in credit_transactions table
  - SHA-256 transaction signing
  - Balance updates are atomic
- **Frontend Integration**
  - Purchase cards on profile page
  - Purchase history display
  - Real-time balance updates

### 🔧 Changed
- Daily credits job now runs at 00:00 UTC (cron schedule) with immediate run on boot for testing
- Daily credits formula: 1000 start, +500/day up to 10,000 max (18-day streak)
- UTC midnight reset logic implemented

### 📊 Status
- **V1 Backend:** ✅ 100% Complete (all features implemented)
- **V1 Frontend:** ✅ ~95% Complete (core features done)
- **Overall V1:** ✅ Production-ready

---

## [V1.0.1] - 2025-01-XX - Unit Test Suite Complete

### ✅ Added - Comprehensive Unit Test Suite
- **Complete V1 Test Coverage**
  - 222 unit tests covering all V1 features
  - Tests for all services and controllers
  - Auth, Users, Betting, Economy, Leaderboard, Transactions, Market Resolution
  - 100% test file pass rate (19/19 files)
  
- **Test Structure**
  - Created `__tests__` folders in each feature directory
  - Service tests and controller tests separated
  - Shared Prisma mock helper pattern
  - Proper mocking with `vi.hoisted()` for Vitest

### 🔧 Fixed - Mock Hoisting Issues
- **Problem:** 8 test files failing due to Vitest mock hoisting errors
  - Error: "Cannot access '__vi_import_X__' before initialization"
  - Caused by importing mock objects before `vi.mock()` factories
  
- **Solution:** Used `vi.hoisted()` pattern for all Prisma mocks
  - Created hoisted mock objects that are available during module hoisting
  - Removed top-level variable imports from mock factories
  - Applied to all 8 affected test files

### 📊 Test Results
- **Before Fix:** 8 failed test files, 148 passing tests
- **After Fix:** 19 passed test files, 222 passing tests
- **Coverage:** All V1 features fully tested

---

## [V1.0.0] - 2025-01-XX - V1 COMPLETE

### ✅ Added - V1 Completion
- **Market Resolution System**
  - Automatic market resolution from Polymarket API
  - Bet payout processing (win/loss/cancel)
  - Background job runs every 1 minute
  - User PnL updates automatically
  
- **Leaderboard System**
  - GET /api/v1/leaderboard/pnl - Top users by PnL
  - GET /api/v1/leaderboard/volume - Top users by volume
  - GET /api/v1/leaderboard/me - User's current ranking
  - Redis caching (5 min TTL, graceful fallback)
  - Ranking calculation job (runs every 15 min)
  - Frontend: User ranking snackbar at bottom
  - Frontend: User row highlighting in leaderboard
  
- **Credit Transactions**
  - GET /api/v1/transactions/me - User transaction history
  - Filtering and pagination support
  
- **Auth Completion**
  - POST /api/v1/auth/refresh - Token refresh endpoint
  - POST /api/v1/auth/logout - Logout and token invalidation
  
- **Daily Credits PRD Alignment**
  - Fixed formula: 1000 start, +500/day up to 10000 max (18-day streak)
  - Changed window from 5 minutes to 24 hours
  
- **Redis Setup**
  - Connection configured with graceful fallback
  - System works without Redis (just slower)
  - Used for leaderboard caching

### 🔧 Changed
- Daily credits formula updated to match PRD exactly
- Market resolution now automatic (no manual intervention needed)
- Leaderboard endpoints return real data from database
- Frontend leaderboard shows user ranking in snackbar

### 📊 Status
- **V1 Backend:** ✅ 100% Complete
- **V1 Frontend:** ✅ ~95% Complete (core features done)
- **Overall V1:** ✅ Production-ready

---

## 2025-01-XX - Economy & Betting Implementation

### ✅ User Module Complete
- PATCH /api/v1/users/me - Update user profile
- GET /api/v1/users/:userId - Get public user profile
- Frontend integration complete

### ✅ Betting Module Complete
- POST /api/v1/bets - Place bets with atomic transactions
- GET /api/v1/bets/me - Get user's bets with filters/pagination
- GET /api/v1/bets/:betId - Get bet details
- Payout calculation: betAmount / odds
- Credit deduction and transaction logging
- Frontend BettingPage connected to API
- ProfilePage shows last 10 bets

### ✅ Economy System Complete
- Daily credit allocation (100 + 10*consecutiveDays)
- Stock market trading with leverage (1x-10x)
- Transaction signing with SHA-256
- Background job for daily credits (5 min intervals for testing)
- Frontend StockMarketPage with full trading UI
- Daily reward button connected in ProfilePage

### ✅ MongoDB ↔ PostgreSQL Sync
- Automatic sync every 5 minutes
- Manual sync endpoint (POST /api/v1/sync/markets)
- Market counts endpoint (GET /api/v1/sync/markets/counts)
- Supports both UUID and conditionId lookups

### ✅ Frontend Updates
- LoginPage component added
- Daily reward button functional
- Bets history showing last 10 bets
- Stock Market page added
- Auto-refresh every 5 seconds

### 🔧 Configuration Changes
- Daily reward interval: 5 minutes (testing mode)
- Market sync interval: 5 minutes
- Profile auto-refresh: 5 seconds

### 📝 Next Steps
- Run database migrations (`npx prisma db push`)
- Implement Leaderboard Module
- Implement Market Resolution System
- Add unit tests for new modules
