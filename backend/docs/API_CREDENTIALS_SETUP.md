# Polymarket API Credentials Setup

## Your API Credentials

You've provided the following Polymarket API credentials:

- **API Key:** `019a791b-28ea-7268-ac34-5be03e2b746a`
- **Secret:** `fwtVZyPRX9GwpCPE4BaNmeE4ZWRdcoyGrcCpkrj92Bw=`
- **Passphrase:** `a21bef930f312fa00551433f77ff9c3e2cbc5f25a3f3d350e4be7aa5770cd931`

## Important Notes

### ⚠️ Security Warning

**DO NOT commit these credentials to Git!** They are sensitive and should only be stored in your local `.env` file, which is already in `.gitignore`.

### 📝 About Polymarket API Authentication

**Current Status:**
- The `/markets` endpoint is **public** and doesn't require authentication
- Your API credentials are for **authenticated endpoints** (trading, account info, etc.)
- Phase 1 only uses the public `/markets` endpoint, so credentials are optional for now

**Future Use:**
- Phase 2+ will need these credentials for authenticated endpoints
- Trading operations require signature-based authentication
- Account information endpoints require authentication

## Setup Instructions

### Step 1: Create `.env` File

Create a `.env` file in the `thisthat-v2/backend/` directory:

```bash
cd thisthat-v2/backend
touch .env  # or create manually
```

### Step 2: Add Your Credentials

Add the following to your `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test

# Polymarket API Configuration
POLYMARKET_API_KEY=019a791b-28ea-7268-ac34-5be03e2b746a
POLYMARKET_API_SECRET=fwtVZyPRX9GwpCPE4BaNmeE4ZWRdcoyGrcCpkrj92Bw=
POLYMARKET_API_PASSPHRASE=a21bef930f312fa00551433f77ff9c3e2cbc5f25a3f3d350e4be7aa5770cd931
POLYMARKET_BASE_URL=https://clob.polymarket.com
```

### Step 3: Verify Setup

The credentials will be automatically loaded when you start the server:

```bash
npm run dev
```

The Polymarket client will read these from `process.env` automatically.

## Current Implementation

### How It Works Now

The current `PolymarketClient` class:
- ✅ Reads `POLYMARKET_API_KEY` from environment
- ✅ Uses it in `Authorization: Bearer ${apiKey}` header
- ⚠️ Doesn't use secret/passphrase yet (not needed for public endpoints)

### Code Location

**File:** `src/lib/polymarket-client.ts`

```typescript
constructor(apiKey?: string, baseUrl?: string) {
  this.baseUrl = baseUrl || process.env.POLYMARKET_BASE_URL || 'https://clob.polymarket.com';
  
  this.client = axios.create({
    baseURL: this.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
    },
    timeout: 30000,
  });
}
```

## Future Enhancements

### For Authenticated Endpoints (Phase 2+)

When you need authenticated endpoints, you'll need to implement signature-based authentication:

```typescript
// Example (not implemented yet)
import crypto from 'crypto';

function generateSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secret: string
): string {
  const message = timestamp + method + path + body;
  return crypto
    .createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(message)
    .digest('base64');
}
```

This will be needed for:
- Placing orders
- Getting account balance
- Viewing positions
- Other authenticated operations

## Verification

### Test Your Setup

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Check logs:**
   You should see the server starting without errors.

3. **Test API endpoint:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/markets/fetch?active=true&limit=10" -Method POST
   ```

4. **Verify credentials are loaded:**
   The API should work (even without credentials for public endpoints).

## Troubleshooting

### Issue: Credentials Not Loading

**Check:**
- `.env` file exists in `thisthat-v2/backend/`
- `.env` file has correct variable names (case-sensitive)
- Server was restarted after adding credentials
- No typos in variable names

### Issue: API Still Works Without Credentials

**This is normal!** The `/markets` endpoint is public and doesn't require authentication. Your credentials will be used for authenticated endpoints in future phases.

## Security Best Practices

1. ✅ **Never commit `.env` to Git** (already in `.gitignore`)
2. ✅ **Use environment variables** (not hardcoded)
3. ✅ **Rotate credentials** if exposed
4. ✅ **Use different credentials** for dev/staging/production
5. ✅ **Limit API key permissions** if possible

## Next Steps

1. ✅ **Add credentials to `.env`** (immediate)
2. ⚠️ **Test with authenticated endpoints** (when needed)
3. ⚠️ **Implement signature-based auth** (Phase 2+)
4. ⚠️ **Add credential rotation** (production)

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Ready for Use

