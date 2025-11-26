# THISTHAT Backend V1 - Credits System

Backend API for THISTHAT prediction market platform.

## V1 Scope

- ✅ Credits-based betting (NO real money)
- ✅ JWT authentication (Signup/Login/Refresh/Logout)
- ✅ Polymarket API integration (READ-ONLY)
- ✅ Leaderboards (PnL & Volume)
- ✅ Daily rewards system (PRD-aligned: 1000→1500→2000... up to 10,000)
- ✅ Referral system (referral codes, +200 credit bonuses)
- ✅ Credit purchase system (predefined packages)
- ✅ Market resolution & automatic payouts
- ✅ Transaction history

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify 5.6.2
- **Database:** PostgreSQL 15+
- **Cache:** Redis 7+
- **ORM:** Prisma 5+
- **Language:** TypeScript 5.9.3

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ running locally or remote
- Redis 7+ running locally or remote
- npm or yarn

## Quick Start

For detailed setup instructions, see **[docs/QUICK_START.md](./docs/QUICK_START.md)**.

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

See **[docs/ENV_FILE_CONTENT.md](./docs/ENV_FILE_CONTENT.md)** for environment variable setup.

Edit `.env` and configure:

- `DATABASE_URL`: Your PostgreSQL connection string
- `REDIS_URL`: Your Redis connection string
- `JWT_ACCESS_SECRET`: Generate a random secret
- `JWT_REFRESH_SECRET`: Generate a different random secret

### 3. Database Setup

Initialize Prisma and create the database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 4. Run the Server

Development mode (with hot reload):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Project Structure

```
backend/
├── src/                          # Source code
│   ├── app/
│   │   └── index.ts              # Fastify server setup
│   ├── features/
│   │   ├── auth/                 # Authentication
│   │   ├── fetching/             # Market & event data
│   │   │   ├── market-data/
│   │   │   └── event-data/
│   │   └── database/             # Database & credits
│   ├── lib/                      # Shared libraries (Prisma, Redis)
│   └── __tests__/                # Integration tests
├── docs/                         # 📚 All documentation
│   ├── API_ENDPOINTS.md          # API documentation
│   ├── QUICK_START.md            # Getting started guide
│   ├── TESTING_QUICK_START.md    # Testing guide
│   └── ...                       # See docs/README.md for full list
├── scripts/                      # 🔧 Utility scripts
│   ├── test-api.ps1              # API testing script
│   ├── view-database.ps1         # Database viewer
│   └── ...                       # See scripts/README.md for full list
├── memory-bank/                  # 📖 Project memory bank
│   ├── backend_roadmap.md         # Development roadmap
│   ├── progress.md               # Project progress
│   └── ...                       # Project context files
├── prisma/
│   └── schema.prisma             # Database schema
├── .env                          # Environment variables (gitignored)
└── package.json
```

**📚 Documentation:** See [docs/README.md](./docs/README.md) for all documentation  
**🔧 Scripts:** See [scripts/README.md](./scripts/README.md) for utility scripts

## Available Scripts

### Development
- `npm run dev` - Run development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Check TypeScript types

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report

### Database
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:push` - Push schema changes

### Utility Scripts
See **[scripts/README.md](./scripts/README.md)** for PowerShell and Node.js utility scripts.

## API Endpoints (V1)

For complete API documentation, see **[docs/API_ENDPOINTS.md](./docs/API_ENDPOINTS.md)**.

### Authentication
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/refresh`
- POST `/api/v1/auth/logout`

### Users
- GET `/api/v1/users/me`
- PATCH `/api/v1/users/me`

### Markets
- GET `/api/v1/markets`
- GET `/api/v1/markets/:id`

### Betting
- POST `/api/v1/bets`
- GET `/api/v1/bets/me`

### Leaderboard
- GET `/api/v1/leaderboard/pnl`
- GET `/api/v1/leaderboard/volume`
- GET `/api/v1/leaderboard/me`

### Economy
- POST `/api/v1/economy/daily-credits`

### Transactions
- GET `/api/v1/transactions/me`

### Referrals
- GET `/api/v1/referrals/me`

### Purchases
- GET `/api/v1/purchases/packages`
- POST `/api/v1/purchases`
- GET `/api/v1/purchases/me`

## Database Schema

See [prisma/schema.prisma](prisma/schema.prisma) for the complete schema.

**Main Tables:**
- `users` - User accounts with credit balances
- `markets` - Prediction markets (Polymarket + admin-created)
- `bets` - User bets on markets
- `credit_transactions` - Audit trail for credit movements
- `daily_rewards` - Daily login rewards tracking
- `refresh_tokens` - JWT refresh tokens

## Development Notes

### Credits System
- Starting balance: 1000 credits
- Daily reward: 100 credits
- Bet limits: 10-10,000 credits per bet
- All credit operations use atomic database transactions

### Database Migrations

When you change the schema:

```bash
npx prisma migrate dev --name description_of_change
```

### Prisma Studio

View and edit database records:

```bash
npx prisma studio
```

Opens at http://localhost:5555

## Documentation

- **[Getting Started](./docs/QUICK_START.md)** - Quick start guide
- **[Running the Server](./docs/RUN_SERVER.md)** - Server setup and troubleshooting
- **[API Endpoints](./docs/API_ENDPOINTS.md)** - Complete API reference
- **[Testing Guide](./docs/UNIT_TESTING_GUIDE.md)** - Unit testing documentation
- **[Test Coverage](./docs/TEST_COVERAGE_SUMMARY.md)** - Current test coverage
- **[Project Roadmap](./memory-bank/backend_roadmap.md)** - Development roadmap

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Test connection: `npx prisma db pull`

### Redis Connection Issues
- Ensure Redis is running
- Check `REDIS_URL` in `.env`
- Test: `redis-cli ping` should return "PONG"

### TypeScript Errors
- Run `npm run type-check`
- Ensure Prisma Client is generated: `npx prisma generate`

### API Testing
- Use `scripts/test-api.ps1` to test endpoints
- See **[docs/API_ENDPOINTS.md](./docs/API_ENDPOINTS.md)** for examples

## V1 Exclusions (Not Implemented)

- ❌ Wallet integration (MetaMask, WalletConnect)
- ❌ USDC/real-money betting
- ❌ Real payment processing (Stripe, on-chain settlement)
- ❌ Creator markets
- ❌ Social features (friends, chat)
- ❌ Push notifications
- ❌ Email notifications

**Note:** Credit purchases are implemented with simulated settlement (manual provider) for V1. Real payment processing is V2.

See [backend_prd.md](../docs/backend_prd.md) for full V1 scope.

## License

MIT
