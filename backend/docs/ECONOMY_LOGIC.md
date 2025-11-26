# Economy Logic Documentation - V1 (Credits Only)

## Overview

The economy system implements a comprehensive **credits-based economy** with stock trading, daily rewards, and transaction signing.

**V1 Scope:**
- ✅ Credits system only (no $THIS token)
- ✅ Daily credit allocation
- ✅ Stock market trading
- ✅ Transaction signing
- ❌ No token economics
- ❌ No token staking/unlocking
- ❌ No withdrawals or cashouts

**Note:** This is V1 implementation focusing exclusively on credits. Token economics ($THIS) will be introduced in V2/V3 per PRD.

## Database Schema Updates

### User Model Additions
- `availableCredits` - Credits available for trading (separate from locked credits)
- `expendedCredits` - Total credits spent across all transactions
- `consecutiveDaysOnline` - Tracks consecutive login days for bonus rewards
- `lastLoginAt` - Timestamp of last login for streak calculation

### New Models

#### Stock
- Tradeable assets in the economy
- Fields: symbol, name, currentPrice, totalSupply, circulatingSupply, marketCap
- Supports multipliers and leverage (1x to maxLeverage)

#### StockHolding
- User's stock portfolio
- Tracks shares, average buy price, total invested, leverage

#### StockTransaction
- All buy/sell transactions with cryptographic signing
- Includes transaction hash for verification
- Tracks balance before/after for audit

## Daily Credit Allocation

### Logic
- Base allocation: **1,000 credits** on Day 1
- Consecutive claims add **+500 credits per day** up to 10,000 credits on Day 18
- Once the 10,000-credit max is reached it stays there until a user misses a claim

### Consecutive Days Calculation
- Claiming within the same UTC date is blocked (users see the next UTC midnight timestamp)
- Missing one UTC day resets the streak to Day 1 (1,000 credits)
- Streak calculations are based on `lastDailyRewardAt` rather than last login time

### Scheduler
- Background job runs nightly at **00:00 UTC** and processes every eligible account
- Manual claims are still available via `POST /api/v1/economy/daily-credits`
- Cron job also executes immediately on server boot during development for convenience

## Stock Market System

### Buy Stocks
- Requires: stockId, shares, leverage (1x-10x)
- Calculates: `totalCost = shares * price * leverage`
- Validates: Sufficient available credits
- Updates: User credits, stock supply, creates transaction

### Sell Stocks
- Requires: stockId, shares
- Calculates: `proceeds = shares * currentPrice`
- Calculates profit: `proceeds - costBasis`
- Updates: User credits, PnL, stock supply

### Leverage
- Multiplies buying power
- Example: 100 credits with 5x leverage = 500 credits worth of shares
- Risk: Higher leverage = higher potential profit/loss

### Supply Mechanics
- `circulatingSupply` increases on buy
- `circulatingSupply` decreases on sell
- `marketCap = currentPrice * circulatingSupply`

## Transaction Signing

### Hash Generation
- Uses SHA-256 hash of: userId, stockId, type, shares, price, timestamp, nonce
- Ensures transaction integrity and prevents tampering
- Unique hash per transaction

### Verification
- Hash format validation (64 hex characters)
- Can be extended for full cryptographic verification

## API Endpoints

### Economy Routes (`/api/v1/economy`)

#### POST `/daily-credits`
- Claim daily credit allocation
- Returns: creditsAwarded, consecutiveDays, nextAvailableAt

#### POST `/buy`
- Buy stocks with leverage
- Body: { stockId, shares, leverage }
- Returns: transaction, holding, newBalance

#### POST `/sell`
- Sell stocks
- Body: { stockId, shares }
- Returns: transaction, holding, newBalance, profit

#### GET `/portfolio`
- Get user's stock portfolio
- Returns: Array of holdings with profit calculations

#### GET `/stocks`
- Get all available stocks (public)
- Returns: Array of stocks

## Frontend Integration

### StockMarketPage Component
- Displays all available stocks
- Shows user portfolio and stats
- Trading interface with buy/sell
- Leverage selector for buying
- Real-time profit/loss calculations

### EconomyService
- API client for all economy endpoints
- TypeScript types for all data structures

## Background Jobs

### Daily Credits Job
- Location: `src/jobs/daily-credits.job.ts`
- Scheduled with `node-cron` to run nightly at **00:00 UTC**
- Processes all eligible users and also runs once on server startup so developers don't have to wait until midnight
- Aligns with PRD rule that claims reset at midnight UTC instead of a rolling 24-hour window
- Stopped on graceful shutdown

## Usage Examples

### Claim Daily Credits
```typescript
const result = await economyService.claimDailyCredits();
// Returns: { creditsAwarded: 110, consecutiveDays: 2, nextAvailableAt: Date }
```

### Buy Stocks
```typescript
const result = await economyService.buyStock('stock-id', 10, 5); // 10 shares with 5x leverage
// Returns: { transaction, holding, newBalance }
```

### Sell Stocks
```typescript
const result = await economyService.sellStock('stock-id', 5); // Sell 5 shares
// Returns: { transaction, holding, newBalance, profit }
```

## V1 Scope Clarification

**Important:** This implementation is V1 only, focusing exclusively on credits:

✅ **Included in V1:**
- Credits system (starting balance, daily rewards)
- Stock market trading with credits
- Transaction signing and audit trail
- Consecutive day bonuses
- Portfolio tracking
- Leaderboards (PnL and Volume)

❌ **NOT in V1 (Deferred to V2/V3):**
- $THIS token economics
- Token staking/unlocking mechanisms
- Token allocation based on rankings
- Credit-to-token conversion
- Withdrawals or cashouts
- Wallet integration (MetaMask, Phantom)
- USDC/real-money betting

**Per PRD Section 2:** V1 is credits-only to gather user behavior data and validate engagement before introducing token economics in later versions.

## Next Steps

1. **Run Database Migration**
   ```bash
   cd backend
   npx prisma db push
   ```

2. **Seed Initial Stocks** (optional)
   - Create stocks via admin API or Prisma Studio
   - Example stocks: "THIS", "THAT", "POLY" (credit-based only)

3. **Test Economy Flow**
   - Sign up → Get starting credits (1000)
   - Claim daily credits (100 + consecutive day bonus)
   - Buy stocks with credits
   - Sell stocks for credits
   - Check portfolio and profit/loss

4. **Monitor Background Jobs**
   - Check server logs for daily credit job execution
   - Job runs every 24 hours automatically

