# THISTHAT V2 - Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- MongoDB running on `localhost:27017`
- npm or yarn

## 5-Minute Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Backend is already configured with `.env` file. Frontend needs one:

```bash
cd frontend
echo "VITE_API_BASE_URL=http://localhost:3001" > .env
```

### 3. Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ Connected to MongoDB: thisthat_test
🚀 Server listening on http://0.0.0.0:3001
```

### 4. Fetch Markets from Polymarket

In a new terminal:

```bash
curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=20"
```

Response:
```json
{"success":true,"message":"Fetched and saved 20 markets","data":{"saved":20,"errors":0}}
```

### 5. Start Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v7.2.2  ready in 216 ms
➜  Local:   http://localhost:5173/
```

### 6. Open in Browser

Navigate to: **http://localhost:5173/play**

You should see:
- Real markets from Polymarket
- Swipe up/down to navigate
- Market cards with category, title, description
- Odds, liquidity, and expiry date
- Betting controls (bet placement not yet functional)

## Troubleshooting

### "No markets available"

**Solution**: Fetch markets first
```bash
curl -X POST "http://localhost:3001/api/v1/markets/fetch?active=true&limit=20"
```

### "Failed to load markets"

**Solution**: Check backend is running on port 3001
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### CORS errors in browser

**Solution**: Backend CORS is already configured. Make sure `VITE_API_BASE_URL` in frontend `.env` matches backend URL.

### MongoDB connection failed

**Solution**: Start MongoDB
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Windows
net start MongoDB

# Linux
sudo systemctl start mongod
```

## What's Working

✅ Backend fetches markets from Polymarket
✅ Markets stored in MongoDB
✅ Frontend displays real market data
✅ Swipe navigation between markets
✅ Market cards show complete information

## What's NOT Working (Yet)

❌ User authentication
❌ Bet placement
❌ Credits system
❌ Leaderboard
❌ Daily rewards
❌ User profiles

## Next Steps

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed architecture and implementation notes.

---

**Need help?** Check the backend logs or frontend browser console for error messages.
