# Technical Context

## Technology Stack

### Runtime & Language
- **Node.js:** 20+ LTS
- **TypeScript:** 5.9.3 (strict mode enabled)
- **Package Manager:** npm

### Web Framework
- **Fastify:** 5.6.2
  - Why: Lightweight, high-performance, schema-based validation
  - 2-3x faster than Express
  - Built-in TypeScript support
  - JSON schema validation
  - Plugin architecture

### Database
- **PostgreSQL:** 15+
  - Why: ACID compliance, relational data, robust
  - Strong transaction support for betting
  - JSON support for flexible fields
  - Proven at scale

### ORM
- **Prisma:** 5+
  - Why: Type-safe database access
  - Auto-generated TypeScript types
  - Migration management
  - Excellent DX with VSCode

### Cache & Session Store
- **Redis:** 7+
  - Why: In-memory speed, pub/sub, TTL support
  - Use cases:
    - Session management
    - Leaderboard caching
    - Rate limiting
    - Market data caching

### Authentication
- **JWT (jsonwebtoken):**
  - Access tokens: 15-minute expiry
  - Refresh tokens: 7-day expiry
  - Token rotation on refresh
- **bcrypt:** Password hashing (cost factor: 12)

### External Integrations

#### Polymarket Builder API
- **Purpose:** Market data, odds, resolution
- **Authentication:** API Key
- **Base URL:** `https://clob.polymarket.com/`
- **Key endpoints:**
  - `GET /markets` - List active markets
  - `GET /markets/:id` - Market details
  - `GET /markets/:id/prices` - Current odds
- **Polling frequency:**
  - Market list: Every 5 minutes
  - Active market odds: Every 30 seconds
  - Resolution check: Every 1 minute

#### Future Integrations (V2+)
- **Stripe:** In-app credit purchases
- **WalletConnect:** Wallet integration
- **Polymarket webhooks:** Real-time market updates

## Development Setup

### Prerequisites
```bash
Node.js 20+
PostgreSQL 15+
Redis 7+
npm
```

### Environment Variables
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/thisthat_v1

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<random-secret>
JWT_REFRESH_SECRET=<random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Polymarket
POLYMARKET_API_KEY=<api-key>
POLYMARKET_BASE_URL=https://clob.polymarket.com

# App Config
MIN_BET_AMOUNT=10
MAX_BET_AMOUNT=10000
DAILY_REWARD_CREDITS=100
STARTING_CREDITS=1000
```

### Local Development Commands
```bash
# Install dependencies
npm install

# Database setup
npx prisma generate
npx prisma migrate dev

# Run in development (with watch mode)
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Build for production
npm run build

# Run production build
npm start
```

### Project Structure
```
backend/
├── src/
│   ├── app/
│   │   ├── index.ts              # Fastify app setup
│   │   └── plugins/              # Fastify plugins
│   ├── modules/
│   │   ├── auth/                 # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.types.ts
│   │   ├── users/                # User module
│   │   ├── markets/              # Market module
│   │   ├── bets/                 # Betting module
│   │   ├── leaderboard/          # Leaderboard module
│   │   └── rewards/              # Rewards module
│   ├── lib/
│   │   ├── database.ts           # Prisma client
│   │   ├── redis.ts              # Redis client
│   │   ├── polymarket.ts         # Polymarket API client
│   │   └── logger.ts             # Pino logger
│   ├── utils/
│   │   ├── jwt.ts                # JWT helpers
│   │   ├── validation.ts         # Input validation
│   │   └── errors.ts             # Custom error classes
│   ├── jobs/
│   │   ├── market-ingestion.ts   # Polymarket sync job
│   │   ├── leaderboard-update.ts # Ranking calculation job
│   │   └── market-resolution.ts  # Resolution check job
│   └── index.ts                  # Entry point
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── memory-bank/                  # Project documentation
├── package.json
├── tsconfig.json
└── eslint.config.js
```

## Technical Constraints

### Performance Requirements
- **API response time:** <500ms (p95)
- **Throughput:** 1,000 req/s (target), 5,000 req/s (peak)
- **Database connections:** Max 20 (connection pool)
- **Cache hit rate:** >80% for market listings and leaderboards

### Security Constraints
- All passwords hashed with bcrypt (cost: 12)
- JWT tokens only, no session cookies
- Rate limiting on all endpoints
- SQL injection prevention (parameterized queries via Prisma)
- XSS prevention (input sanitization)
- CORS configured for frontend origin only

### Data Constraints
- **Credits:** Decimal(18, 2) - max 1,000,000 per user
- **Odds:** Decimal(5, 4) - range 0.0001 to 0.9999
- **Usernames:** 3-50 characters, alphanumeric + underscore
- **Bet amounts:** 10 to 10,000 credits
- **Market expiry:** Must be future timestamp

### Scalability Constraints (V1)
- Single-region deployment
- Vertical scaling preferred initially
- Horizontal scaling planned for V2
- Database read replicas deferred to V2

## Dependencies

### Core Dependencies
```json
{
  "fastify": "^5.6.2",
  "fastify-cors": "^9.0.1",
  "@fastify/jwt": "^9.0.1",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0",
  "redis": "^4.7.0",
  "bcrypt": "^5.1.1",
  "pino": "^9.0.0",
  "pino-pretty": "^13.0.0",
  "zod": "^3.23.0"
}
```

### Dev Dependencies
```json
{
  "typescript": "^5.9.3",
  "tsx": "^4.0.0",
  "@types/node": "^20.0.0",
  "@types/bcrypt": "^5.0.2",
  "eslint": "^9.0.0",
  "vitest": "^2.0.0"
}
```

## Tool Usage Patterns

### Logging (Pino)
```typescript
import logger from '@/lib/logger';

// Structured logging
logger.info({ userId, marketId, amount }, 'Bet placed');
logger.error({ err, userId }, 'Bet placement failed');
logger.warn({ ip, endpoint }, 'Rate limit exceeded');
```

### Database (Prisma)
```typescript
import prisma from '@/lib/database';

// Type-safe queries
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { bets: true }
});

// Transactions
await prisma.$transaction(async (tx) => {
  await tx.user.update(...);
  await tx.bet.create(...);
  await tx.creditTransaction.create(...);
});
```

### Caching (Redis)
```typescript
import redis from '@/lib/redis';

// Cache with TTL
await redis.setex(`market:${id}`, 60, JSON.stringify(market));
const cached = await redis.get(`market:${id}`);

// Leaderboard (sorted sets)
await redis.zadd('leaderboard:pnl', user.overallPnL, user.id);
const top100 = await redis.zrevrange('leaderboard:pnl', 0, 99);
```

### Validation (Zod)
```typescript
import { z } from 'zod';

const placeBetSchema = z.object({
  marketId: z.string().uuid(),
  amount: z.number().min(10).max(10000),
  side: z.enum(['this', 'that'])
});

// Use in Fastify routes
route.post('/bets', {
  schema: { body: placeBetSchema },
  handler: async (req, reply) => { ... }
});
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    - Checkout code
    - Setup Node.js 20
    - Install dependencies
    - Run ESLint
    - Run unit tests
    - Run integration tests

  build:
    - Build TypeScript
    - Build Docker image

  deploy-staging:
    - Deploy to staging (on main branch)
    - Run smoke tests

  deploy-production:
    - Manual approval required
    - Deploy to production
    - Monitor for 10 minutes
```

## Database Management

### Migration Strategy
- Use Prisma Migrate for schema changes
- Always create migration in feature branch
- Test migration in local/staging first
- Review migration SQL before production
- Keep rollback scripts ready

### Backup Strategy
- Automated daily backups (PostgreSQL)
- 30-day retention
- Point-in-time recovery enabled
- Test restore process monthly

## Monitoring & Observability

### Logging Levels
- **ERROR:** Exceptions, critical failures
- **WARN:** Validation failures, rate limits
- **INFO:** User actions (login, bet placement)
- **DEBUG:** Detailed flow (dev only)

### Key Metrics to Track
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (by endpoint)
- Database query time
- Cache hit rate
- Active users count
- Bets placed (per minute/hour)
- Credit distribution

### Alerting Thresholds
- API response time >1s (p95)
- Error rate >1% (5-min window)
- Database connection pool >80% usage
- Polymarket API unreachable
- Redis connection failures
