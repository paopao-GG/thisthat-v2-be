# Backend System Overview

This is the single source of truth for bringing the THISTHAT backend online, integrating it with the final frontend, and understanding what is already built.

---

## 1. Setup Checklist

| Step | Command / File | Notes |
|------|----------------|-------|
| Install deps | `npm install` | Node.js 20+ |
| Copy env file | `.env` from `env.template` | See `docs/ENV_FILE_CONTENT.md` |
| Generate Prisma client | `npx prisma generate` | Required anytime the schema changes |
| Apply migrations | `npx prisma migrate dev --name init` | Creates all tables in PostgreSQL |
| (Optional) Inspect DB | `npx prisma studio` | Launches browser studio |
| Run dev server | `npm run dev` | Fastify + esbuild watcher |
| Production build | `npm run build && npm start` | Builds to `dist/` |

Supporting docs:
- `docs/QUICK_START.md` – extended setup & troubleshooting
- `docs/RUN_SERVER.md` – runtime options, Windows helpers

Environment highlights:
- `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `MARKET_INGEST_CRON` and `MARKET_INGEST_LIMIT` tune the Polymarket job
- `FRONTEND_URL` controls OAuth redirects

---

## 2. Runtime Services & Background Jobs

These jobs start automatically in `src/app/index.ts`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Market ingestion (`startMarketIngestionJob`) | Cron `*/5 * * * *` UTC (default) + immediate boot run | Pulls static Polymarket markets into PostgreSQL. Guards against overlapping runs (`isRunning`) and retries the upstream call with `retryWithBackoff`. |
| Daily credits (`startDailyCreditsJob`) | Cron `0 0 * * *` UTC + immediate boot run | Grants daily login rewards via `economyService.processDailyCreditAllocation`. |
| Market resolution (`startMarketResolutionJob`) | Every 60s | Checks expiring markets and triggers payouts via `market-resolution` services. |
| Leaderboard update (`startLeaderboardUpdateJob`) | Every 15 minutes | Recomputes PnL & volume ranks. |

Redis is optional—when it is unreachable the server logs a warning and continues.

Graceful shutdown stops all schedulers and closes Redis (`SIGINT`/`SIGTERM`).

---

## 3. API Surface (current Fastify routes)

### Auth & Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/auth/x` | Redirect to X (Twitter) OAuth. | Public |
| GET | `/api/v1/auth/x/callback` | OAuth callback; redirects to frontend with tokens. | Public |
| POST | `/api/v1/auth/refresh` | Exchange refresh token for a new access token. | Public |
| POST | `/api/v1/auth/logout` | Revoke a refresh token. | Public |
| GET | `/api/v1/auth/me` | Return the current user profile. | JWT |
| PATCH | `/api/v1/users/me` | Update profile (name, username, avatar, etc.). | JWT |
| GET | `/api/v1/users/:userId` | Public user profile lookup. | Public |

> Email/password signup & login controllers exist (`auth.controllers.ts`) and can be wired to routes when needed. Currently the live flow is OAuth + token refresh/logout.

### Markets & Market Data

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/markets` | List markets (static data from PostgreSQL) with filters & pagination query params. | Public |
| GET | `/api/v1/markets/random` | Sampled list for discovery screens. | Public |
| POST | `/api/v1/markets/ingest` | Manually trigger a Polymarket ingestion cycle. | Public (protect via gateway if needed) |
| GET | `/api/v1/markets/categories` | Enumerate available categories. | Public |
| GET | `/api/v1/markets/category/:category` | Filter by category (alias to the query path). | Public |
| GET | `/api/v1/markets/:id` | Static market payload. | Public |
| GET | `/api/v1/markets/:id/live` | Live odds snapshot pulled from Polymarket on demand. | Public |
| GET | `/api/v1/markets/:id/full` | Combines static DB data with live odds response. | Public |

### Betting & Credits Economy

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/bets` | Place a THIS/THAT bet using credits. Calculates payout + locks credits. | JWT |
| GET | `/api/v1/bets/me` | Paginated bet history for the current user. | JWT |
| GET | `/api/v1/bets/:betId` | Inspect a single bet. | JWT |
| POST | `/api/v1/bets/:betId/sell` | Sell back an open bet for the quoted amount. | JWT |
| POST | `/api/v1/economy/daily-credits` | Claim the daily login reward manually. | JWT |
| POST | `/api/v1/economy/buy` | Buy synthetic stocks (for the in-app economy) using credits. | JWT |
| POST | `/api/v1/economy/sell` | Sell holdings back. | JWT |
| GET | `/api/v1/economy/portfolio` | Snapshot of holdings + balances. | JWT |
| GET | `/api/v1/economy/stocks` | Public stock catalog (no auth). | Public |

### Leaderboard, Transactions, Referrals, Purchases

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/leaderboard/pnl` | Global PnL leaderboard. | Public |
| GET | `/api/v1/leaderboard/volume` | Global volume leaderboard. | Public |
| GET | `/api/v1/leaderboard/me` | Current user’s ranks. | JWT |
| GET | `/api/v1/transactions/me` | Credit transaction ledger with pagination. | JWT |
| GET | `/api/v1/referrals/me` | Referral stats (code, invite counts, bonuses). | JWT |
| GET | `/api/v1/purchases/packages` | List purchasable credit bundles. | Public |
| POST | `/api/v1/purchases` | Simulated credit purchase (records audit + credits). | JWT |
| GET | `/api/v1/purchases/me` | Purchase history. | JWT |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + timestamp. |
| GET | `/api/hello` | Simple connectivity test. |

For full request/response examples, see `docs/API_ENDPOINTS.md`.

---

## 4. Delivered Feature Set

- **Credits betting loop** – Tokenless wagering with balance locks, payouts, refunds, and transaction audit trail (`CreditTransaction` table).
- **Daily rewards & referral bonuses** – Automated scheduler + manual claim endpoint; referral codes tracked per user with bonus credits.
- **Polymarket ingestion** – Cron + manual trigger, static data saved in PostgreSQL, live odds fetched lazily to keep markets fresh without hammering the DB.
- **Leaderboards** – PnL & volume rankings recalculated every 15 minutes with rank caching on the `users` table.
- **Purchases & economy stocks** – Virtual stock market to support growth loops and store-of-value mechanics.
- **OAuth-first auth** – X login flow, refresh token rotation, logout, and JWT-protected feature routes.

---

## 5. Error Handling & Resilience

- **Global Fastify error handler** (`app/index.ts`) logs every exception and returns a sanitized `500` payload.
- **Zod validation** on every controller (`auth`, `users`, `betting`, etc.) sends `400` with details; known conflicts (duplicate email/username) return `409`.
- **Service-specific guards**:
  - Market ingestion uses `retryWithBackoff` plus an `isRunning` flag to avoid cascading failures.
  - Daily credits + leaderboard jobs wrap each user update so a single failure doesn’t stop the batch.
  - Redis connection failures are downgraded to warnings; the API keeps serving from PostgreSQL.
- **Prisma transactions** ensure credit movements and bet placements are atomic (see `betting.services.ts` and `transactions` utilities).
- **OAuth callback** surfaces granular error codes back to the frontend (missing state, token exchange failures, Prisma constraint violations).

---

## 6. Database Schema Snapshot

See `prisma/schema.prisma` for definitions. High-level overview:

| Table | Purpose | Notable Columns |
|-------|---------|-----------------|
| `users` | Core profile, balances, referral codes, rank cache. | `creditBalance`, `availableCredits`, `overallPnL`, `rankByPnL`, `referralCode`. |
| `oauth_accounts` | Linked OAuth providers (X, Google, etc.). | `provider`, `providerAccountId`, tokens + expiry. |
| `markets` | Static Polymarket markets + admin markets. | `polymarketId`, `thisOption/thatOption`, `status`, `liquidity`, `expiresAt`. |
| `bets` | User positions on markets. | `side`, `amount`, `potentialPayout`, `status`, `resolvedAt`. |
| `credit_transactions` | Ledger for every credit movement (bets, rewards, purchases). | `transactionType`, `referenceId`, `balanceAfter`. |
| `credit_purchases` | Simulated top-ups. | `packageId`, `usdAmount`, `status`, `provider`. |
| `daily_rewards` | Tracks daily claims per user. | `creditsAwarded`, `claimedAt`. |
| `refresh_tokens` | Stored hashed refresh tokens for rotation/revocation. | `tokenHash`, `expiresAt`. |
| `stocks`, `stock_holdings`, `stock_transactions` | Support the stock/economy feature (symbols, holdings, leverage, signed transactions). |

Indices exist on IDs, ranks, and frequently queried status fields for fast lookups.

---

## 7. Testing & Quality Gates

- Run the suite: `npm run test:run` (Vitest) or `npm run test:coverage`.
- Type safety: `npm run type-check`.
- Linting: `npm run lint` / `npm run lint:fix`.
- See `docs/TESTING_QUICK_START.md` for CLI usage and gotchas.

---

## 8. Quick Links

- Setup: `docs/QUICK_START.md`
- Environment variables: `docs/ENV_FILE_CONTENT.md`
- API reference: `docs/API_ENDPOINTS.md`
- Running locally: `docs/RUN_SERVER.md`
- Testing: `docs/TESTING_QUICK_START.md`

Keep this file updated whenever a new feature/team-facing API ships so frontend & ops have a single reference.



