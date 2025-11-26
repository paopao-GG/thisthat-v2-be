# THISTHAT V1 – Credits Integration Guide

This guide documents how the Fastify backend and the `frontend2` React/Vite app now work together to deliver the PRD-compliant **credits-only** experience. It highlights the required services, endpoints, and run-books so anyone can reproduce or extend the flow.

---

## 1. Environment & Bootstrapping

### Backend
```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, etc.
npm install
npm run dev            # http://localhost:3001
```
The server loads Fastify, connects to Postgres/Mongo, and starts every background job (daily credits cron @ 00:00 UTC, leaderboards, market sync, etc.).

### Frontend2
```bash
cd frontend2
echo "VITE_API_BASE_URL=http://localhost:3001" > .env
npm install
npm run dev            # http://localhost:5173
```
`VITE_API_BASE_URL` is the only required variable; point it at staging or prod to test against those environments.

---

## 2. Services & Shared Client

| Concern | File | Notes |
|---------|------|-------|
| API client | `src/shared/services/api.ts` | Handles auth headers, error shaping, and persists the access token. |
| Auth context | `src/shared/contexts/AuthContext.tsx` | Wraps the app, mirrors `/api/v1/auth/me`, and guards `/app/*` routes via `RequireAuth`. |
| Feature services | `shared/services/{auth,market,bet,economy,referral,purchase,leaderboard}Service.ts` | Thin wrappers around the REST API for each domain. |

All hooks/components call the service layer; no component touches `fetch` directly anymore.

---

## 3. Auth & Session Flow

| Feature | Endpoint(s) | UI |
|---------|-------------|----|
| Signup (optional referral code) | `POST /api/v1/auth/signup` | `SignupPage.tsx` |
| Login | `POST /api/v1/auth/login` | `LoginPage.tsx` |
| Load profile | `GET /api/v1/auth/me` | `AuthProvider`, `TopBar.tsx`, `ProfilePage.tsx` |

- Tokens live in `localStorage` and are automatically re-applied by `apiClient`.
- `/app` routes render only after `AuthProvider` resolves the current session. Unauthed users stay on PreLogin/Login/Signup.

---

## 4. Markets & Betting

| Purpose | Endpoint | Frontend2 usage |
|---------|----------|-----------------|
| Category list | `GET /api/v1/markets/categories` | `CategoryFilterContext` loads once on mount. |
| Random markets | `GET /api/v1/markets/random` | Default feed on `/app/play`. |
| Category markets | `GET /api/v1/markets/category/:category` | Triggered when the user filters. |
| Batch odds | `GET /api/v1/markets/batch-live` | Refreshes odds/liquidity for the current stack. |
| Place bet | `POST /api/v1/bets` | `SwipeableCard` enforces the 10–10,000 credit window. |

After every successful bet the wallet refreshes via `refreshUser()` so credits, streaks, and volume remain consistent with the ledger.

---

## 5. Daily Credits & Economy

| Feature | Endpoint | UI |
|---------|----------|----|
| Claim streak reward | `POST /api/v1/economy/daily-credits` | `DailyCreditsSection` on the home page. |

- The backend enforces the PRD ladder (1k start, +500 per day, capped at 10k on day 18) and respects the midnight-UTC reset.
- Frontend shows a live countdown until the next UTC midnight using `lastDailyRewardAt`.

---

## 6. Referrals & Purchases

| Feature | Endpoint | UI |
|---------|----------|----|
| Referral stats | `GET /api/v1/referrals/me` | `ProfilePage.tsx`, `ReferralModal.tsx`. |
| Credit packs | `GET /api/v1/purchases/packages` | “Purchase Credits” cards on the profile. |
| Simulated purchase | `POST /api/v1/purchases` | Immediately credits the wallet and logs a ledger entry. |

Signup accepts a referral code; the referrer automatically earns 200 credits and the profile screen displays live totals.

---

## 7. Bets, Positions, Leaderboards

| Concern | Endpoint(s) | UI |
|---------|-------------|----|
| Bet history | `GET /api/v1/bets/me` | Converted into “positions” with PnL calculations on the profile page. |
| Leaderboards | `GET /api/v1/leaderboard/volume`, `GET /api/v1/leaderboard/pnl`, `GET /api/v1/leaderboard/me` | `LeaderboardPage.tsx` toggles between volume and PnL, mirroring PRD Section 5. |

---

## 8. Smoke-Test Checklist

1. Start backend (`npm run dev`) and frontend2 (`npm run dev`).
2. Sign up (optionally with someone else’s referral code) → verify starting 1,000 credits.
3. Claim daily reward → streak and credit ledger update.
4. Place a bet on `/app/play` → wallet decrements immediately.
5. Buy a credit pack → wallet increments; `/api/v1/credit-transactions/me` shows the purchase row.
6. View `/app/profile` → positions table, referral stats, and purchase cards all resolve without errors.
7. Check `/app/leaderboard` → volume/PnL boards show live data from the backend.

Following the steps above exercises every PRD-mandated V1 feature (credits, streaks, referrals, leaderboard rewards) using the new `frontend2` stack. Future V2/V3 (wallets, USDC, creator markets) can layer on top of the same service abstractions without touching the credit flows.

<<<<<<< HEAD
2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Fetch Markets** (one-time or periodic):
   ```bash
   curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=50"
   ```

4. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access Application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Betting Page: http://localhost:5173/play

### Data Refresh

Markets are **not** automatically refreshed. To update market data:

```bash
# Fetch latest markets from Polymarket
curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=100"

# Frontend will fetch updated data on page refresh
```

### Debugging

- **Backend logs**: Check terminal running `npm run dev` in backend/
- **Frontend errors**: Open browser DevTools Console
- **API calls**: Network tab in DevTools shows all HTTP requests
- **Database**: Use MongoDB Compass to inspect `thisthat_test.markets` collection

---

**Date**: 2025-11-20
**Version**: V1 - Markets Viewing Only
**Status**: ✅ Complete and Working


=======
>>>>>>> 88c67acce7262a76629ac22c3a505f614aa66d2b
