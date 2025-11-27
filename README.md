# THISTHAT V3

A credits-based prediction market platform with Polymarket integration.

**Status:** ✅ V1 COMPLETE - Production Ready

## 📁 Project Structure

```
thisthat-v3/
├── backend/          # Fastify API server
│   ├── docs/         # Backend documentation
│   ├── scripts/      # Utility scripts
│   ├── memory-bank/  # Project memory bank
│   ├── src/          # Source code
│   └── prisma/       # Database schema
├── frontend/         # React frontend
│   ├── docs/         # Frontend documentation
│   └── src/          # Source code
└── docs/             # Project-wide documentation
```

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```
Key steps: copy `env.template` to `.env`, configure Postgres/Redis URLs, then run `npx prisma migrate dev --name init` before starting the server. See the linked Backend docs for details.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Integration Resources

- **Backend System Overview:** `backend/docs/BACKEND_SYSTEM_OVERVIEW.md` — setup checklist, background jobs, API coverage, feature list, error handling, and DB schema snapshot.
- **Backend API Reference:** `backend/docs/API_ENDPOINTS.md` — request/response examples for every Fastify route (auth, markets, betting, economy, leaderboards, purchases, system health).
- **Environment Variables:** `backend/docs/ENV_FILE_CONTENT.md` — full `.env` template with explanations.
- **Backend Quick Start:** `backend/docs/QUICK_START.md` — detailed instructions for bootstrapping Postgres, Redis, Prisma, and running the API locally.
- **Frontend Docs:** `frontend/docs/` — React app guides and component conventions.
- **Project Docs:** `docs/` — cross-cutting specs and planning notes.

## 🏗️ Current Status

**V1 COMPLETE** ✅ - All critical features implemented and production-ready

- ✅ Phase 1: Polymarket Data Fetching (100% Complete)
- ✅ Phase 2: Authentication (100% Complete - Signup/Login/Refresh/Logout)
- ✅ Phase 3: User Module (100% Complete)
- ✅ Phase 4: Betting Module (100% Complete)
- ✅ Phase 5: Economy System (100% Complete - Daily credits, Stock market, Referrals, Purchases)
- ✅ Phase 6: Market Resolution & Payout Processing (100% Complete)
- ✅ Phase 7: Leaderboard System (100% Complete)
- ✅ MongoDB ↔ PostgreSQL Sync (100% Complete)
- ✅ Redis Caching (100% Complete - optional, graceful fallback)
- ✅ Credit Transactions (100% Complete)
- ✅ Referral System (100% Complete)
- ✅ Credit Purchase System (100% Complete)

**Total:** 20+ API endpoints implemented

See `backend/memory-bank/PROGRESS_SUMMARY.md` for detailed progress.


