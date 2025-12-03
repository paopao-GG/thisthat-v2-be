# [V1.0.11] - 2025-01-XX - Polymarket Ingestion Scaling

### ✅ Added - Multi-page ingestion & smarter categorisation
- **Pagination Support**
  - Market ingestion now pages through the Polymarket Gamma API in batches (default 50) until it hits `MARKET_INGEST_LIMIT` (default 1000).
  - Automatically increases the fetch window when a category filter is applied (up to 10x) and stops early if the API stops returning results.
  - Ensures the `markets` table is saturated with fresh static data so the frontend never falls back to mock markets.

- **Category Enhancements**
  - Expanded keyword detection (elections, business, international, technology, science, etc.) to improve downstream category filters.
  - Filtering now happens **after** the new category is assigned, reducing false negatives.

### 🔧 Changed
- Added environment variables `MARKET_INGEST_LIMIT` (default 1000) and optional `POLYMARKET_PAGE_SIZE` for tuning batch sizes.
- Updated ingestion logs for better observability (batch offsets, filtered totals, category info).
- `scripts/test-ingestion.ts` now exercises the pagination logic to validate local setups.

# Changelog

All notable changes to the THISTHAT Backend project will be documented in this file.

## [V1.0.10] - 2025-01-XX - Database Separation & Frontend Integration

### ✅ Added - Database Separation
- **Two PostgreSQL Databases**
  - Created `thisthat_markets` database for market data storage
  - Created `thisthat_users` database for user data, bets, and transactions
  - Complete separation of concerns for scalability

- **Prisma Schema Split**
  - `schema.markets.prisma` - Market model with markets database connection
  - `schema.users.prisma` - User, Bet, CreditTransaction, OAuthAccount, Referral, Purchase models
  - Separate Prisma client generation for each database

- **Database Client Updates**
  - `marketsPrisma` client for market operations
  - `usersPrisma` client for user/bet/transaction operations
  - Updated all services to use correct database client:
    - `markets.services.ts` - Uses `marketsPrisma`
    - `betting.services.ts` - Uses both clients (markets for lookup, users for bets)
    - `market-resolution.services.ts` - Uses both clients
    - All auth, user, economy, transaction services - Use `usersPrisma`

- **MongoDB Removal**
  - Completely removed MongoDB dependency
  - Removed `mongodb` package from `package.json`
  - Deleted `src/lib/mongodb.ts`
  - Converted MongoDB sync functions to no-op with deprecation warnings
  - All market data now stored in PostgreSQL

- **Migration Documentation**
  - Created `MIGRATION_NOTES.md` with detailed migration steps
  - Created `docs/CREATE_DATABASES.md` with database creation guide
  - Created `docs/CREATE_DATABASES_WINDOWS.md` for Windows-specific instructions
  - Created PowerShell and Bash scripts for database creation

### ✅ Added - Frontend Market Integration
- **Removed Mock Data**
  - Removed mock data fallback from `BettingPage.tsx`
  - Frontend now exclusively uses real API data

- **Auto-Trigger Market Ingestion**
  - Frontend automatically triggers market ingestion when no markets found
  - Added loading states during ingestion
  - Prevents infinite loops with ref-based tracking

- **Market Type Mapping**
  - Fixed `marketType` mapping in `marketService.ts`:
    - `'polymarket'` or `'credits'` → `'binary'`
    - `'cross'` → `'two-image'`
  - Proper Decimal-to-number conversion for odds and liquidity

- **Improved Error Handling**
  - Clear error messages when markets unavailable
  - Retry logic after ingestion completes
  - Better loading states for ingestion process

### 🔧 Changed
- **Environment Variables**
  - Added `MARKETS_DATABASE_URL` for markets database connection
  - Added `USERS_DATABASE_URL` for users database connection
  - `DATABASE_URL` kept as legacy alias to `USERS_DATABASE_URL`
  - Removed `MONGODB_URL` and `MONGODB_DB_NAME`

- **Package Scripts**
  - Updated `db:generate` to generate both Prisma clients
  - Updated `db:push` to push both schemas

### 📝 Documentation
- Added comprehensive migration documentation
- Added database creation guides for multiple platforms
- Updated environment variable documentation

## [V1.0.9] - 2025-01-XX - Error Handling & Failover

### ✅ Added - Comprehensive Error Handling
- **Circuit Breaker Pattern**
  - Implemented for external API calls (Polymarket)
  - Prevents cascading failures
  - Automatic recovery after cooldown period

- **Retry Logic with Exponential Backoff**
  - Retry utilities in `src/lib/retry.ts`
  - Configurable retry attempts and delays
  - Applied to all critical operations

- **Structured Error Responses**
  - Standardized error response format
  - Error classification (network, rate limit, validation, database, etc.)
  - Detailed error information for debugging

- **Graceful Degradation**
  - Fallback to cached/stored data when external APIs fail
  - Transaction rollback on betting failures
  - Circuit breaker protection for Polymarket API

### 🔧 Changed
- Enhanced all controllers with consistent error handling
- Polymarket client wrapped with circuit breaker and retry logic
- Improved error messages and logging

## [V1.0.8] - 2025-01-XX - Rate Limiting Implementation

### ✅ Added - Rate Limiting System
- **Rate Limiting Package**
  - Installed `@fastify/rate-limit` plugin
  - Integrated with Fastify application

- **Configuration Module**
  - Created `backend/src/lib/rate-limit.config.ts`
  - Different rate limit configurations for different endpoint types:
    - Critical processes: 30 requests/minute (betting, economy, purchases)
    - Auth endpoints: 10 requests/15 minutes (prevents brute force)
    - Standard endpoints: 100 requests/minute (general API)
    - External API calls: 5 requests/minute (market ingestion)
    - Background jobs: 1 request/minute (internal jobs)

- **Per-User Rate Limiting**
  - Uses user ID if authenticated, IP address otherwise
  - Prevents abuse from individual users
  - Distributed rate limiting via Redis (if available)

- **Redis Integration**
  - Uses Redis for distributed rate limiting when available
  - Graceful fallback to in-memory storage if Redis unavailable
  - Automatic detection and configuration

- **Route Group Protection**
  - Global rate limit: 100 req/min (standard endpoints)
  - Auth routes: 10 req/15min (stricter)
  - Betting routes: 30 req/min (critical)
  - Economy routes: 30 req/min (critical)
  - Purchase routes: 30 req/min (critical)
  - Market ingestion: 5 req/min (external API)

- **Environment Configuration**
  - All rate limits configurable via environment variables
  - Updated `env.template` with rate limiting configuration
  - Default values provided for all limits

- **Error Responses**
  - Rate limit errors include retry-after information
  - Clear error messages for rate limit exceeded
  - Limit and remaining count in response headers

### 🔒 Security Improvements
- Protection against DDoS attacks
- Prevention of brute force attacks on auth endpoints
- Rate limiting for critical financial operations
- External API call protection

### 📝 Files Modified
- `backend/package.json` - Added `@fastify/rate-limit` dependency
- `backend/src/lib/rate-limit.config.ts` - New configuration module
- `backend/src/app/index.ts` - Registered rate limiting plugins
- `backend/src/features/markets/markets.routes.ts` - Applied to ingestion endpoint
- `backend/env.template` - Added rate limiting configuration variables

## [V1.0.7] - 2025-01-XX - Leaderboard Page Functional

### ✅ Added - Leaderboard Service
- **New Service File**
  - Created `frontend/src/shared/services/leaderboardService.ts`
  - `getPnLLeaderboard(limit, offset)` - Fetches PnL leaderboard from backend
  - `getVolumeLeaderboard(limit, offset)` - Fetches Volume leaderboard from backend
  - `getUserRanking(type)` - Gets current user's ranking (PnL or Volume)
  - Connects to `/api/v1/leaderboard/pnl` and `/api/v1/leaderboard/volume` endpoints

### ✅ Added - Leaderboard Page Integration
- **Real API Integration**
  - `frontend/src/app/pages/LeaderboardPage.tsx` - Replaced mock data with real API calls
  - Fetches data from backend based on sort type (PnL or Volume)
  - Maps backend response format to frontend format
  - Added loading and error states
  - Defaults to PnL leaderboard on page load

### ✅ Added - Leaderboard Table Enhancements
- **PnL Column**
  - Added PnL column with color coding (green for positive, red for negative)
  - Displays PnL with +/- prefix
  - Shows alongside Volume and $THIS token allocation columns
- **Sorting**
  - Made both PnL and Volume columns sortable
  - Updated types to support `'pnl' | 'volume'` sorting
  - Sort order (asc/desc) toggleable

### ✅ Fixed - UI Issues
- **Snackbar Spacing**
  - Fixed unequal spacing in time filter buttons (Today, Weekly, Monthly, All)
  - Standardized button padding: `px-2 sm:px-3` for all buttons (was inconsistent)
  - Removed duplicate className attributes that caused styling issues
  - All buttons now use consistent `time-filter-button` class

## [V1.0.6] - 2025-01-XX - Profile Page PnL & Statistics Complete

### ✅ Added - PnL Calculations
- **Real-time PnL Calculation**
  - Calculates PnL from bet data based on time filter (1D, 1W, 1M, ALL)
  - Only includes realized PnL (won/lost bets, excludes pending)
  - Color-coded display (green for positive, red for negative)
  - Updates dynamically when time filter changes
  - Uses `useMemo` for performance optimization

- **Position Value Calculation**
  - Sum of potential payouts from pending bets
  - Includes refunded amounts from cancelled bets
  - Displays in credits format

- **Biggest Win Calculation**
  - Maximum profit from won bets
  - Calculated from actual payouts
  - Updates based on time filter

- **Predictions Count**
  - Total bets count within selected time period
  - Updates when time filter changes

- **Win Rate Calculation**
  - Calculated as: (wins / (wins + losses)) × 100
  - Only includes closed bets (won/lost)
  - Updates based on time filter

### ✅ Added - Functional PnL Graph
- **Dynamic Chart Generation**
  - Calculates cumulative PnL over time from bet data
  - Filters bets by time period (1D, 1W, 1M, ALL)
  - Sorts bets chronologically to build timeline
  - Normalizes PnL values to fit chart (handles positive/negative)

- **Visual Features**
  - Smooth quadratic curves for transitions
  - Gradient fill area under the line
  - Data point markers (10 for desktop, 8 for mobile)
  - Peak point indicator (highest PnL)
  - Zero line (break-even) when PnL goes negative
  - Responsive design (separate markers for desktop/mobile)

- **Edge Case Handling**
  - Handles no bets (flat line)
  - Handles single bet
  - Handles all same PnL values
  - Proper normalization for positive/negative ranges

### ✅ Fixed
- Duplicate `zeroLineY` declaration error
- PnL calculation now properly excludes pending bets from realized PnL
- Position value calculation includes pending bets correctly

## [V1.0.5] - 2025-01-XX - Daily Reward System Frontend Integration

### ✅ Added - Daily Credits Frontend Integration
- **Economy Service**
  - Created `frontend/src/shared/services/economyService.ts` with `claimDailyCredits()` function
  - Fixed 400 Bad Request error by sending empty body `{}` for POST requests (Fastify requirement)
  - Proper TypeScript interfaces for API responses

- **DailyCreditsSection Component**
  - Updated to use real API calls instead of mock data
  - Proper error handling and loading states
  - Handles "already claimed today" case gracefully (creditsAwarded: 0)
  - Shows current streak and next streak amount dynamically
  - Max streak indicator (18+ days = 10,000 credits/day)
  - Auto-refresh user data after claiming credits

- **UTC Reset Logic Fixed**
  - Frontend UTC midnight calculation in `creditSystem.ts` matches backend exactly
  - Proper day difference calculation for streak tracking
  - Countdown timer shows correct time until next claim (00:00 UTC)
  - Fixed `getNextClaimTime()` and `isClaimAvailable()` functions

- **User Data Integration**
  - `HomePage.tsx` now uses real user data (`consecutiveDaysOnline`, `lastDailyRewardAt`)
  - `ProfilePage.tsx` passes real `lastClaimDate` to components
  - `User` type in `authService.ts` updated to include `lastDailyRewardAt` field
  - Auto-refresh user data after claiming to update balance and streak

### ✅ Fixed
- 400 Bad Request error when claiming daily credits (Fastify requires body for POST requests)
- UTC reset logic in frontend now matches backend exactly
- Streak display now shows correct values based on real user data

## [V1.0.4] - 2025-01-XX - Betting/Swiping Integration & Profile Enhancements

### ✅ Added - Betting/Swiping Integration
- **SwipeableCard Component Integration**
  - Swiping left/right now opens bet amount modal instead of auto-advancing
  - Integrated `placeBet` API call within the modal's "Bet" button
  - Real-time credit balance updates after successful bet placement
  - Error handling and loading states during bet placement
  - Markets are only marked as swiped after successful bet placement (not on initial swipe gesture)

- **SwipedMarketsContext**
  - Created global React Context to track swiped market IDs
  - Persists swiped markets in localStorage across navigation
  - Prevents swiped markets from reappearing when navigating back to betting page
  - Provides `addSwipedMarket`, `clearSwipedMarkets` functions
  - Integrated into App.tsx as global provider

- **Market Fetching Improvements**
  - Enhanced `marketService.ts` to handle both MongoDB (legacy) and PostgreSQL endpoints
  - Proper status conversion: MongoDB uses 'active', PostgreSQL uses 'open'
  - Fallback logic: tries MongoDB first, then PostgreSQL
  - Improved `convertBackendMarket` function to handle both data structures
  - Default odds (0.5) and liquidity (0) for MongoDB markets (lazy loading architecture)

- **BettingPage Enhancements**
  - Fetches real markets from backend using `marketService.getMarkets`
  - Filters out swiped markets using `SwipedMarketsContext`
  - Passes `maxCredits` from AuthContext to SwipeableCard
  - Implements `handleBetPlaced` callback to refresh user credits
  - Displays loading, error, and empty states
  - Fallback to mock data if backend call fails

### ✅ Added - Profile Page Real Bet Data
- **Positions/Previous Activity Integration**
  - Fetches real user bets from backend using `betService.getUserBets`
  - Converts backend bet data into `Position` format for PositionsTable
  - Calculates PnL, value, and percentages for each position
  - Filters bets into 'active' (pending) and 'closed' (won/lost/cancelled) positions
  - Stores all fetched bets in `activity` state for "Previous Activity" tab
  - Optimized fetching to avoid redundant API calls

- **Bet Data Conversion**
  - Maps backend bet status to frontend position status
  - Calculates potential payout: `betAmount / odds`
  - Handles won/lost/pending/cancelled states
  - Displays market title, prediction side, shares, average price, current price
  - Shows PnL and PnL percentage for each position

### 🔧 Fixed
- Swiped markets no longer reappear after navigation (fixed via SwipedMarketsContext)
- Profile page now displays real bet data instead of mock positions
- Market fetching handles both MongoDB and PostgreSQL data structures correctly
- Status parameter conversion between frontend ('open') and backend ('active'/'open')

### 📊 Status
- **V1 Backend:** ✅ 100% Complete
- **V1 Frontend:** ✅ ~99% Complete (betting/swiping fully integrated, profile showing real data)
- **Overall V1:** ✅ Production-ready

---

## [V1.0.3] - 2025-11-26 - Frontend Authentication Integration

### ✅ Added - Frontend Authentication System
- **AuthContext & API Services**
  - Created `AuthContext` for global authentication state management
  - Created `api.ts` service for authenticated API requests with automatic token refresh
  - Created `authService.ts` for authentication operations (getCurrentUser, logout, refreshToken)
  - Handles token storage in localStorage
  - Automatic token refresh on 401 errors
  
- **Route Protection**
  - Created `RequireAuth` component to protect routes requiring authentication
  - All `/app/*` routes now require authentication
  - Automatic redirect to login if not authenticated
  - Loading states during authentication checks

- **Profile Page Integration**
  - ProfilePage now fetches and displays real user data from `/api/v1/auth/me`
  - Shows real user credits, username, stats, and referral code
  - Added logout button with proper session termination
  - Loading and error states for better UX
  - Converts backend user data to frontend UserStats format

- **TopBar Updates**
  - Displays real user credits from AuthContext instead of mock data
  - Updates automatically when user data changes

- **AuthCallback Updates**
  - Improved token handling and storage
  - Better error handling for OAuth failures
  - Automatic user data fetch after successful login

### 🔧 Fixed
- API response parsing to handle backend format `{ success: true, user: {...} }`
- Token refresh logic for expired access tokens
- Error handling in authentication flow

### 📊 Status
- **V1 Backend:** ✅ 100% Complete
- **V1 Frontend:** ✅ ~98% Complete (authentication fully integrated)
- **Overall V1:** ✅ Production-ready

---

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
