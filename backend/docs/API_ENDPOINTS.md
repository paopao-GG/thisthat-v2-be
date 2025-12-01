# THISTHAT Backend API Endpoints

**Base URL (local):** `http://localhost:3001`

All authenticated routes require an `Authorization: Bearer <accessToken>` header. Refresh tokens are handled via the `/api/v1/auth/refresh` endpoint.

---

## 1. Authentication & Users

### GET `/api/v1/auth/x`
Redirects to the X (Twitter) OAuth flow.

### GET `/api/v1/auth/x/callback`
Handles the OAuth callback, exchanges the code, and redirects to the frontend with `accessToken`, `refreshToken`, and `userId` in the querystring. Set `FRONTEND_URL` to control the redirect target.

### POST `/api/v1/auth/refresh`
Exchange a refresh token for a new access token.

```powershell
$body = @{ refreshToken = "<refresh-token>" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/refresh" -Method POST -Body $body -ContentType "application/json"
```

**Response**
```json
{ "success": true, "accessToken": "<jwt>" }
```

### POST `/api/v1/auth/logout`
Revokes (deletes) a refresh token. Body: `{ "refreshToken": "..." }`.

### GET `/api/v1/auth/me` _(JWT required)_
Returns the authenticated user profile.

### PATCH `/api/v1/users/me` _(JWT required)_
Updates profile fields (display name, username, avatar, etc.). Validated via Zod (`updateUserSchema`).

### GET `/api/v1/users/:userId`
Public profile lookup by UUID.

> Email/password signup & login controllers exist (`auth.controllers.ts`) and can be wired to routes when the non-OAuth flow is ready.

---

## 2. Markets

### GET `/api/v1/markets`
Returns static market data from PostgreSQL.

**Query params**
- `category` – filter by category slug
- `status` – `open`, `closed`, `resolved`
- `limit` – default 50, max 200
- `cursor` / `skip` – pagination strategy (see controller docs)

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets?category=politics&limit=12" -Method GET
```

**Response (trimmed)**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "9c6f...",
      "polymarketId": "0xabc...",
      "title": "Will BTC hit $100k before 2026?",
      "thisOption": "Yes",
      "thatOption": "No",
      "thisOdds": 0.62,
      "thatOdds": 0.38,
      "status": "open",
      "category": "crypto",
      "expiresAt": "2025-12-31T23:59:59.000Z"
    }
  ]
}
```

### GET `/api/v1/markets/random`
Returns a curated/random set for discovery cards.

### GET `/api/v1/markets/categories`
Lists distinct categories derived during ingestion.

### GET `/api/v1/markets/category/:category`
Shortcut for filtering by category slug.

### GET `/api/v1/markets/:id`
Static market payload from PostgreSQL only.

### GET `/api/v1/markets/:id/live`
Live odds pulled directly from Polymarket via `polymarket-client`. Useful when you only need odds without the static data.

### GET `/api/v1/markets/:id/full`
Combines the static DB document with the live odds call so the frontend makes one request.

### POST `/api/v1/markets/ingest`
Manually trigger the Polymarket ingestion pipeline. Primarily used for diagnostics or manual refresh; the cron worker runs automatically (see `startMarketIngestionJob`). Body optional; respects env vars such as `MARKET_INGEST_LIMIT`.

---

## 3. Betting

### POST `/api/v1/bets` _(JWT)_
Place a THIS/THAT bet.

```json
{
  "marketId": "9c6f...",
  "side": "this",
  "amount": 500
}
```

The service calculates potential payout, locks credits, and records a `CreditTransaction`.

### GET `/api/v1/bets/me` _(JWT)_
Paginated bet history for the current user.

### GET `/api/v1/bets/:betId` _(JWT)_
Single bet detail.

### POST `/api/v1/bets/:betId/sell` _(JWT)_
Early exit from a position. The request body contains `{ "amount": 250 }` (credits to sell) and returns the resulting payout.

---

## 4. Economy & Credits

### POST `/api/v1/economy/daily-credits` _(JWT)_
Claims the daily login reward immediately (scheduler also runs nightly). Returns the updated balance and streak info.

### POST `/api/v1/economy/buy` _(JWT)_
Buy synthetic stocks that power the in-app economy. Body includes `{ "stockId": "...", "shares": 10, "leverage": 1 }`.

### POST `/api/v1/economy/sell` _(JWT)_
Close a stock position.

### GET `/api/v1/economy/portfolio` _(JWT)_
Aggregates holdings, unrealized PnL, and credit balances.

### GET `/api/v1/economy/stocks`
Public endpoint listing available stocks with metadata (price, supply, leverage caps).

---

## 5. Leaderboards & Social

### GET `/api/v1/leaderboard/pnl`
Global top users by overall PnL (public).

### GET `/api/v1/leaderboard/volume`
Global ranking by total trading volume (public).

### GET `/api/v1/leaderboard/me` _(JWT)_
Returns the authenticated user’s ranks plus snapshots of surrounding users for context.

### GET `/api/v1/referrals/me` _(JWT)_
Referral stats: invite code, number of signups, credits awarded.

---

## 6. Transactions & Purchases

### GET `/api/v1/transactions/me` _(JWT)_
Paginated credit transaction ledger (daily rewards, bets, payouts, purchases, referrals).

### GET `/api/v1/purchases/packages`
Public list of purchasable credit bundles.

### POST `/api/v1/purchases` _(JWT)_
Simulate a credit purchase. Body:
```json
{
  "packageId": "starter",
  "provider": "manual",
  "externalId": "order_123"
}
```
Creates a `CreditPurchase` row and applies credits.

### GET `/api/v1/purchases/me` _(JWT)_
Purchase history for the authenticated user.

---

## 7. System & Diagnostics

### GET `/health`
Simple JSON health check:
```json
{ "status": "ok", "timestamp": "2025-11-27T14:05:12.345Z" }
```

### GET `/api/hello`
“Hello from TypeScript Fastify!” message, useful for quick smoke tests.

---

## 8. Error & Response Shapes

Successful responses follow:
```json
{
  "success": true,
  "data": { ... },
  "count": 25,          // present on list endpoints
  "message": "Optional" // present on action endpoints
}
```

Errors bubble through the Fastify error handler:
```json
{
  "success": false,
  "error": "User not found",
  "details": [ ... ]    // Validation errors only
}
```

Known status codes:
- `400` – Zod validation failure / missing parameters.
- `401` – Missing or invalid JWT / refresh token.
- `409` – Conflicts (duplicate username/email, double-claim of rewards).
- `500` – Unhandled server error (see server logs for details).

---

## 9. Useful Tips

- **Auth tokens** – Access tokens are short-lived; always implement refresh logic using `/api/v1/auth/refresh`. Refresh tokens should be stored securely (httpOnly cookie or secure storage).
- **Background data freshness** – Markets stay fresh thanks to the cron worker plus live odds endpoints. If you need an immediate refresh (e.g., staging demo), hit `POST /api/v1/markets/ingest`.
- **Pagination** – Most list endpoints accept `limit` plus either `skip` or `cursor`. Check the controller implementation for details when wiring infinite scroll.
- **Idempotency** – Credit-impacting routes (bets, economy, purchases) run inside Prisma transactions to keep balances consistent. Retrying a failed request is safe—duplicate protection is enforced via IDs and transaction hashes.

Keep this document updated when new routes ship so the frontend has an accurate contract.


