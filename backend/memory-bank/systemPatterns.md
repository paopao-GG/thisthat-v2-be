# System Patterns

## Architecture Overview

### High-Level Design
```
┌─────────────────┐
│   React Web     │
│   Frontend      │
└────────┬────────┘
         │ HTTPS/REST
         │
┌────────▼────────────────────────────────────┐
│         Fastify API Server                  │
│  ┌──────────────────────────────────────┐  │
│  │  Auth Module (JWT) ✅                │  │
│  │  User Module (Profiles) ✅            │  │
│  │  Betting Module (Placement, Payout) ✅│  │
│  │  Economy Module (Daily Credits, Stocks) ✅│
│  │  Sync Module (MongoDB→PostgreSQL) ✅  │  │
│  │  Market Module (Ingestion, Display) ✅│  │
│  │  Leaderboard Module (Rankings) ✅     │  │
│  │  Market Resolution Module ✅          │  │
│  │  Transaction History Module ✅        │  │
│  │  Referral Module (Codes, Stats) ✅    │  │
│  │  Purchase Module (Packages) ✅        │  │
│  └──────────────────────────────────────┘  │
└────────┬─────────────────────┬──────────────┘
         │                     │
    ┌────▼─────┐        ┌─────▼──────┐
    │PostgreSQL│        │   Redis    │
    │(Primary) │        │  (Cache)   │
    └──────────┘        └────────────┘
         │
    ┌────▼────────────┐
    │  Polymarket API │
    │  (External)     │
    └─────────────────┘
```

## Key Technical Decisions

### 1. Module-Based Architecture
**Decision:** Organize code by feature modules, not by technical layer

**Structure:**
```
features/
├── auth/          # Authentication (JWT, signup, login) ✅
├── users/         # User management (profiles) ✅
├── betting/       # Betting logic (place, history) ✅
├── economy/       # Economy system (daily credits, stocks) ✅
├── sync/          # MongoDB ↔ PostgreSQL sync ✅
├── fetching/      # Polymarket data fetching ✅
├── leaderboard/   # Ranking system ✅
├── referrals/     # Referral codes and stats ✅
├── purchases/     # Credit purchase packages ✅
└── transactions/  # Transaction history ✅
```

**Rationale:**
- High cohesion within modules
- Easy to locate related code
- Clear boundaries for testing
- Scalable to microservices (future)

### 2. Controller-Service Pattern
**Pattern:**
```typescript
// auth.controller.ts - HTTP layer
export async function loginController(req, reply) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return reply.send(result);
}

// auth.service.ts - Business logic layer
export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    throw new InvalidCredentialsError();
  }
  const tokens = generateTokens(user);
  return { user, ...tokens };
}
```

**Responsibilities:**
- **Controller:** Request/response handling, validation
- **Service:** Business logic, database operations
- **Routes:** URL mapping, middleware attachment

### 3. Database Transaction Pattern
**Critical for:** Bet placement, market resolution, credit operations

**Pattern:**
```typescript
async function placeBet(userId, marketId, amount, side) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock user row and check balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true }
    });

    if (user.creditBalance < amount) {
      throw new InsufficientBalanceError();
    }

    // 2. Get market and calculate payout
    const market = await tx.market.findUnique({ where: { id: marketId } });
    const odds = side === 'this' ? market.thisOdds : market.thatOdds;
    const potentialPayout = amount / odds;

    // 3. Deduct credits
    await tx.user.update({
      where: { id: userId },
      data: {
        creditBalance: { decrement: amount },
        totalVolume: { increment: amount }
      }
    });

    // 4. Create bet
    const bet = await tx.bet.create({
      data: { userId, marketId, amount, side, oddsAtBet: odds, potentialPayout }
    });

    // 5. Log transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        transactionType: 'bet_placed',
        referenceId: bet.id,
        balanceAfter: user.creditBalance - amount
      }
    });

    return bet;
  });
}
```

**Key principles:**
- Atomic operations (all-or-nothing)
- Row-level locking to prevent race conditions
- Consistent state across related tables

### 4. JWT Authentication Flow
**Pattern:**
```
1. User logs in → Server validates credentials
2. Server generates access token (15min) + refresh token (7d)
3. Access token stored in memory (frontend)
4. Refresh token stored in httpOnly cookie (optional) or local storage
5. Every API request includes: Authorization: Bearer <access-token>
6. When access token expires, use refresh token to get new pair
7. On logout, invalidate refresh token in database
```

**Implementation:**
```typescript
// Generate tokens
function generateTokens(user: User) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token hash in database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return { accessToken, refreshToken };
}

// Verify middleware
async function authenticateRequest(req, reply) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  req.user = decoded;
}
```

### 5. Caching Strategy
**Three-tier approach:**

**Tier 1: Application Cache (Redis)**
```typescript
// Market listings - 1 minute TTL
async function getMarkets(filters) {
  const cacheKey = `markets:${JSON.stringify(filters)}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const markets = await prisma.market.findMany({ where: filters });
  await redis.setex(cacheKey, 60, JSON.stringify(markets));

  return markets;
}

// Leaderboard - 5 minute TTL
async function getLeaderboard(type: 'pnl' | 'volume') {
  const cacheKey = `leaderboard:${type}`;
  const cached = await redis.zrevrange(cacheKey, 0, 99, 'WITHSCORES');

  if (cached.length > 0) return formatLeaderboard(cached);

  // Rebuild cache from database
  const users = await prisma.user.findMany({
    orderBy: type === 'pnl' ? { overallPnL: 'desc' } : { totalVolume: 'desc' },
    take: 100
  });

  // Populate Redis sorted set
  for (const user of users) {
    const score = type === 'pnl' ? user.overallPnL : user.totalVolume;
    await redis.zadd(cacheKey, score, user.id);
  }

  await redis.expire(cacheKey, 300);
  return users;
}
```

**Tier 2: Database Query Optimization**
- Use indexes on frequently queried columns
- Select only needed fields
- Use pagination (limit/offset)
- Avoid N+1 queries (use Prisma includes)

**Tier 3: CDN (Future)**
- Static assets
- API responses (GET only, public data)

### 6. Error Handling Pattern
**Centralized error handling:**

```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super('Insufficient credit balance', 400, 'INSUFFICIENT_BALANCE');
  }
}

// Global error handler
app.setErrorHandler((error, req, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
  }

  // Unexpected errors
  logger.error({ err: error, req }, 'Unexpected error');
  return reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500
  });
});
```

### 7. Polymarket Integration Pattern
**Background job for market ingestion:**

```typescript
// jobs/market-ingestion.ts
async function ingestPolymarketMarkets() {
  try {
    logger.info('Starting Polymarket market ingestion');

    // 1. Fetch active markets from Polymarket
    const polymarkets = await polymarketClient.getMarkets({
      active: true,
      limit: 100
    });

    // 2. Transform and upsert to database
    for (const pm of polymarkets) {
      await prisma.market.upsert({
        where: { polymarketId: pm.condition_id },
        create: {
          polymarketId: pm.condition_id,
          title: pm.question,
          description: pm.description,
          thisOption: pm.outcomes[0],
          thatOption: pm.outcomes[1],
          thisOdds: pm.outcomes[0].price,
          thatOdds: pm.outcomes[1].price,
          liquidity: pm.volume,
          category: pm.category || 'Uncategorized',
          marketType: 'polymarket',
          status: pm.closed ? 'closed' : 'open',
          expiresAt: new Date(pm.end_date_iso)
        },
        update: {
          thisOdds: pm.outcomes[0].price,
          thatOdds: pm.outcomes[1].price,
          liquidity: pm.volume,
          status: pm.closed ? 'closed' : 'open'
        }
      });
    }

    // 3. Invalidate market cache
    await redis.del('markets:*');

    logger.info({ count: polymarkets.length }, 'Market ingestion complete');
  } catch (error) {
    logger.error({ err: error }, 'Market ingestion failed');
  }
}

// Run every 5 minutes
setInterval(ingestPolymarketMarkets, 5 * 60 * 1000);
```

## Component Relationships

### Critical Implementation Paths

#### Path 1: User Registration → First Bet
```
1. POST /api/v1/auth/register
   → Validate input
   → Hash password (bcrypt)
   → Create user with 1000 starting credits
   → Generate JWT tokens
   → Return user + tokens

2. GET /api/v1/markets
   → Check cache (Redis)
   → If miss, query database
   → Filter by status='open'
   → Cache results (60s TTL)
   → Return markets

3. POST /api/v1/bets
   → Verify JWT token
   → Validate market exists and is open
   → Start database transaction
     → Check user balance
     → Deduct credits
     → Create bet record
     → Log credit transaction
     → Update user volume
   → Commit transaction
   → Return bet details
```

#### Path 2: Market Resolution → Payout
```
1. Job: Check for resolved Polymarket markets
   → Fetch resolutions from Polymarket API
   → For each resolved market:
     → Update market status to 'resolved'
     → Get all pending bets for market
     → Batch process:
       → Winning bets: Calculate payout, credit user
       → Losing bets: Mark as lost, update PnL
       → Invalid: Refund credits
     → Update user PnL and balances
     → Create credit transactions

2. Job: Recalculate leaderboards
   → Query top 100 users by PnL
   → Update rank_by_pnl field
   → Populate Redis sorted set
   → Query top 100 users by volume
   → Update rank_by_volume field
   → Populate Redis sorted set
```

#### Path 3: Daily Reward Claim
```
1. POST /api/v1/economy/daily-credits
   → Verify JWT token
   → Check last_daily_reward_at timestamp
   → If >= 24h UTC or null:
     → Start transaction
       → Calculate credits (1000 start, +500/day up to 10000 max)
       → Credit calculated amount to user
       → Update last_daily_reward_at to NOW()
       → Update consecutiveDaysOnline
       → Create daily_rewards record
       → Create credit_transaction record
     → Commit transaction
     → Return reward details
   → Else:
     → Return error with next available time
```

#### Path 4: Referral Signup Flow
```
1. POST /api/v1/auth/signup
   → Validate email/username/password/name
   → Check optional referralCode parameter
   → If referralCode provided:
     → Find referrer by referralCode
     → Start transaction:
       → Create new user
       → Generate 8-character referral code for new user
       → Credit 200 credits to referrer
       → Increment referrer.referralCount
       → Update referrer.referralCreditsEarned
       → Link new user to referrer (referredBy field)
       → Create credit_transaction for referrer bonus
     → Commit transaction
   → Else:
     → Create user normally
   → Generate JWT tokens
   → Return user + tokens
```

#### Path 5: Credit Purchase Flow
```
1. GET /api/v1/purchases/packages
   → Return list of available packages (Starter, Boost, Pro, Whale)
   → Each package includes: id, credits, usd price, label

2. POST /api/v1/purchases
   → Verify JWT token
   → Validate packageId (must be valid package)
   → Start transaction:
     → Get package details
     → Create creditPurchase record (status: 'completed', provider: 'manual' for V1)
     → Credit package.credits to user balance
     → Update user.availableCredits
     → Create credit_transaction record
     → Generate SHA-256 transaction hash
   → Commit transaction
   → Return purchase confirmation

3. GET /api/v1/purchases/me
   → Verify JWT token
   → Query user's purchase history
   → Return paginated list of purchases
```

## Design Patterns in Use

### 1. Repository Pattern (via Prisma)
- Database access abstracted through Prisma client
- Type-safe queries
- Easy to mock for testing

### 2. Dependency Injection (Manual)
```typescript
// Services receive dependencies as parameters
export function createAuthService(
  prisma: PrismaClient,
  jwt: JWTService,
  bcrypt: BcryptService
) {
  return {
    login: async (email, password) => { ... },
    register: async (data) => { ... }
  };
}
```

### 3. Factory Pattern (for clients)
```typescript
// lib/polymarket.ts
export function createPolymarketClient(apiKey: string) {
  return {
    getMarkets: async (filters) => { ... },
    getMarketDetails: async (id) => { ... }
  };
}
```

### 4. Middleware Pattern (Fastify hooks)
```typescript
// Authentication middleware
app.addHook('onRequest', async (req, reply) => {
  if (publicRoutes.includes(req.url)) return;
  await authenticateRequest(req, reply);
});

// Rate limiting middleware
app.addHook('onRequest', async (req, reply) => {
  const key = `ratelimit:${req.ip}:${req.url}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > 100) throw new RateLimitExceededError();
});
```

### 5. Job Scheduler Pattern
```typescript
// jobs/index.ts
export function startBackgroundJobs() {
  // Market ingestion - every 5 minutes
  setInterval(ingestPolymarketMarkets, 5 * 60 * 1000);

  // Leaderboard update - every 15 minutes
  setInterval(updateLeaderboards, 15 * 60 * 1000);

  // Market resolution check - every 1 minute
  setInterval(checkMarketResolutions, 60 * 1000);
}
```

## Anti-Patterns to Avoid

### ❌ Don't: N+1 Queries
```typescript
// Bad
const bets = await prisma.bet.findMany();
for (const bet of bets) {
  bet.user = await prisma.user.findUnique({ where: { id: bet.userId } });
}

// Good
const bets = await prisma.bet.findMany({
  include: { user: true }
});
```

### ❌ Don't: Unhandled Async Errors
```typescript
// Bad
app.get('/markets', (req, reply) => {
  getMarkets().then(markets => reply.send(markets));
});

// Good
app.get('/markets', async (req, reply) => {
  const markets = await getMarkets();
  return reply.send(markets);
});
```

### ❌ Don't: Shared Mutable State
```typescript
// Bad
let cachedMarkets = [];

// Good - use Redis
await redis.setex('markets', 60, JSON.stringify(markets));
```

### ❌ Don't: Hardcoded Configuration
```typescript
// Bad
const MAX_BET = 10000;

// Good
const MAX_BET = process.env.MAX_BET_AMOUNT || 10000;
```

---

## Testing Patterns

### ✅ Do: Use `vi.hoisted()` for Mock Objects

**Pattern:** When mocking modules in Vitest, use `vi.hoisted()` to create mock objects that are hoisted along with `vi.mock()` calls.

```typescript
// ✅ CORRECT: Hoisted mock object
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  bet: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

// ✅ Mock module using hoisted object
vi.mock('../../../lib/database.js', () => ({
  prisma: mockPrisma,
}));

// ✅ Import service AFTER mocks (Vitest hoists anyway, but clearer)
import * as authService from '../auth.services.js';

describe('Auth Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up $transaction mock
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockPrisma);
    });
  });

  it('should work', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    // ... test code
  });
});
```

### ❌ Don't: Import Variables in Mock Factories

**Problem:** Vitest hoists `vi.mock()` calls before any code execution, so variables created outside `vi.hoisted()` aren't available.

```typescript
// ❌ WRONG: Variable not hoisted
import { createMockPrisma } from '../../../lib/__tests__/prisma-mock.js';

const mockPrisma = createMockPrisma(); // Not hoisted!

vi.mock('../../../lib/database.js', () => ({
  prisma: mockPrisma, // ❌ Error: Cannot access before initialization
}));
```

### ✅ Do: Self-Contained Mock Objects

**Pattern:** Keep mock objects self-contained with no external dependencies.

```typescript
// ✅ CORRECT: Self-contained hoisted mock
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  // No imports, no external dependencies
}));

vi.mock('../../../lib/database.js', () => ({
  prisma: mockPrisma,
}));
```

### ✅ Do: Mock Multiple Dependencies

**Pattern:** Use separate `vi.hoisted()` calls for different mock objects.

```typescript
// ✅ CORRECT: Multiple hoisted mocks
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

const mockRedis = vi.hoisted(() => ({
  safeRedisGet: vi.fn(),
  safeRedisSetEx: vi.fn(),
}));

vi.mock('../../../lib/database.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../lib/redis.js', () => mockRedis);
```

### ✅ Do: Set Up Transaction Mocks in beforeEach

**Pattern:** Configure `$transaction` mock in `beforeEach()` to ensure fresh state.

```typescript
describe('Betting Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up $transaction to execute callback with mockPrisma
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockPrisma);
    });
  });
});
```

### Testing Best Practices

1. **One test file per service/controller** - Keep tests organized by feature
2. **Use descriptive test names** - "should return 1000 credits for day 1" not "test 1"
3. **AAA Pattern** - Arrange, Act, Assert
4. **Mock external dependencies** - Database, Redis, external APIs
5. **Test edge cases** - Invalid input, error conditions, boundary values
6. **Clean up in beforeEach** - Use `vi.clearAllMocks()` to reset state
7. **Import services AFTER mocks** - Even though Vitest hoists, it's clearer

### Common Testing Patterns

#### Testing Services with Prisma
```typescript
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
}));

vi.mock('../../../lib/database.js', () => ({ prisma: mockPrisma }));

import * as service from '../service.js';

it('should create user', async () => {
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
  
  await service.createUser({ email: 'test@example.com' });
  
  expect(mockPrisma.user.create).toHaveBeenCalled();
});
```

#### Testing Controllers with Services
```typescript
vi.mock('../service.js');

import * as controller from '../controller.js';
import * as service from '../service.js';

it('should call service', async () => {
  vi.mocked(service.createUser).mockResolvedValue({ id: 'user-1' });
  
  await controller.createUserHandler(mockRequest, mockReply);
  
  expect(service.createUser).toHaveBeenCalled();
});
```

### Lessons Learned from Mock Hoisting Issues

1. **Vitest hoists `vi.mock()` calls** - They execute before any code runs
2. **Use `vi.hoisted()` for variables needed in mocks** - Ensures proper hoisting
3. **No imports inside mock factories** - Keep factories self-contained
4. **Mock objects must be hoisted** - Regular variables won't work
5. **Test isolation is critical** - Each test should be independent

## Frontend Authentication Patterns

### 1. AuthContext Pattern
**Pattern:** Global authentication state management using React Context

```typescript
// AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (isAuthenticated()) {
      const userData = await getCurrentUser();
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage in components
const { user, logout } = useAuth();
```

**Benefits:**
- Single source of truth for auth state
- Available throughout the app
- Automatic user data fetching on mount
- Easy to refresh user data

### 2. Route Protection Pattern
**Pattern:** Protect routes with authentication requirement

```typescript
// RequireAuth.tsx
export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

// Usage in App.tsx
<Route
  path="/app"
  element={
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  }
/>
```

**Benefits:**
- Declarative route protection
- Automatic redirect to login
- Loading states handled
- Reusable across routes

### 3. API Service with Token Refresh Pattern
**Pattern:** Automatic token refresh on 401 errors

```typescript
// api.ts
async function apiRequest(endpoint, options) {
  const token = getAccessToken();
  const headers = { 'Authorization': `Bearer ${token}` };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshResponse = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      
      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();
        setTokens(accessToken, refreshToken);
        // Retry original request
        return fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: { ...headers, 'Authorization': `Bearer ${accessToken}` },
        });
      }
    }
    
    // If refresh fails, logout
    clearTokens();
    window.location.href = '/';
  }

  return response;
}
```

**Benefits:**
- Seamless token refresh
- No manual token management needed
- Automatic logout on auth failure
- Retry failed requests with new token

### 4. Profile Page Data Fetching Pattern
**Pattern:** Fetch and display user data with loading/error states

```typescript
// ProfilePage.tsx
const ProfilePage = () => {
  const { user, loading } = useAuth();

  // Convert backend user to frontend UserStats format
  const userStats = user ? {
    userId: user.id,
    username: user.username,
    credits: Number(user.creditBalance) || 0,
    // ... map other fields
  } : null;

  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorState />;

  return <ProfileContent userStats={userStats} />;
};
```

**Benefits:**
- Type-safe data transformation
- Loading states for better UX
- Error handling
- Real-time data updates
