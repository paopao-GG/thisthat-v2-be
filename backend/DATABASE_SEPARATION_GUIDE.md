# Database Separation Implementation Guide

## Overview

The database has been split into two separate PostgreSQL databases:

1. **Markets Database** (`thisthat_markets`) - Stores only Market data
2. **Users Database** (`thisthat_users`) - Stores User, Bet, CreditTransaction, and all user-related data

## Database Schemas

- `prisma/schema.markets.prisma` - Markets database schema
- `prisma/schema.users.prisma` - Users database schema

## Prisma Clients

Two separate Prisma clients are exported from `src/lib/database.ts`:

- `marketsPrisma` - For Market model operations
- `usersPrisma` - For User, Bet, CreditTransaction, and all user-related models

## Migration Steps

### 1. Generate Prisma Clients

```bash
# Generate markets client
npx prisma generate --schema=prisma/schema.markets.prisma

# Generate users client
npx prisma generate --schema=prisma/schema.users.prisma
```

### 2. Create Databases

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create markets database
CREATE DATABASE thisthat_markets;

-- Create users database
CREATE DATABASE thisthat_users;
```

### 3. Run Migrations

```bash
# Push markets schema
npx prisma db push --schema=prisma/schema.markets.prisma

# Push users schema
npx prisma db push --schema=prisma/schema.users.prisma
```

### 4. Migrate Data (if needed)

If you have existing data in a single database, you'll need to:
1. Export Market data
2. Export User/Bet/Transaction data
3. Import into respective databases

## Service Updates Required

### Markets Services
- ✅ `markets.services.ts` - Uses `marketsPrisma`

### Betting Services
- ✅ `betting.services.ts` - Uses `usersPrisma` for bets, `marketsPrisma` for market lookups
- Note: Market lookups happen before transactions since they're in different databases

### User Services
- ⚠️ `auth.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `user.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `economy.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `leaderboard.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `transactions.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `referrals.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `purchases.services.ts` - Needs update to use `usersPrisma`
- ⚠️ `market-resolution.services.ts` - Needs update to use both databases

## Environment Variables

Update `.env`:

```env
# Markets database
MARKETS_DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_markets?schema=public

# Users database
USERS_DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_users?schema=public
```

## Important Notes

1. **No Foreign Key Constraints**: The `Bet.marketId` field references `Market.id` but there's no foreign key constraint since they're in different databases. Application logic must ensure referential integrity.

2. **Transaction Limitations**: You cannot use database transactions across the two databases. Market lookups must happen before user transactions.

3. **Market Lookups**: When placing bets or resolving markets, you need to:
   - First query the market from `marketsPrisma`
   - Then perform user operations in `usersPrisma` transaction

4. **MongoDB Removal**: All MongoDB code has been removed. Market ingestion now writes directly to the markets PostgreSQL database.

## Removed Components

- ❌ MongoDB connection (`src/lib/mongodb.ts`)
- ❌ MongoDB sync service (`src/features/sync/mongodb-to-postgres.sync.ts`)
- ❌ MongoDB dependencies from `package.json`

