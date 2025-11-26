# .env File Content Reference

This document shows what your `.env` file should contain. **DO NOT commit this file or share it publicly!**

## Complete .env File Content

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database (PostgreSQL for production)
DATABASE_URL=postgresql://user:password@localhost:5432/thisthat_v1

# MongoDB (for testing Phase 1)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_ACCESS_SECRET=your-super-secret-access-token-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Polymarket API Configuration
POLYMARKET_API_KEY=019a791b-28ea-7268-ac34-5be03e2b746a
POLYMARKET_API_SECRET=fwtVZyPRX9GwpCPE4BaNmeE4ZWRdcoyGrcCpkrj92Bw=
POLYMARKET_API_PASSPHRASE=a21bef930f312fa00551433f77ff9c3e2cbc5f25a3f3d350e4be7aa5770cd931
POLYMARKET_BASE_URL=https://clob.polymarket.com

# App Configuration (V1 Credits System)
MIN_BET_AMOUNT=10
MAX_BET_AMOUNT=10000
DAILY_REWARD_CREDITS=100
STARTING_CREDITS=1000
```

## What Was Updated

✅ **Polymarket API Key:** Added your actual API key  
✅ **Polymarket API Secret:** Added your secret (for authenticated endpoints)  
✅ **Polymarket API Passphrase:** Added your passphrase (for authenticated endpoints)  
✅ **Base URL:** Confirmed as `https://clob.polymarket.com`

## Verification

To verify your `.env` file is set up correctly:

1. **Check the file exists:**
   ```powershell
   Test-Path "thisthat-v2\backend\.env"
   ```

2. **Verify Polymarket credentials are set:**
   ```powershell
   Get-Content "thisthat-v2\backend\.env" | Select-String "POLYMARKET"
   ```

3. **Start the server:**
   ```bash
   cd thisthat-v2/backend
   npm run dev
   ```

4. **Test the API:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=10" -Method POST
   ```

## Security Reminders

⚠️ **IMPORTANT:**
- ✅ `.env` is already in `.gitignore` (won't be committed)
- ✅ Never share your API credentials publicly
- ✅ Use different credentials for production
- ✅ Rotate credentials if exposed

## Current Status

✅ **Phase 1:** Works without credentials (public endpoint)  
⚠️ **Phase 2+:** Will use credentials for authenticated endpoints

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Configured

