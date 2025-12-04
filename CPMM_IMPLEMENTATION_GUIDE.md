# CPMM (Automated Market Maker) Implementation Guide

## 🎯 Overview

This guide documents the implementation of a **Constant Product Market Maker (CPMM)** for the THISTHAT betting system, transforming it from a simple odds-based system to a proper Automated Market Maker (AMM) like Polymarket.

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Database schema and AMM service complete, integration pending

---

## 🔄 System Transformation

### Before (Simple Odds-Based)
```typescript
// Fixed odds from Polymarket
thisOdds = 0.65  // 65% probability
thatOdds = 0.35  // 35% probability

// Simple payout calculation
potentialPayout = betAmount / odds
```

**Problems**:
- Odds never change based on user bets
- No dynamic pricing
- Can't handle large bets without external price feed
- Not a true prediction market

### After (AMM with Dynamic Pricing)
```typescript
// Liquidity pools with reserves
yesReserve = 1000
noReserve = 1000

// CPMM formula: yesReserve * noReserve = k (constant)
k = 1,000,000

// Dynamic probability
probability = noReserve / (yesReserve + noReserve)

// Users receive shares
sharesReceived = calculateFromCPMM(stake, reserves)
```

**Benefits**:
- ✅ Prices adjust automatically based on demand
- ✅ Large bets move the price (slippage)
- ✅ Self-sustaining liquidity mechanism
- ✅ True prediction market like Polymarket
- ✅ Share-based ownership (not just payout promises)

---

## 📊 Database Changes

### 1. Markets Table (`schema.markets.prisma`)

**Added Fields**:
```prisma
model Market {
  // NEW: AMM Reserves
  yesReserve      Decimal  @default(1000.00) @map("yes_reserve") @db.Decimal(20, 8)
  noReserve       Decimal  @default(1000.00) @map("no_reserve") @db.Decimal(20, 8)

  // MODIFIED: Odds are now optional (computed from reserves)
  thisOdds        Decimal? @map("this_odds") @db.Decimal(5, 4)
  thatOdds        Decimal? @map("that_odds") @db.Decimal(5, 4)
}
```

**Migration Required**:
```sql
-- Add new columns
ALTER TABLE markets
ADD COLUMN yes_reserve DECIMAL(20, 8) DEFAULT 1000.00,
ADD COLUMN no_reserve DECIMAL(20, 8) DEFAULT 1000.00;

-- Make odds nullable
ALTER TABLE markets
ALTER COLUMN this_odds DROP NOT NULL,
ALTER COLUMN that_odds DROP NOT NULL;

-- Initialize reserves for existing markets based on current odds
UPDATE markets
SET yes_reserve = (1 - this_odds) * 2000,
    no_reserve = this_odds * 2000
WHERE yes_reserve IS NULL;
```

### 2. Bets Table (`schema.users.prisma`)

**Added Fields**:
```prisma
model Bet {
  // NEW: AMM share-based fields
  sharesReceived   Decimal  @map("shares_received") @db.Decimal(20, 8)
  priceAtBet       Decimal  @map("price_at_bet") @db.Decimal(10, 8)

  // MODIFIED: Legacy fields now optional
  oddsAtBet        Decimal? @map("odds_at_bet") @db.Decimal(5, 4)
  potentialPayout  Decimal? @map("potential_payout") @db.Decimal(18, 2)
}
```

**Migration Required**:
```sql
-- Add new columns
ALTER TABLE bets
ADD COLUMN shares_received DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN price_at_bet DECIMAL(10, 8) DEFAULT 1;

-- Make legacy fields nullable
ALTER TABLE bets
ALTER COLUMN odds_at_bet DROP NOT NULL,
ALTER COLUMN potential_payout DROP NOT NULL;

-- Backfill shares for existing bets (estimate)
UPDATE bets
SET shares_received = potential_payout,
    price_at_bet = odds_at_bet
WHERE shares_received = 0 AND status = 'pending';
```

---

## 🧮 AMM Math Explained

### The CPMM Formula

```
yesReserve * noReserve = k (constant)
```

### When User Buys YES:

```typescript
// Before trade
yesReserve = 1000
noReserve = 1000
k = 1,000,000

// User bets 100 credits on YES
stake = 100

// 1. Add stake to noReserve
newNoReserve = 1000 + 100 = 1100

// 2. Calculate new yesReserve to maintain k
newYesReserve = k / newNoReserve = 1,000,000 / 1100 = 909.09

// 3. Shares received = reduction in yesReserve
sharesReceived = 1000 - 909.09 = 90.91 shares

// 4. Price increased (slippage)
priceBefore = 1000/1000 = 1.0
priceAfter = 1100/909.09 = 1.21
```

### Price Impact Example

| Bet Size | Shares Received | Effective Price | Price Impact |
|----------|-----------------|-----------------|--------------|
| 10 | 9.95 | 1.005 | +0.5% |
| 50 | 47.62 | 1.050 | +5.0% |
| 100 | 90.91 | 1.100 | +10.0% |
| 500 | 333.33 | 1.500 | +50.0% |

**Key Insight**: Larger bets have worse prices (slippage) due to price impact.

---

## 🛠️ Implementation Status

### ✅ Completed

1. **Database Schema Updates**
   - [x] Added `yesReserve` and `noReserve` to Market model
   - [x] Added `sharesReceived` and `priceAtBet` to Bet model
   - [x] Made legacy odds fields optional
   - [x] File: `backend/prisma/schema.markets.prisma`
   - [x] File: `backend/prisma/schema.users.prisma`

2. **AMM Service Implementation**
   - [x] CPMM formula implementation
   - [x] `buyYes()` and `buyNo()` functions
   - [x] `sellYes()` and `sellNo()` functions
   - [x] Probability calculations
   - [x] Price impact calculations
   - [x] Quote functions (preview trades)
   - [x] File: `backend/src/services/amm.service.ts`

### ⏳ Pending Implementation

3. **Update Betting Services**
   - [ ] Modify `placeBet()` to use AMM instead of odds
   - [ ] Update reserve tracking in database
   - [ ] Implement share-based position tracking
   - [ ] File: `backend/src/features/betting/betting.services.ts`

4. **Update Market Resolution**
   - [ ] Change payout from `potentialPayout` to `sharesReceived`
   - [ ] Each share pays 1 credit if side wins, 0 if loses
   - [ ] File: `backend/src/features/market-resolution/market-resolution.services.ts`

5. **Add Position Selling**
   - [ ] Allow users to sell shares before resolution
   - [ ] Implement `sellPosition()` endpoint
   - [ ] Update reserves when selling
   - [ ] File: `backend/src/features/betting/betting.services.ts`

6. **Market Initialization**
   - [ ] Initialize reserves when creating markets
   - [ ] Sync reserves with Polymarket odds (initial state)
   - [ ] File: `backend/src/features/markets/markets.services.ts`

7. **Frontend Updates**
   - [ ] Show probability instead of odds
   - [ ] Display price impact before betting
   - [ ] Show shares received preview
   - [ ] Update position display (shares owned)
   - [ ] Files: `frontend/src/features/betting/`

8. **Testing**
   - [ ] Unit tests for AMM service
   - [ ] Integration tests for betting flow
   - [ ] Test price impact calculations
   - [ ] Test market resolution with shares

---

## 📝 Next Steps (Implementation Checklist)

### Step 1: Run Database Migration

```bash
cd backend

# Generate Prisma clients with new schema
npx prisma generate

# Push schema changes to database
npx prisma db push

# Or create migration
npx prisma migrate dev --name add-amm-reserves
```

### Step 2: Update Betting Service

Modify `backend/src/features/betting/betting.services.ts`:

```typescript
import { buyYes, buyNo, Pool } from '../../services/amm.service.js';

export async function placeBet(input: PlaceBetInput) {
  // ... existing validation ...

  // Get current market
  const market = await marketsPrisma.market.findUnique({
    where: { id: marketId }
  });

  // Create pool from reserves
  const pool: Pool = {
    yesReserve: Number(market.yesReserve),
    noReserve: Number(market.noReserve),
  };

  // Execute AMM trade
  const trade = input.side === 'this'
    ? buyYes(pool, input.amount, 30) // 0.3% fee
    : buyNo(pool, input.amount, 30);

  // Create bet with shares
  const bet = await usersPrisma.bet.create({
    data: {
      userId,
      marketId,
      amount: input.amount,
      side: input.side,
      sharesReceived: trade.sharesOut,
      priceAtBet: trade.effectivePrice,
      status: 'pending',
    },
  });

  // Update market reserves
  await marketsPrisma.market.update({
    where: { id: marketId },
    data: {
      yesReserve: trade.newPool.yesReserve,
      noReserve: trade.newPool.noReserve,
    },
  });

  // Return trade details
  return {
    bet,
    sharesReceived: trade.sharesOut,
    priceImpact: trade.priceImpact,
    newProbability: trade.probAfter,
  };
}
```

### Step 3: Update Market Resolution

Modify `backend/src/features/market-resolution/market-resolution.services.ts`:

```typescript
export async function resolveMarket(marketId: string, outcome: 'this' | 'that') {
  const bets = await usersPrisma.bet.findMany({
    where: { marketId, status: 'pending' }
  });

  for (const bet of bets) {
    if (bet.side === outcome) {
      // Winning bet: Pay 1 credit per share
      const payout = Number(bet.sharesReceived) * 1;

      await usersPrisma.user.update({
        where: { id: bet.userId },
        data: {
          creditBalance: { increment: payout },
          availableCredits: { increment: payout },
          overallPnL: { increment: payout - Number(bet.amount) },
        },
      });

      await usersPrisma.bet.update({
        where: { id: bet.id },
        data: {
          status: 'won',
          actualPayout: payout,
          resolvedAt: new Date(),
        },
      });
    } else {
      // Losing bet: Shares are worthless
      await usersPrisma.bet.update({
        where: { id: bet.id },
        data: {
          status: 'lost',
          actualPayout: 0,
          resolvedAt: new Date(),
        },
      });

      await usersPrisma.user.update({
        where: { id: bet.userId },
        data: {
          overallPnL: { decrement: Number(bet.amount) },
        },
      });
    }
  }

  await marketsPrisma.market.update({
    where: { id: marketId },
    data: {
      status: 'resolved',
      resolution: outcome,
      resolvedAt: new Date(),
    },
  });
}
```

### Step 4: Add Position Selling

Add to `backend/src/features/betting/betting.services.ts`:

```typescript
import { sellYes, sellNo } from '../../services/amm.service.js';

export async function sellPosition(betId: string, userId: string) {
  const bet = await usersPrisma.bet.findUnique({
    where: { id: betId }
  });

  if (!bet || bet.userId !== userId || bet.status !== 'pending') {
    throw new Error('Invalid bet or already resolved');
  }

  const market = await marketsPrisma.market.findUnique({
    where: { id: bet.marketId }
  });

  const pool: Pool = {
    yesReserve: Number(market.yesReserve),
    noReserve: Number(market.noReserve),
  };

  const shares = Number(bet.sharesReceived);

  // Sell shares back to AMM
  const trade = bet.side === 'this'
    ? sellYes(pool, shares, 30)
    : sellNo(pool, shares, 30);

  const creditsReceived = trade.sharesOut; // Actually creditsOut

  // Update user balance
  await usersPrisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: { increment: creditsReceived },
      availableCredits: { increment: creditsReceived },
      overallPnL: { increment: creditsReceived - Number(bet.amount) },
    },
  });

  // Update market reserves
  await marketsPrisma.market.update({
    where: { id: market.id },
    data: {
      yesReserve: trade.newPool.yesReserve,
      noReserve: trade.newPool.noReserve,
    },
  });

  // Mark bet as cancelled
  await usersPrisma.bet.update({
    where: { id: betId },
    data: {
      status: 'cancelled',
      actualPayout: creditsReceived,
      resolvedAt: new Date(),
    },
  });

  return {
    creditsReceived,
    profit: creditsReceived - Number(bet.amount),
  };
}
```

### Step 5: Update Frontend

Example updates for `frontend/src/features/betting/`:

```typescript
// Show probability instead of odds
const probability = (market.noReserve / (market.yesReserve + market.noReserve)) * 100;

// Preview trade before executing
const sharesPreview = quoteYes(pool, betAmount);
const priceImpact = calculatePriceImpact(pool, betAmount);

// Display
<div>
  <p>Probability: {probability.toFixed(1)}%</p>
  <p>You'll receive: {sharesPreview.toFixed(2)} shares</p>
  <p>Price impact: {priceImpact.toFixed(2)}%</p>
</div>
```

---

## 🧪 Testing Plan

### Unit Tests (AMM Service)

```typescript
describe('AMM Service', () => {
  test('buyYes increases probability', () => {
    const pool = { yesReserve: 1000, noReserve: 1000 };
    const result = buyYes(pool, 100);

    expect(result.probAfter).toBeGreaterThan(result.probBefore);
    expect(result.priceAfter).toBeGreaterThan(result.priceBefore);
  });

  test('maintains constant product', () => {
    const pool = { yesReserve: 1000, noReserve: 1000 };
    const k = 1_000_000;

    const result = buyYes(pool, 100);
    const newK = result.newPool.yesReserve * result.newPool.noReserve;

    expect(newK).toBeCloseTo(k, 1);
  });

  test('price impact increases with bet size', () => {
    const pool = { yesReserve: 1000, noReserve: 1000 };

    const small = buyYes(pool, 10);
    const large = buyYes(pool, 100);

    expect(large.priceImpact).toBeGreaterThan(small.priceImpact);
  });
});
```

### Integration Tests

1. **Test betting flow with AMM**
2. **Test market resolution with shares**
3. **Test position selling**
4. **Test concurrent bets (race conditions)**

---

## 📊 Example Scenarios

### Scenario 1: First Bet on Market

```
Initial State:
  yesReserve: 1000
  noReserve: 1000
  Probability: 50%

User A bets 100 on YES:
  New reserves: yes=909.09, no=1100
  Shares received: 90.91
  New probability: 54.7%
  Price impact: +21%
```

### Scenario 2: Market Moves Based on Betting

```
After User A's bet:
  Probability: 54.7% YES

User B bets 200 on NO (disagrees):
  New reserves: yes=1100, no=933.33
  Shares received: 166.67 NO shares
  New probability: 45.9% YES
  Price swung back towards NO
```

### Scenario 3: Resolution

```
Market resolves: YES wins

User A (90.91 YES shares):
  Payout: 90.91 * 1 = 90.91 credits
  Profit: 90.91 - 100 = -9.09 (lost due to slippage)

User B (166.67 NO shares):
  Payout: 0 credits
  Loss: -200 credits
```

---

## ⚠️ Important Considerations

### 1. Initial Liquidity

Markets need sufficient initial liquidity or small bets will have huge price impact:

```typescript
// Too little liquidity
const pool = { yesReserve: 10, noReserve: 10 };
const trade = buyYes(pool, 5); // 50% price impact!

// Better liquidity
const pool = { yesReserve: 10000, noReserve: 10000 };
const trade = buyYes(pool, 5); // 0.05% price impact
```

**Recommendation**: Initialize markets with at least 1000-10000 in each reserve.

### 2. Fees

Consider adding a small fee (0.1-0.5%) to:
- Prevent arbitrage bots
- Cover operational costs
- Incentivize liquidity provision

```typescript
const FEE_BPS = 30; // 0.3%
const trade = buyYes(pool, stake, FEE_BPS);
```

### 3. Syncing with Polymarket

When importing Polymarket markets, initialize reserves to match their probabilities:

```typescript
import { initializePoolWithProbability } from './amm.service';

const polymarketProbability = 0.65; // 65% from Polymarket
const pool = initializePoolWithProbability(2000, polymarketProbability);
// Result: { yesReserve: 700, noReserve: 1300 }
```

### 4. Large Bets

Users need to understand price impact:

```
If probability is 60% and you bet 1000 credits:
- You might push probability to 70%
- You get worse price due to slippage
- Other users can arbitrage against you
```

Show price impact warning for bets >5% of pool size.

---

## 🎯 Success Metrics

After implementation, verify:

- [ ] Probabilities update dynamically based on bets
- [ ] Constant product k remains stable
- [ ] Shares resolve correctly (1 credit per winning share)
- [ ] Position selling works without breaking reserves
- [ ] No arbitrage opportunities (besides external sync with Polymarket)
- [ ] Frontend shows accurate price impact previews
- [ ] Large bets have appropriate slippage

---

## 📚 Resources

- **Uniswap V2 Whitepaper**: https://uniswap.org/whitepaper.pdf
- **Polymarket Docs**: https://docs.polymarket.com/
- **Constant Function Market Makers**: https://arxiv.org/abs/2003.10001

---

**Status**: Ready for Step 2 (Update Betting Service)
**Last Updated**: 2025-01-XX
**Created By**: Claude Code Agent

