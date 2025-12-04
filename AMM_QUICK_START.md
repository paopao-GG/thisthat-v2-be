# AMM Quick Start Guide

## 🚀 Deploy AMM in 5 Minutes

### Step 1: Stop Backend (1 min)
```bash
# Press Ctrl+C in terminal running backend
```

### Step 2: Run Migration (2 min)
```bash
cd backend
migrate-amm.bat
# Press Enter when prompted
```

### Step 3: Start Backend (1 min)
```bash
npm run dev
```

### Step 4: Test (1 min)
```bash
npm run test:amm
```

**Expected**: ✅ All AMM endpoint tests passed!

---

## 📝 What Changed?

### For Users (Frontend Updates Needed)
- **Before**: Bet 100 credits at 2.0x odds → Win 200 credits
- **After**: Bet 100 credits → Receive 98.5 shares → Shares worth 1 credit each if you win

### For Developers
- Markets now have `yesReserve` and `noReserve` (AMM liquidity pools)
- Bets track `sharesReceived` and `priceAtBet`
- Prices adjust dynamically based on betting activity
- Users can sell positions early before market resolves

---

## 🔌 New API Endpoints

### 1. Get Quote (Public)
```bash
GET /api/v1/bets/quote?marketId=<UUID>&amount=100&side=this
```
Returns preview of trade without executing

### 2. Place Bet (Updated)
```bash
POST /api/v1/bets
{
  "marketId": "<UUID>",
  "amount": 100,
  "side": "this"
}
```
Now returns `sharesReceived`, `priceImpact`, `newProbability`

### 3. Sell Position (Updated)
```bash
POST /api/v1/bets/:betId/sell
```
Now returns `creditsReceived`, `profit`, `priceImpact`

---

## 🎯 Frontend Updates Needed

### 1. Market Display
```tsx
// OLD
<div>Odds: {market.thisOdds}x</div>

// NEW
<div>Probability: {(market.thisProbability * 100).toFixed(1)}%</div>
```

### 2. Betting Interface
```tsx
// Add before bet button
const quote = await fetch(`/api/v1/bets/quote?marketId=${id}&amount=${amount}&side=${side}`);
<div>You'll receive: {quote.sharesReceived.toFixed(2)} shares</div>
{quote.priceImpact > 5 && <div>⚠️ High price impact: {quote.priceImpact}%</div>}
```

### 3. Position Display
```tsx
// Show current value of shares
<div>Shares: {bet.sharesReceived.toFixed(2)}</div>
<div>Current value: {currentValue} credits</div>
<button onClick={sellPosition}>Sell Now</button>
```

---

## 🐛 Troubleshooting

### "EPERM: operation not permitted"
**Fix**: Backend still running. Stop it and retry.

### "Market reserves are invalid"
**Fix**: Run Prisma migration again:
```bash
npm run db:push
```

### TypeScript errors
**Fix**: Regenerate Prisma clients:
```bash
npm run db:generate
```

---

## 📚 Documentation

- **[AMM_DEPLOYMENT_GUIDE.md](AMM_DEPLOYMENT_GUIDE.md)** - Full deployment guide
- **[AMM_IMPLEMENTATION_COMPLETE.md](AMM_IMPLEMENTATION_COMPLETE.md)** - Implementation details
- **[CPMM_IMPLEMENTATION_GUIDE.md](CPMM_IMPLEMENTATION_GUIDE.md)** - Technical specifications

---

## ✅ Success Checklist

- [ ] Backend stopped
- [ ] Migration script ran successfully
- [ ] Backend restarted
- [ ] `npm run test:amm` passes
- [ ] Can get trade quotes
- [ ] Can place AMM bets
- [ ] Can sell positions
- [ ] No TypeScript errors

---

## 🎉 You're Done!

Your betting platform now uses:
- ✅ Dynamic pricing via CPMM formula
- ✅ Share-based positions
- ✅ Early exit capability
- ✅ Fair market discovery
- ✅ Polymarket-compatible system

Next: Update frontend to show probabilities, shares, and price impact!
