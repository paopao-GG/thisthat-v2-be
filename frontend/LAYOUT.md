# THISTHAT Frontend Layout Documentation

This document describes the complete layout structure for the THISTHAT prediction market betting application.

## 🏗️ Architecture Overview

The application follows a feature-based architecture with clear separation of concerns:

```
frontend/src/
├── app/
│   ├── components/
│   │   └── layout/           # Shared layout components
│   │       ├── AppLayout.tsx     # Main app shell
│   │       ├── TopBar.tsx        # Header with credits & streak
│   │       └── BottomNav.tsx     # Bottom navigation bar
│   ├── features/              # Feature modules
│   │   ├── betting/           # Main betting interface
│   │   │   ├── BettingPage.tsx
│   │   │   ├── MarketCard.tsx
│   │   │   └── BettingControls.tsx
│   │   ├── leaderboard/       # Rankings & leaderboard
│   │   │   └── LeaderboardPage.tsx
│   │   ├── profile/           # User profile & stats
│   │   │   └── ProfilePage.tsx
│   │   └── wallet/            # Credits & purchases
│   │       └── WalletPage.tsx
│   └── models/                # TypeScript interfaces
│       └── Market.ts          # Data models
├── App.tsx                    # Main app with routing
├── App.css
├── index.css                  # Global styles
└── main.tsx                   # Entry point
```

## 📱 Pages & Features

### 1. Betting Page (Home) - `/`
**Main swipe betting interface**

**Components:**
- `MarketCard`: Displays market information (title, description, odds, expiry)
- `BettingControls`: THIS/THAT buttons with bet amount input
- Swipe navigation hints

**Features:**
- Tap THIS or THAT to select betting option
- Input bet amount with quick-select buttons (100, 250, 500, 1000)
- Real-time potential payout calculation
- Swipe up/down for next/previous market (UI ready, touch handlers can be added)
- Market indicator showing current position

### 2. Leaderboard Page - `/leaderboard`
**Rankings of top performers**

**Features:**
- Time filter (Daily, Weekly, All-time)
- Ranked list with medals for top 3
- Display: Volume, PnL, Win Rate, Total Bets
- $THIS token allocation shown for each user
- User avatar placeholders

### 3. Profile Page - `/profile`
**User stats and betting history**

**Features:**
- User avatar and rank display
- Stats grid showing:
  - Credits balance
  - Total volume
  - PnL (Profit & Loss)
  - Win rate percentage
  - Daily streak
  - Total bets count
- Token allocation card:
  - Total allocated $THIS tokens
  - Locked vs Unlocked breakdown
  - Info about unlocking with credits
- Recent bets list with status (Won, Lost, Pending)

### 4. Wallet Page - `/wallet`
**Credits management and purchases**

**Features:**
- Balance display card
- Daily rewards section with streak tracking
- Credit purchase options (4 tiers)
  - 500 credits - $4.99
  - 1000 credits - $9.99
  - 2500 credits - $19.99 (Most Popular)
  - 5000 credits - $34.99
- Referral system:
  - Shareable referral code
  - Track friends referred
  - Credits earned from referrals
- V2 notice (USDC wallet coming soon)

## 🎨 Design System

### Color Palette
- **Primary Gradient**: #667eea → #764ba2 (Purple)
- **Secondary Gradient**: #f093fb → #f5576c (Pink)
- **Background**: #0a0a0f → #1a1a2e (Dark gradient)
- **Success**: #4ade80 (Green)
- **Error**: #f87171 (Red)
- **Warning**: #fbbf24 (Yellow/Gold)

### Typography
- **Primary Font**: Inter, System UI
- **Weights**: 400 (regular), 600 (semibold), 700 (bold), 800 (extrabold)

### Components Style
- **Border Radius**: 8px (small), 12px (medium), 16px (large), 20-24px (cards)
- **Spacing**: 0.25rem increments
- **Cards**: Glass-morphism effect with backdrop blur
- **Buttons**: Gradient backgrounds with hover effects
- **Badges**: Rounded with semi-transparent backgrounds

## 🧩 Layout Components

### TopBar
- Logo (THIS<THAT>)
- Daily streak indicator (🔥)
- Credits balance (💰)
- Fixed at top, glass-morphism background

### BottomNav
- 4 navigation items:
  - 🎯 Bet (Home)
  - 🏆 Ranks (Leaderboard)
  - 👤 Profile
  - 💳 Wallet
- Active state with top indicator line
- Fixed at bottom with safe area support

### AppLayout
- Container for TopBar + Content + BottomNav
- Gradient background
- Scrollable content area
- Proper spacing for fixed headers/footers

## 📊 Data Models

### Market
```typescript
{
  id, title, description,
  thisOption, thatOption,
  thisOdds, thatOdds,
  expiryDate, category, liquidity, imageUrl?
}
```

### Bet
```typescript
{
  id, marketId, userId, option,
  amount, odds, timestamp, status, payout?
}
```

### UserStats
```typescript
{
  userId, username, credits, totalVolume,
  totalPnL, rank, winRate, totalBets,
  dailyStreak, tokenAllocation, lockedTokens
}
```

### LeaderboardEntry
```typescript
{
  rank, userId, username, avatar?,
  volume, pnl, winRate, totalBets, tokenAllocation
}
```

## 🎯 Next Steps (Backend Integration)

1. **API Integration**
   - Connect to Polymarket Builder API for market data
   - Implement credit ledger API
   - User authentication system
   - Bet placement and tracking

2. **Real-time Updates**
   - WebSocket for live odds updates
   - Real-time leaderboard updates
   - Live bet status changes

3. **State Management**
   - Add Context API or Redux for global state
   - User session management
   - Credits/balance management

4. **Touch Gestures**
   - Implement swipe handlers for market navigation
   - Pull-to-refresh functionality
   - Touch animations

5. **Additional Features**
   - Market search and filtering
   - Bet history with pagination
   - Push notifications for bet results
   - Social sharing features

## 🚀 Running the Application

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 to view the application.

## 📝 Notes

- All data is currently mocked - ready for API integration
- Responsive design for mobile-first experience
- TypeScript for type safety
- CSS modules for component styling
- React Router for navigation
- Follows PRD requirements from frontend/PRD

## 🎨 Design Principles

1. **Mobile-First**: Optimized for mobile devices (320px+)
2. **Touch-Friendly**: Large tap targets, swipe gestures
3. **Performance**: Lightweight animations, optimized rendering
4. **Accessibility**: Semantic HTML, keyboard navigation ready
5. **Visual Hierarchy**: Clear focus on betting actions
6. **Gamification**: Streaks, ranks, rewards clearly displayed

