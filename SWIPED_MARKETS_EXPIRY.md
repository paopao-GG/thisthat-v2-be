# 🔄 Swiped Markets Auto-Reappear Feature

## ✅ **What Changed:**

Markets that users swipe/skip will now **automatically reappear after 2 days**, giving users fresh content to bet on.

## 🎯 **How It Works:**

### **Before:**
- User swipes on a market (left or right)
- Market is permanently hidden
- User never sees it again (until they clear their history)

### **After:**
- User swipes on a market
- Market is hidden for **2 days**
- After 2 days, market automatically reappears
- User can swipe on it again

## 📊 **Technical Implementation:**

### **Data Structure:**
```typescript
interface SwipedMarketData {
  marketId: string;
  swipedAt: number; // Timestamp in milliseconds
}
```

**Old format:**
```json
["market-id-1", "market-id-2", "market-id-3"]
```

**New format:**
```json
[
  { "marketId": "market-id-1", "swipedAt": 1701619200000 },
  { "marketId": "market-id-2", "swipedAt": 1701705600000 }
]
```

### **Auto-Migration:**
The system automatically migrates old localStorage data to the new format on first load.

## ⚙️ **Configuration:**

### **Expiry Time:**
```typescript
const EXPIRY_DAYS = 2; // Markets reappear after 2 days
```

To change the expiry time, edit this constant in:
- `frontend/src/shared/contexts/SwipedMarketsContext.tsx` (line 27)

### **Check Interval:**
The system checks for expired markets:
1. **On load** - When user opens the app
2. **Every 5 minutes** - Automatic background check
3. **On each swipe check** - When determining if a market should be shown

## 🔍 **Features:**

### **1. Automatic Expiry:**
```typescript
const isMarketSwiped = (marketId: string) => {
  const swipedAt = swipedMarketsData.get(marketId);
  if (!swipedAt) return false;

  const timeSinceSwiped = Date.now() - swipedAt;
  if (timeSinceSwiped >= EXPIRY_MS) {
    // Auto-remove expired market
    unmarkMarketAsSwiped(marketId);
    return false;
  }

  return true;
};
```

### **2. Background Cleanup:**
```typescript
// Checks every 5 minutes for expired markets
useEffect(() => {
  const interval = setInterval(() => {
    clearExpiredMarkets();
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, [swipedMarketsData]);
```

### **3. Load-Time Cleanup:**
When the user opens the app, expired markets are automatically removed from storage.

## 🧪 **Testing:**

### **Browser Console Commands:**

```javascript
// 1. View all swiped markets with timestamps
window.testSwipedMarkets.getSwipedMarketsWithTimestamps(userId);

// 2. Simulate an expired market (3 days ago)
window.testSwipedMarkets.simulateExpiredMarket(userId, 'market-id-123');

// 3. Simulate a recent market (1 day ago)
window.testSwipedMarkets.simulateRecentMarket(userId, 'market-id-456');
```

### **Test Scenarios:**

#### **Test 1: Expired Market Reappears**
```javascript
// 1. Get your user ID (check localStorage or AuthContext)
const userId = 'user-123';

// 2. Simulate an expired market
window.testSwipedMarkets.simulateExpiredMarket(userId, 'test-market-1');

// 3. Reload the page

// 4. Check swiped markets - should be removed
window.testSwipedMarkets.getSwipedMarketsWithTimestamps(userId);

// Expected: Market should be gone from swiped list
```

#### **Test 2: Recent Market Stays Hidden**
```javascript
// 1. Simulate a recent market (1 day old)
window.testSwipedMarkets.simulateRecentMarket(userId, 'test-market-2');

// 2. Check swiped markets
window.testSwipedMarkets.getSwipedMarketsWithTimestamps(userId);

// Expected: Market should still be in swiped list
// daysSince: 1
// expired: false
```

## 📝 **User Experience:**

### **Scenario 1: Normal Swiping**
1. User sees market "Will BTC hit $100k?"
2. User swipes left (skip)
3. Market disappears
4. 2 days later, market reappears
5. User can swipe on it again

### **Scenario 2: Multiple Sessions**
1. Day 1: User swipes on 10 markets
2. Day 2: User swipes on 5 more markets
3. Day 3: First 10 markets reappear, last 5 still hidden
4. Day 4: All 15 markets have reappeared

### **Scenario 3: After Placing Bet**
- If user **places a bet** on a market, it's marked as swiped
- After 2 days, market reappears
- User can see their previous bet and potentially bet again (if allowed)

## 🔧 **Maintenance:**

### **Clear All Swiped Markets (Admin/Debug):**
```typescript
const { clearSwipedMarkets } = useSwipedMarkets();
clearSwipedMarkets(); // Removes all swiped markets for current user
```

### **Manual Expiry Check:**
```typescript
const { clearExpiredMarkets } = useSwipedMarkets();
clearExpiredMarkets(); // Manually remove expired markets
```

## 📊 **Storage Format Example:**

### **localStorage:**
```json
{
  "swipedMarkets_user-abc123": [
    {
      "marketId": "market-1",
      "swipedAt": 1701619200000
    },
    {
      "marketId": "market-2",
      "swipedAt": 1701705600000
    }
  ]
}
```

## ⚠️ **Important Notes:**

### **1. Per-User Storage:**
- Each user has their own swiped markets list
- Stored as `swipedMarkets_{userId}`
- Switching users = different swiped list

### **2. Browser Storage:**
- Data stored in localStorage (persists across sessions)
- Clearing browser data = loses swiped history
- Incognito mode = fresh start

### **3. Time Zone Independent:**
- Uses `Date.now()` (UTC milliseconds)
- Works regardless of user's timezone

### **4. Migration Safe:**
- Old format (string array) auto-converts to new format
- No data loss on upgrade

## 🎯 **Summary:**

**Feature**: ✅ **Complete and Ready**

**What it does:**
- Tracks when each market was swiped
- Auto-removes markets after 2 days
- Markets reappear and can be swiped again
- Keeps localStorage clean

**Benefits:**
- Users never truly "run out" of markets
- Fresh content rotation every 2 days
- Better user retention
- Reduced likelihood of empty screens

**Action Required:** None - feature works automatically!

---

**Status**: ✅ Production Ready
**Expiry Time**: 2 days (configurable)
**Storage**: localStorage per user
**Cleanup**: Automatic
