# THISTHAT Frontend

React + TypeScript frontend for the THISTHAT prediction market platform.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── pages/          # Page components
│   │   └── models/         # Type definitions
│   ├── features/           # Feature modules
│   │   ├── betting/
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── shared/             # Shared code
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts (AuthContext)
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── styles/            # CSS files
└── public/                 # Static assets
```

## 🔐 Authentication

The frontend uses OAuth/X authentication:

1. **PreLogin Page** (`/`) - Landing page with "Sign in with X" button
2. **AuthCallback** (`/auth/callback`) - Handles OAuth callback and stores tokens
3. **Protected Routes** (`/app/*`) - All app routes require authentication via `RequireAuth` component

### AuthContext

The `AuthContext` provides:
- `user` - Current user data
- `loading` - Loading state
- `isAuthenticated` - Boolean indicating auth status
- `refreshUser()` - Refresh user data from API
- `logout()` - Logout and clear session

### API Services

- `api.ts` - Base API service with automatic token refresh
- `authService.ts` - Authentication operations (getCurrentUser, logout, refreshToken)
- `betService.ts` - Betting operations (placeBet, getUserBets)
- `marketService.ts` - Market fetching (getMarkets with MongoDB/PostgreSQL support)

## 🎯 Key Features

### Pages
- **HomePage** (`/app`) - Main dashboard
- **BettingPage** (`/app/play`) - Market betting interface
- **LeaderboardPage** (`/app/leaderboard`) - User rankings
- **ProfilePage** (`/app/profile`) - User profile with stats and logout

### Components
- **RequireAuth** - Route protection component
- **TopBar** - Header with user credits
- **NavigationTabs** - Bottom navigation
- **SwipeableCard** - Swipeable market card with bet placement modal
- **SwipedMarketsContext** - Global context for tracking swiped markets (persists in localStorage)

## 🔧 Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3001
```

## 📦 Dependencies

- **React** 19.2.0
- **React Router** 7.9.6
- **TypeScript** 5.9.3
- **Vite** 7.2.2
- **Tailwind CSS** 3.4.18
- **Lucide React** - Icons

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📚 Documentation

- **ARCHITECTURE.md** - Architecture overview
- **LAYOUT.md** - Layout and design system
- **STRUCTURE.md** - Detailed file structure

## ✅ Current Status

- ✅ Authentication system integrated
- ✅ Profile page connected to backend
- ✅ Route protection implemented
- ✅ Real-time user data display
- ✅ Logout functionality
- ✅ Betting/swiping integration complete
- ✅ Swiped markets tracking (persists across navigation)
- ✅ Profile page shows real bet data (Positions/Previous Activity)
- ✅ Market fetching from MongoDB/PostgreSQL with fallback

## 🔗 Backend Integration

The frontend connects to the backend API at `/api/v1/*`:
- Authentication: `/api/v1/auth/*`
- Markets: `/api/v1/markets/*`
- Betting: `/api/v1/bets/*`
- Leaderboard: `/api/v1/leaderboard/*`
- Economy: `/api/v1/economy/*`
- Transactions: `/api/v1/transactions/*`
- Referrals: `/api/v1/referrals/*`
- Purchases: `/api/v1/purchases/*`
