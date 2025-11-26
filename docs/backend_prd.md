# THISTHAT Backend PRD - V1 (Credits System)

**Version:** 1.0
**Target Release:** M1-M2
**Status:** Pre-Development

---

## 1. Executive Summary

This document outlines the backend architecture and requirements for THISTHAT V1, focusing exclusively on the credits-based prediction market system. V1 serves as the foundation for gathering user metrics, validating product-market fit, and establishing core platform mechanics before introducing real-money (USDC) betting in V2.

**V1 Scope:**
- Credit-based economy (no real money)
- Admin-only market creation
- Polymarket API integration for market data
- User authentication and profiles
- Leaderboard and ranking system
- Daily reward distribution

**Out of Scope for V1:**
- Wallet integration (WalletConnect, MetaMask)
- USDC/real-money betting
- Creator-driven market creation
- Token ($THIS) economics
- KYC/compliance systems

---

## 2. Technical Stack

### Core Technologies
- **Runtime:** Node.js 20+ with TypeScript 5.9.3
- **Framework:** Fastify 5.6.2 (lightweight, high-performance)
- **Database:** PostgreSQL 15+ (relational data, ACID compliance)
- **Cache:** Redis 7+ (session management, leaderboards, rate limiting)
- **ORM:** Prisma 5+ (type-safe database access)
- **Authentication:** JWT (access/refresh token pattern)
- **API Documentation:** OpenAPI 3.0 / Swagger

### External Integrations
- **Polymarket Builder API** - Market data, odds, resolution
- **Stripe API** - In-app credit purchases (future enhancement)

### Infrastructure
- **Hosting:** TBD (AWS/GCP/Railway/Render)
- **Logging:** Pino (structured JSON logging)
- **Monitoring:** TBD (Sentry, DataDog, or similar)
- **CI/CD:** GitHub Actions

---

## 3. System Architecture

### High-Level Architecture

```
┌─────────────────┐
│   React Web     │
│   Frontend      │
└────────┬────────┘
         │ HTTPS/REST
         │
┌────────▼────────────────────────────────────┐
│         Fastify API Server                  │
│  ┌──────────────────────────────────────┐  │
│  │  Auth Module (JWT)                   │  │
│  │  User Module (Profiles, Credits)     │  │
│  │  Market Module (Ingestion, Display)  │  │
│  │  Betting Module (Placement, Payout)  │  │
│  │  Leaderboard Module (Rankings)       │  │
│  │  Rewards Module (Daily Login)        │  │
│  └──────────────────────────────────────┘  │
└────────┬─────────────────────┬──────────────┘
         │                     │
    ┌────▼─────┐        ┌─────▼──────┐
    │PostgreSQL│        │   Redis    │
    │(Primary) │        │  (Cache)   │
    └──────────┘        └────────────┘
         │
    ┌────▼────────────┐
    │  Polymarket API │
    │  (External)     │
    └─────────────────┘
```

### Module Breakdown

#### **3.1 Authentication Module**
- User registration (email/username + password)
- Login (JWT access + refresh tokens)
- Password reset flow
- Session management via Redis
- Rate limiting for auth endpoints

#### **3.2 User Module**
- User profile CRUD
- Credit balance tracking
- Transaction history
- Overall PnL calculation
- Total volume tracking
- User settings/preferences

#### **3.3 Market Module**
- Polymarket API integration
- Market data ingestion pipeline
- Market categorization (Credits, Polymarket, Cross)
- Market search and filtering
- Trending/ranking algorithm
- Market expiry and resolution handling

#### **3.4 Betting Module**
- Bet placement validation
- Credit deduction
- Bet confirmation
- Bet history tracking
- Payout calculation (mirrors Polymarket odds)
- Market resolution and credit distribution

#### **3.5 Leaderboard Module**
- User ranking by PnL
- User ranking by volume
- Creator ranking (placeholder for V2/V3)
- Real-time rank updates
- Leaderboard caching (Redis)

#### **3.6 Rewards Module**
- Daily login tracking
- Credit reward distribution
- Reward claim history
- Streak tracking (optional)

---

## 4. Database Schema

### 4.1 Core Tables

#### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  credit_balance DECIMAL(18, 2) DEFAULT 1000.00, -- Starting credits
  total_volume DECIMAL(18, 2) DEFAULT 0.00,
  overall_pnl DECIMAL(18, 2) DEFAULT 0.00,
  rank_by_pnl INTEGER,
  rank_by_volume INTEGER,
  last_daily_reward_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rank_pnl ON users(rank_by_pnl);
CREATE INDEX idx_users_rank_volume ON users(rank_by_volume);
```

#### **markets**
```sql
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polymarket_id VARCHAR(255) UNIQUE, -- Null for admin-created markets
  title VARCHAR(500) NOT NULL,
  description TEXT,
  this_option VARCHAR(255) NOT NULL,
  that_option VARCHAR(255) NOT NULL,
  this_odds DECIMAL(5, 4) NOT NULL, -- e.g., 0.6500 = 65%
  that_odds DECIMAL(5, 4) NOT NULL,
  liquidity DECIMAL(18, 2),
  category VARCHAR(100), -- e.g., 'Politics', 'Sports', 'Crypto'
  market_type VARCHAR(50) DEFAULT 'polymarket', -- 'credits', 'polymarket', 'cross'
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'resolved', 'cancelled'
  resolution VARCHAR(50), -- 'this', 'that', 'invalid'
  expires_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_type ON markets(market_type);
CREATE INDEX idx_markets_polymarket_id ON markets(polymarket_id);
```

#### **bets**
```sql
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  side VARCHAR(10) NOT NULL, -- 'this' or 'that'
  odds_at_bet DECIMAL(5, 4) NOT NULL, -- Odds when bet was placed
  potential_payout DECIMAL(18, 2) NOT NULL,
  actual_payout DECIMAL(18, 2), -- Null until resolved
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'cancelled'
  placed_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_placed_at ON bets(placed_at DESC);
```

#### **credit_transactions**
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL, -- Positive = credit, negative = debit
  transaction_type VARCHAR(50) NOT NULL, -- 'daily_reward', 'bet_placed', 'bet_payout', 'purchase'
  reference_id UUID, -- Bet ID or reward ID
  balance_after DECIMAL(18, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON bets(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
```

#### **daily_rewards**
```sql
CREATE TABLE daily_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_awarded DECIMAL(18, 2) DEFAULT 100.00,
  claimed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX idx_daily_rewards_claimed_at ON daily_rewards(claimed_at DESC);
```

#### **refresh_tokens**
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

## 5. API Endpoints

### 5.1 Authentication

#### POST `/api/v1/auth/register`
**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "creditBalance": 1000.00
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

#### POST `/api/v1/auth/login`
**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "user": { ... },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

#### POST `/api/v1/auth/refresh`
**Request:**
```json
{
  "refreshToken": "jwt"
}
```
**Response:**
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

#### POST `/api/v1/auth/logout`
**Request:** (Requires auth header)
```json
{
  "refreshToken": "jwt"
}
```
**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### 5.2 User Profile

#### GET `/api/v1/users/me`
**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "creditBalance": 1250.50,
  "totalVolume": 5000.00,
  "overallPnL": 250.50,
  "rankByPnL": 42,
  "rankByVolume": 18,
  "createdAt": "timestamp",
  "lastDailyRewardAt": "timestamp"
}
```

#### PATCH `/api/v1/users/me`
**Request:**
```json
{
  "username": "newUsername" // Optional
}
```
**Response:**
```json
{
  "user": { ... }
}
```

#### GET `/api/v1/users/:userId`
**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "creditBalance": 1250.50, // Hidden if not own profile
  "totalVolume": 5000.00,
  "overallPnL": 250.50,
  "rankByPnL": 42,
  "rankByVolume": 18
}
```

---

### 5.3 Markets

#### GET `/api/v1/markets`
**Query Params:**
- `category` (optional): Filter by category
- `type` (optional): Filter by market_type
- `status` (optional): Filter by status (default: 'open')
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `sort` (optional): 'trending', 'liquidity', 'expires_soon'

**Response:**
```json
{
  "markets": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "thisOption": "string",
      "thatOption": "string",
      "thisOdds": 0.65,
      "thatOdds": 0.35,
      "liquidity": 50000.00,
      "category": "Politics",
      "marketType": "polymarket",
      "status": "open",
      "expiresAt": "timestamp"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### GET `/api/v1/markets/:marketId`
**Response:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "thisOption": "string",
  "thatOption": "string",
  "thisOdds": 0.65,
  "thatOdds": 0.35,
  "liquidity": 50000.00,
  "category": "Politics",
  "marketType": "polymarket",
  "status": "open",
  "resolution": null,
  "expiresAt": "timestamp",
  "resolvedAt": null
}
```

---

### 5.4 Betting

#### POST `/api/v1/bets`
**Request:**
```json
{
  "marketId": "uuid",
  "amount": 100.00,
  "side": "this" // or "that"
}
```
**Response:**
```json
{
  "bet": {
    "id": "uuid",
    "userId": "uuid",
    "marketId": "uuid",
    "amount": 100.00,
    "side": "this",
    "oddsAtBet": 0.65,
    "potentialPayout": 153.85,
    "status": "pending",
    "placedAt": "timestamp"
  },
  "newBalance": 900.00
}
```

#### GET `/api/v1/bets/me`
**Query Params:**
- `status` (optional): Filter by bet status
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "bets": [
    {
      "id": "uuid",
      "market": {
        "id": "uuid",
        "title": "string",
        "thisOption": "string",
        "thatOption": "string"
      },
      "amount": 100.00,
      "side": "this",
      "oddsAtBet": 0.65,
      "potentialPayout": 153.85,
      "actualPayout": null,
      "status": "pending",
      "placedAt": "timestamp"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

#### GET `/api/v1/bets/:betId`
**Response:**
```json
{
  "id": "uuid",
  "market": { ... },
  "amount": 100.00,
  "side": "this",
  "oddsAtBet": 0.65,
  "potentialPayout": 153.85,
  "actualPayout": 153.85,
  "status": "won",
  "placedAt": "timestamp",
  "resolvedAt": "timestamp"
}
```

---

### 5.5 Leaderboard

#### GET `/api/v1/leaderboard/pnl`
**Query Params:**
- `limit` (default: 100, max: 1000)
- `offset` (default: 0)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "username": "string"
      },
      "overallPnL": 5250.75,
      "totalVolume": 50000.00
    }
  ],
  "total": 500,
  "limit": 100,
  "offset": 0
}
```

#### GET `/api/v1/leaderboard/volume`
**Query Params:**
- `limit` (default: 100, max: 1000)
- `offset` (default: 0)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "username": "string"
      },
      "totalVolume": 100000.00,
      "overallPnL": 2500.00
    }
  ],
  "total": 500,
  "limit": 100,
  "offset": 0
}
```

---

### 5.6 Rewards

#### POST `/api/v1/rewards/daily`
**Request:** (Requires auth header)
```json
{}
```
**Response:**
```json
{
  "reward": {
    "id": "uuid",
    "creditsAwarded": 100.00,
    "claimedAt": "timestamp"
  },
  "newBalance": 1100.00,
  "nextClaimAvailable": "timestamp"
}
```
**Error (if already claimed):**
```json
{
  "error": "Daily reward already claimed",
  "nextClaimAvailable": "timestamp"
}
```

#### GET `/api/v1/rewards/history`
**Response:**
```json
{
  "rewards": [
    {
      "id": "uuid",
      "creditsAwarded": 100.00,
      "claimedAt": "timestamp"
    }
  ],
  "total": 15
}
```

---

### 5.7 Credit Transactions

#### GET `/api/v1/transactions/me`
**Query Params:**
- `type` (optional): Filter by transaction_type
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": -100.00,
      "transactionType": "bet_placed",
      "referenceId": "uuid",
      "balanceAfter": 900.00,
      "createdAt": "timestamp"
    },
    {
      "id": "uuid",
      "amount": 100.00,
      "transactionType": "daily_reward",
      "referenceId": "uuid",
      "balanceAfter": 1000.00,
      "createdAt": "timestamp"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

## 6. Business Logic

### 6.1 Bet Placement Flow

1. **Validation:**
   - User is authenticated
   - Market exists and status is 'open'
   - Market has not expired
   - User has sufficient credit balance
   - Bet amount is within min/max limits (e.g., min: 10, max: 10000)

2. **Transaction (Atomic):**
   - Deduct credits from user balance
   - Create bet record with 'pending' status
   - Record credit transaction (type: 'bet_placed')
   - Update user's total_volume

3. **Response:**
   - Return bet details with potential payout
   - Return new credit balance

### 6.2 Payout Calculation

**Formula:**
```
potentialPayout = betAmount / odds
```

**Example:**
- Bet: 100 credits on THIS
- Odds at bet: 0.65 (65%)
- Potential payout: 100 / 0.65 = 153.85 credits
- Net profit if won: 53.85 credits

### 6.3 Market Resolution Flow

1. **Trigger:** Admin marks market as resolved OR Polymarket API webhook
2. **Validation:**
   - Market status is 'open' or 'closed'
   - Resolution is valid ('this', 'that', or 'invalid')

3. **Transaction (Batch):**
   - Update market status to 'resolved'
   - For each pending bet on the market:
     - If bet side matches resolution:
       - Set status to 'won'
       - Calculate actual_payout
       - Credit user balance
       - Record credit transaction (type: 'bet_payout')
       - Update user's overall_pnl (+profit)
     - If bet side does not match:
       - Set status to 'lost'
       - Update user's overall_pnl (-amount)
     - If resolution is 'invalid':
       - Set status to 'cancelled'
       - Refund bet amount to user
       - Record credit transaction (type: 'bet_refund')

4. **Post-Resolution:**
   - Recalculate leaderboard rankings
   - Update Redis cache

### 6.4 Daily Reward System

**Rules:**
- Users can claim 100 credits once per 24-hour period
- Claim window resets at midnight UTC (or 24h from last claim)
- Reward is credited immediately upon claim

**Implementation:**
1. Check `last_daily_reward_at` timestamp
2. If >= 24 hours ago or null:
   - Credit 100 credits to user balance
   - Update `last_daily_reward_at` to NOW()
   - Create daily_rewards record
   - Record credit transaction (type: 'daily_reward')
3. Else:
   - Return error with next available claim time

### 6.5 Leaderboard Ranking Algorithm

**Triggered by:**
- Market resolution
- Scheduled job (every 15 minutes)

**PnL Ranking:**
1. Calculate: `overall_pnl = SUM(all bet profits/losses)`
2. Order users by overall_pnl DESC
3. Assign rank_by_pnl (1 = highest PnL)
4. Update users table

**Volume Ranking:**
1. Calculate: `total_volume = SUM(all bet amounts)`
2. Order users by total_volume DESC
3. Assign rank_by_volume (1 = highest volume)
4. Update users table

**Caching:**
- Top 100 users by PnL cached in Redis (TTL: 5 minutes)
- Top 100 users by volume cached in Redis (TTL: 5 minutes)

---

## 7. Polymarket Integration

### 7.1 Builder API Overview

**Base URL:** `https://clob.polymarket.com/` (or Builder-specific endpoint)

**Key Endpoints:**
- `GET /markets` - List active markets
- `GET /markets/:id` - Get market details
- `GET /markets/:id/prices` - Get current odds
- `GET /markets/:id/trades` - Get recent trades

**Authentication:**
- API Key (provided by Polymarket Builder program)

### 7.2 Market Ingestion Pipeline

**Architecture:**
- Scheduled job runs every 5 minutes
- Fetches active Polymarket markets
- Maps to THISTHAT market schema
- Updates existing markets or creates new ones

**Mapping:**
```javascript
{
  polymarket_id: polymarket.condition_id,
  title: polymarket.question,
  description: polymarket.description,
  this_option: polymarket.outcomes[0], // YES
  that_option: polymarket.outcomes[1], // NO
  this_odds: polymarket.outcomes[0].price,
  that_odds: polymarket.outcomes[1].price,
  liquidity: polymarket.volume,
  category: polymarket.category || 'Uncategorized',
  market_type: 'polymarket',
  status: polymarket.closed ? 'closed' : 'open',
  expires_at: polymarket.end_date_iso,
}
```

### 7.3 Odds Synchronization

**Real-time Updates:**
- WebSocket connection to Polymarket for odds updates (optional)
- Fallback: Polling every 30 seconds for active markets with open bets

**Implementation:**
1. Subscribe to market price feeds
2. On update:
   - Update market.this_odds and market.that_odds
   - Recalculate potential payouts for pending bets (display only)
   - Broadcast to connected clients via WebSocket (future enhancement)

### 7.4 Market Resolution

**Trigger:**
- Polymarket webhook (preferred)
- Polling for resolved markets every 1 minute

**Process:**
1. Receive resolution event from Polymarket
2. Validate resolution data
3. Trigger internal market resolution flow (see 6.3)
4. Update market status and resolution

---

## 8. Credit Economics

### 8.1 Credit Distribution

**Sources:**
- **Initial signup:** 1000 credits
- **Daily login:** 100 credits/day
- **In-app purchase:** (Future) $1 USD = 100 credits

### 8.2 Credit Constraints

**Betting Limits:**
- Minimum bet: 10 credits
- Maximum bet: 10,000 credits (per bet)
- No daily bet limit

**Balance Limits:**
- Minimum balance: 0 credits (cannot go negative)
- Maximum balance: 1,000,000 credits

### 8.3 Anti-Inflation Measures

**Risk Mitigation:**
- Credits cannot be withdrawn or converted to fiat
- Credits expire after 90 days of inactivity (optional)
- Daily reward cap prevents excessive free credits
- Market odds mirror Polymarket (fair odds)

---

## 9. Security & Validation

### 9.1 Authentication Security

- Passwords hashed with bcrypt (cost factor: 12)
- JWT access tokens (expires: 15 minutes)
- JWT refresh tokens (expires: 7 days)
- Refresh token rotation on use
- Invalidate all tokens on password change

### 9.2 Rate Limiting

**Endpoints:**
- `/auth/register`: 5 requests/hour per IP
- `/auth/login`: 10 requests/hour per IP
- `/bets`: 30 requests/minute per user
- `/rewards/daily`: 5 requests/minute per user
- All other endpoints: 100 requests/minute per user

### 9.3 Input Validation

**All endpoints:**
- Sanitize user inputs (prevent XSS, SQL injection)
- Validate data types and formats
- Enforce max lengths for strings
- Use parameterized queries (Prisma ORM)

**Betting validation:**
- Validate market exists and is open
- Check user balance atomically
- Use database transactions for bet placement

### 9.4 Error Handling

**Error Response Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "details": {} // Optional additional context
}
```

**Error Codes:**
- `INVALID_CREDENTIALS` - Wrong email/password
- `INSUFFICIENT_BALANCE` - Not enough credits
- `MARKET_NOT_FOUND` - Market doesn't exist
- `MARKET_CLOSED` - Market no longer accepting bets
- `INVALID_BET_AMOUNT` - Amount outside min/max range
- `DAILY_REWARD_CLAIMED` - Already claimed today
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## 10. Performance Requirements

### 10.1 Response Times

- **Authentication:** < 200ms (p95)
- **Market listing:** < 300ms (p95)
- **Bet placement:** < 500ms (p95)
- **Leaderboard:** < 200ms (p95, cached)

### 10.2 Throughput

- **Target:** 1,000 requests/second
- **Peak:** 5,000 requests/second (stress test)

### 10.3 Database Optimization

- Use indexes on frequently queried columns
- Implement connection pooling (max: 20 connections)
- Use read replicas for leaderboard queries (future)
- Implement query result caching in Redis

### 10.4 Caching Strategy

**Redis Cache:**
- Market listings (TTL: 1 minute)
- Leaderboard top 100 (TTL: 5 minutes)
- User sessions (TTL: session duration)
- Daily reward eligibility (TTL: until next claim)

---

## 11. Monitoring & Observability

### 11.1 Logging

**Log Levels:**
- **ERROR:** Critical failures, exceptions
- **WARN:** Validation failures, rate limits
- **INFO:** User actions (login, bet placement)
- **DEBUG:** Detailed execution flow (dev only)

**Structured Logging (Pino):**
```json
{
  "level": "info",
  "time": 1234567890,
  "msg": "Bet placed",
  "userId": "uuid",
  "marketId": "uuid",
  "amount": 100.00,
  "side": "this"
}
```

### 11.2 Metrics

**Key Metrics:**
- Total users registered
- Daily active users (DAU)
- Total bets placed today/week/month
- Total credits wagered
- Average bet size
- Leaderboard rank distribution
- API response times (p50, p95, p99)
- Error rate by endpoint

### 11.3 Alerts

**Critical Alerts:**
- API response time > 1s (p95)
- Error rate > 1% (5-minute window)
- Database connection pool exhausted
- Polymarket API unreachable
- Credit balance anomalies (e.g., negative balance)

---

## 12. Testing Requirements

### 12.1 Unit Tests

- All business logic functions (>80% coverage)
- Payout calculations
- Ranking algorithms
- Input validation

### 12.2 Integration Tests

- Auth flow (register → login → refresh → logout)
- Bet placement flow (place → resolve → payout)
- Daily reward claiming
- Leaderboard updates

### 12.3 Load Testing

- Simulate 500 concurrent users
- 1,000 bets placed within 1 minute
- Market resolution with 10,000 pending bets

### 12.4 Edge Cases

- Concurrent bet placement (race conditions)
- Market expiry during bet placement
- Insufficient balance edge cases
- Daily reward claiming at midnight boundary
- Negative odds or invalid market data from Polymarket

---

## 13. Deployment & DevOps

### 13.1 Environment Setup

**Environments:**
- **Development:** Local with Docker Compose
- **Staging:** Cloud deployment (mimics production)
- **Production:** Cloud with auto-scaling

### 13.2 Database Migrations

- Use Prisma Migrate for schema changes
- Always test migrations in staging first
- Backup database before production migrations

### 13.3 CI/CD Pipeline

**GitHub Actions:**
1. Run linter (ESLint)
2. Run unit tests
3. Run integration tests
4. Build Docker image
5. Deploy to staging (on main branch)
6. Manual approval for production deploy

### 13.4 Rollback Strategy

- Keep last 3 Docker images
- Database migration rollback scripts
- Feature flags for new features (optional)

---

## 14. Success Metrics (KPIs)

### 14.1 Launch Goals (Week 1)

- **500 DAU** betting users
- **3,000+ total bets** placed
- **<10s time-to-first-bet** (p95)
- **>60% D1 retention**

### 14.2 Growth Metrics (M1-M2)

- **50,000 registered users**
- **10,000 DAU**
- **5 avg bets/user/day**
- **>40% D7 retention**
- **>20% D30 retention**

### 14.3 Technical Metrics

- **99.5% uptime**
- **<500ms API response time** (p95)
- **<0.5% error rate**
- **0 critical bugs in production**

---

## 15. Risks & Mitigations

### 15.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Polymarket API downtime | High | Fallback to cached market data; graceful degradation |
| Database performance issues | High | Connection pooling, read replicas, indexes |
| Credit inflation exploits | Medium | Rate limiting, audit logs, anomaly detection |
| Concurrent betting race conditions | Medium | Database transactions, optimistic locking |

### 15.2 Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low user engagement | High | Gamification, daily rewards, leaderboards |
| Market resolution disputes | Medium | Mirror Polymarket resolutions exactly |
| Credit economy imbalance | Medium | Monitor credit distribution, adjust rewards |

---

## 16. Future Enhancements (Post-V1)

**Not in scope for V1, planned for V2/V3:**

- WebSocket support for real-time odds updates
- Push notifications for market resolution
- In-app credit purchases via Stripe
- Social features (friends, chat, sharing)
- Market creation by admins via UI
- Advanced analytics dashboard
- Mobile app (React Native)
- Wallet integration (WalletConnect)
- USDC betting (V2)
- Creator-driven markets (V3)

---

## 17. Appendix

### 17.1 Glossary

- **Credits:** Virtual currency for V1 betting (no real-money value)
- **PnL:** Profit and Loss (total winnings minus total losses)
- **Volume:** Total amount bet by a user (sum of all bet amounts)
- **Odds:** Probability of an outcome (e.g., 0.65 = 65% chance)
- **Payout:** Credits returned to user when bet wins
- **Market Resolution:** Final determination of market outcome (THIS/THAT)

### 17.2 References

- [Polymarket Builder API Docs](https://docs.polymarket.com/)
- [Fastify Documentation](https://fastify.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-18
**Approved By:** [Pending]
**Next Review:** M1 Completion
