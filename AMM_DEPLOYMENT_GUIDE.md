# AMM Deployment Guide

## Overview

This guide will walk you through deploying the new AMM (Automated Market Maker) system to your betting platform.

## Prerequisites

- Backend server must be stopped
- Database connections available
- Node.js environment ready

## Deployment Steps

### Option 1: Automated Deployment (Windows)

1. **Stop the backend server** (press Ctrl+C in the terminal running the server)

2. **Run the migration script**:
   ```bash
   cd backend
   migrate-amm.bat
   ```

3. **Follow the prompts** - the script will:
   - Generate Prisma clients for both databases
   - Push schema changes to databases
   - Show success/error messages

4. **Start the backend server**:
   ```bash
   npm run dev
   ```

5. **Test the AMM endpoints**:
   ```bash
   npm run test:amm
   ```

### Option 2: Manual Deployment

#### Step 1: Stop Backend Server

Make sure no Node.js processes are using the database:
```bash
# Windows
tasklist | findstr node.exe
# Kill any backend processes if needed
```

#### Step 2: Generate Prisma Clients

```bash
cd backend

# Generate markets database client
npx prisma generate --schema=prisma/schema.markets.prisma

# Generate users database client
npx prisma generate --schema=prisma/schema.users.prisma
```

**Expected output**: ✓ Generated Prisma Client for each schema

#### Step 3: Push Schema Changes

```bash
# Push markets schema (adds yesReserve, noReserve)
npx prisma db push --schema=prisma/schema.markets.prisma

# Push users schema (adds sharesReceived, priceAtBet)
npx prisma db push --schema=prisma/schema.users.prisma
```

**Expected output**: ✓ Your database is now in sync with your schema.

#### Step 4: Verify TypeScript Compilation

```bash
npm run type-check
```

**Expected output**: No errors

#### Step 5: Start Backend Server

```bash
npm run dev
```

**Expected output**: Server starts successfully on port 3001

#### Step 6: Run AMM Tests

```bash
npm run test:amm
```

**Expected output**: ✅ All AMM endpoint tests passed!

## Testing the Deployment

### Test 1: Get Trade Quote (Public Endpoint)

```bash
curl "http://localhost:3001/api/v1/bets/quote?marketId=<MARKET_UUID>&amount=100&side=this"
```

**Expected Response**:
```json
{
  "success": true,
  "sharesReceived": 98.5234,
  "priceImpact": 1.23,
  "probabilityBefore": 0.50,
  "probabilityAfter": 0.51,
  "effectivePrice": 1.0152
}
```

### Test 2: Place AMM Bet (Authenticated)

First, get an auth token by logging in, then:

```bash
curl -X POST http://localhost:3001/api/v1/bets \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "<MARKET_UUID>",
    "amount": 100,
    "side": "this"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "bet": {
    "id": "...",
    "userId": "...",
    "marketId": "...",
    "amount": 100,
    "side": "this",
    "sharesReceived": 98.5234,
    "priceAtBet": 1.0152,
    "status": "pending"
  },
  "newBalance": 900,
  "sharesReceived": 98.5234,
  "priceImpact": 1.23,
  "newProbability": 0.51
}
```

### Test 3: Sell Position (Authenticated)

```bash
curl -X POST http://localhost:3001/api/v1/bets/<BET_ID>/sell \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Expected Response**:
```json
{
  "success": true,
  "creditsReceived": 97.34,
  "profit": -2.66,
  "priceImpact": -1.15
}
```

## Verifying Database Changes

### Check Markets Table

```sql
-- Connect to markets database
SELECT id, title, yes_reserve, no_reserve, this_odds, that_odds
FROM markets
LIMIT 5;
```

**Expected**: All markets should have `yes_reserve` and `no_reserve` values (default 1000 each for existing markets)

### Check Bets Table

```sql
-- Connect to users database
SELECT id, amount, side, shares_received, price_at_bet, status
FROM bets
ORDER BY placed_at DESC
LIMIT 5;
```

**Expected**: New bets should have `shares_received` and `price_at_bet` populated

## Troubleshooting

### Error: "EPERM: operation not permitted"

**Cause**: Backend server or another process is locking Prisma files

**Solution**:
1. Stop all Node.js processes:
   ```bash
   taskkill /F /IM node.exe
   ```
2. Wait 5 seconds
3. Run migration script again

### Error: "Market reserves are invalid"

**Cause**: Market has yesReserve or noReserve = 0

**Solution**:
```sql
-- Reset market reserves to default
UPDATE markets
SET yes_reserve = 1000, no_reserve = 1000
WHERE yes_reserve = 0 OR no_reserve = 0;
```

### Error: "No shares to sell"

**Cause**: Trying to sell a legacy bet (pre-AMM) that has sharesReceived = 0

**Solution**: This is expected behavior. Only AMM bets (new bets placed after deployment) can be sold.

### Error: TypeScript compilation fails

**Cause**: Prisma clients not regenerated

**Solution**:
```bash
npm run db:generate
```

## Rolling Back (Emergency)

If you need to rollback the AMM changes:

1. **Stop the backend server**

2. **Revert schema changes**:
   ```bash
   git checkout prisma/schema.markets.prisma
   git checkout prisma/schema.users.prisma
   ```

3. **Regenerate Prisma clients**:
   ```bash
   npm run db:generate
   ```

4. **Push old schema**:
   ```bash
   npm run db:push
   ```

5. **Start server**:
   ```bash
   npm run dev
   ```

**Note**: This will NOT delete the new columns (yes_reserve, no_reserve, shares_received, price_at_bet) from the database - they will just be ignored. To fully remove them, you'd need to run a migration.

## Monitoring After Deployment

### Check for Errors

Monitor backend logs for:
- ❌ "Market reserves are invalid"
- ❌ "AMM trade calculation failed"
- ❌ "Failed to update market reserves"

### Verify Market Reserve Updates

After a few bets are placed:

```sql
-- Check that reserves are changing (not stuck at 1000/1000)
SELECT
  id,
  title,
  yes_reserve,
  no_reserve,
  (yes_reserve + no_reserve) as total_liquidity
FROM markets
WHERE status = 'open'
ORDER BY updated_at DESC
LIMIT 10;
```

**Expected**: Reserves should vary based on betting activity

### Check Share-Based Payouts

When markets resolve:

```sql
-- Verify AMM bets are paying out correctly
SELECT
  b.id,
  b.amount as credits_spent,
  b.shares_received,
  b.actual_payout,
  b.status,
  (b.actual_payout - b.amount) as profit
FROM bets b
WHERE b.shares_received > 0
  AND b.status IN ('won', 'lost')
ORDER BY b.resolved_at DESC
LIMIT 10;
```

**Expected**:
- Won bets: `actual_payout` ≈ `shares_received`
- Lost bets: `actual_payout` = 0

## Success Criteria

✅ **Deployment is successful if**:

1. Prisma clients generate without errors
2. Database schemas push successfully
3. Backend server starts without errors
4. `npm run test:amm` passes all tests
5. Trade quotes return valid data
6. Bets can be placed with AMM
7. Positions can be sold early
8. Market reserves update after trades
9. No TypeScript compilation errors

## Next Steps

After successful deployment:

1. **Update Frontend** to display:
   - Probabilities instead of odds
   - Price impact warnings
   - Shares received preview
   - Sell position button

2. **Monitor Performance**:
   - Watch for any AMM calculation errors
   - Check database query performance
   - Monitor credit balance consistency

3. **User Communication**:
   - Announce the new share-based betting system
   - Explain how AMM pricing works
   - Provide examples of price impact

## Support

If you encounter issues during deployment:

1. Check [AMM_IMPLEMENTATION_COMPLETE.md](AMM_IMPLEMENTATION_COMPLETE.md) for implementation details
2. Review [CPMM_IMPLEMENTATION_GUIDE.md](CPMM_IMPLEMENTATION_GUIDE.md) for CPMM formulas
3. Check backend logs for specific error messages
4. Verify database connection strings in `.env`

## Files Modified During Deployment

- `backend/node_modules/.prisma/client-markets/` - Regenerated
- `backend/node_modules/.prisma/client-users/` - Regenerated
- Markets database: `markets` table gets `yes_reserve`, `no_reserve` columns
- Users database: `bets` table gets `shares_received`, `price_at_bet` columns

**Note**: These are additive changes - no data is deleted.
