# THISTHAT Frontend Architecture

## 📁 New File Structure

This document describes the improved feature-based architecture implemented for the THISTHAT application.

```
frontend/src/
├── app/
│   ├── pages/                      # Route components (page-level)
│   │   ├── BettingPage.tsx
│   │   ├── BettingPage.css
│   │   ├── LeaderboardPage.tsx
│   │   ├── LeaderboardPage.css
│   │   ├── ProfilePage.tsx
│   │   ├── ProfilePage.css
│   │   ├── WalletPage.tsx
│   │   └── WalletPage.css
│   └── components/                 # App-level components (future)
│
├── features/                       # Domain features (self-contained)
│   ├── betting/
│   │   ├── components/
│   │   │   ├── MarketCard.tsx
│   │   │   ├── MarketCard.css
│   │   │   ├── BettingControls.tsx
│   │   │   └── BettingControls.css
│   │   ├── hooks/                  # Feature-specific hooks (future)
│   │   ├── services/               # API calls & business logic (future)
│   │   └── types/                  # Feature-specific types (future)
│   │
│   ├── leaderboard/               # Future expansion
│   ├── profile/                   # Future expansion
│   └── wallet/                    # Future expansion
│
├── shared/                        # Truly shared code
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.tsx
│   │       ├── AppLayout.css
│   │       ├── TopBar.tsx
│   │       ├── TopBar.css
│   │       ├── BottomNav.tsx
│   │       └── BottomNav.css
│   ├── hooks/                     # Shared custom hooks (future)
│   ├── utils/                     # Utility functions (future)
│   ├── types/
│   │   └── index.ts              # Global type definitions
│   └── constants/                 # Global constants (future)
│
├── assets/                        # Static assets
├── styles/                        # Global styles (future)
├── App.tsx                        # Main app with routing
├── App.css
├── index.css                      # Global CSS
└── main.tsx                       # Entry point
```

## 🎯 Architecture Principles

### 1. Feature-Based Organization
Each feature is self-contained with its own:
- Components
- Hooks (custom logic)
- Services (API calls, data fetching)
- Types (feature-specific interfaces)

### 2. Clear Separation of Concerns

#### **app/pages/**
- Route-level components
- Compose feature components
- Handle page-level state and logic
- Entry points for each route

#### **features/**
- Domain-driven feature modules
- Self-contained and reusable
- Can be moved/extracted easily
- Business logic lives here

#### **shared/**
- Truly shared across multiple features
- No feature-specific logic
- Layout components
- Global types and utilities

### 3. Import Patterns

```typescript
// ✅ Correct: Type imports from shared
import type { Market, Bet } from '../../shared/types';

// ✅ Correct: Feature components in pages
import MarketCard from '../../features/betting/components/MarketCard';

// ✅ Correct: Shared layout components
import AppLayout from './shared/components/layout/AppLayout';
```

## 📝 Current Implementation

### Pages (app/pages/)
- **BettingPage**: Main betting interface with market cards and controls
- **LeaderboardPage**: Rankings and leaderboard display
- **ProfilePage**: User stats, token allocation, bet history
- **WalletPage**: Credits management, purchases, referrals

### Features (features/)
**Betting Feature**:
- `MarketCard`: Display market information
- `BettingControls`: THIS/THAT betting interface with amount input

### Shared (shared/)
**Layout Components**:
- `AppLayout`: Main app shell with header, content, footer
- `TopBar`: Header with logo, streak, credits
- `BottomNav`: Bottom navigation bar

**Types**:
- `Market`: Market data structure
- `Bet`: Bet information
- `UserStats`: User statistics
- `LeaderboardEntry`: Leaderboard entry data

## 🚀 Future Expansion

### Feature Module Example
```
features/auth/
├── components/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── AuthModal.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useSession.ts
├── services/
│   ├── authService.ts
│   └── api.ts
└── types/
    └── auth.types.ts
```

### Benefits of This Structure

1. **Scalability**: Easy to add new features without affecting existing code
2. **Maintainability**: Clear boundaries between features
3. **Testability**: Features can be tested in isolation
4. **Reusability**: Features can be extracted or shared across projects
5. **Team Collaboration**: Different teams can work on different features
6. **Code Organization**: Logical grouping reduces cognitive load

## 🔄 Migration from Old Structure

### Old Structure
```
src/app/
├── components/layout/
├── features/betting/
├── features/leaderboard/
├── features/profile/
├── features/wallet/
└── models/
```

### New Structure (Current)
```
src/
├── app/pages/          # ✨ New: Separated pages
├── features/           # ✨ Moved to top level
│   └── betting/        # ✨ Reorganized with sub-folders
├── shared/             # ✨ New: Truly shared code
│   ├── components/
│   └── types/
```

## 📋 Development Guidelines

### Adding a New Feature
1. Create feature folder in `features/`
2. Add `components/`, `hooks/`, `services/`, `types/` subdirectories
3. Keep feature self-contained
4. Export public API through index files
5. Create corresponding page in `app/pages/` if needed

### Adding a New Page
1. Create page component in `app/pages/`
2. Import feature components as needed
3. Add route in `App.tsx`
4. Keep page logic minimal (composition > logic)

### Adding Shared Code
1. Evaluate if truly shared across features
2. Place in appropriate `shared/` subdirectory
3. Avoid feature-specific logic in shared code
4. Document usage if complex

## 🎨 Styling Strategy

- Component-level CSS files (`.css`) next to components
- Global styles in `src/index.css`
- Shared layout styles in `shared/components/layout/`
- Feature-specific styles in feature folders

## 🔗 Related Documentation

- [LAYOUT.md](./LAYOUT.md) - Complete layout implementation details
- [STRUCTURE.md](./STRUCTURE.md) - Visual structure diagrams
- [PRD](./PRD) - Product requirements document

## ✅ Benefits Achieved

- ✅ **Clear mental model**: Easy to understand where code lives
- ✅ **Reduced coupling**: Features don't depend on each other
- ✅ **Better imports**: Clear import paths with type safety
- ✅ **Easier onboarding**: New developers can navigate easily
- ✅ **Future-proof**: Ready for growth and new features


