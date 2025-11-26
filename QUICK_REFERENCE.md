# THISTHAT V3 - Quick Reference

Quick commands and information for daily development.

## 🚀 Quick Commands

### Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Database Commands

**Prisma:**
```bash
cd backend
npx prisma generate          # Generate Prisma client
npx prisma db push           # Push schema to database
npx prisma studio            # Open Prisma Studio (GUI)
```

**PostgreSQL:**
```bash
psql -U postgres -d thisthat_db    # Connect to database
\dt                                 # List tables
\d users                            # Describe users table
```

**MongoDB:**
```bash
mongosh                                    # Connect to MongoDB
use thisthat_test                          # Switch database
db.markets.find().limit(5)                 # Find markets
db.markets.countDocuments({status: "active"})  # Count active markets
```

### Testing

**Backend Tests:**
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run test:watch         # Watch mode
```

**API Testing:**
```bash
# Health check
curl http://localhost:3001/health

# Fetch markets
curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=10"

# Sync markets
curl -X POST "http://localhost:3001/api/v1/sync/markets"
```

### Common Tasks

**Install Dependencies:**
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

**Clean Install:**
```bash
# Backend
cd backend
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install

# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

**Kill Port Processes:**
```powershell
# Find process on port 3001
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

## 📍 Important URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **API Health:** http://localhost:3001/health
- **Prisma Studio:** Run `npx prisma studio` then http://localhost:5555

## 📁 Key File Locations

### Backend
- **Main Entry:** `backend/src/app/index.ts`
- **Database Schema:** `backend/prisma/schema.prisma`
- **Environment:** `backend/.env` (create from `env.template`)
- **API Routes:** `backend/src/features/*/routes.ts`

### Frontend
- **Main Entry:** `frontend/src/main.tsx`
- **App Component:** `frontend/src/App.tsx`
- **Pages:** `frontend/src/app/pages/`
- **Services:** `frontend/src/shared/services/`

## 🔑 Environment Variables

**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URL` - MongoDB connection string
- `JWT_ACCESS_SECRET` - JWT secret (change in production!)
- `REDIS_URL` - Redis connection (optional)

**Frontend (.env):**
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

## 🗄️ Database Info

**PostgreSQL:**
- **Database:** `thisthat_db`
- **Port:** 5432
- **Default User:** postgres

**MongoDB:**
- **Database:** `thisthat_test`
- **Port:** 27017
- **Collections:** `markets`, `events`

**Redis:**
- **Port:** 6379
- **Used for:** Leaderboard caching

## 📚 Documentation Locations

- **Project Docs:** `docs/`
- **Backend Docs:** `backend/docs/`
- **Frontend Docs:** `frontend/docs/`
- **Memory Bank:** `backend/memory-bank/`

## 🐛 Common Issues & Fixes

**Port Already in Use:**
```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Database Connection Error:**
```bash
# Check PostgreSQL is running
pg_isready

# Check MongoDB is running
mongosh --eval "db.version()"
```

**Module Not Found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Prisma Errors:**
```bash
npx prisma generate
npx prisma db push
```

## 🎯 API Endpoints Quick Reference

**Authentication:**
- `POST /api/v1/auth/signup` - Sign up
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

**Betting:**
- `POST /api/v1/bets` - Place bet
- `GET /api/v1/bets/me` - Get user bets
- `GET /api/v1/bets/:id` - Get bet details

**Economy:**
- `POST /api/v1/economy/daily-credits` - Claim daily credits
- `POST /api/v1/economy/buy` - Buy stocks
- `POST /api/v1/economy/sell` - Sell stocks
- `GET /api/v1/economy/portfolio` - Get portfolio

**Leaderboard:**
- `GET /api/v1/leaderboard/pnl` - PnL leaderboard
- `GET /api/v1/leaderboard/volume` - Volume leaderboard
- `GET /api/v1/leaderboard/me` - User ranking

**Markets:**
- `GET /api/v1/markets` - Get markets
- `POST /api/v1/markets/fetch` - Fetch from Polymarket
- `POST /api/v1/sync/markets` - Sync to PostgreSQL

## 📊 Project Status

**V1 Features:** ✅ 100% Complete
- Authentication ✅
- Betting System ✅
- Economy System ✅
- Market Resolution ✅
- Leaderboards ✅
- Unit Tests ✅ (222 tests)

See `backend/memory-bank/PROGRESS_SUMMARY.md` for details.

---

**Need more help?** Check `SETUP_GUIDE.md` for detailed setup instructions.

