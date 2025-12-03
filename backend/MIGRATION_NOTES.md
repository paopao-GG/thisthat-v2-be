# Database Separation Migration Notes

## Summary

MongoDB has been completely removed. The system now uses two separate PostgreSQL databases:

1. **Markets Database** (`thisthat_markets`) - Stores only Market data
2. **Users Database** (`thisthat_users`) - Stores User, Bet, CreditTransaction, and all user-related data

## What Changed

### Database Schemas
- ✅ Created `prisma/schema.markets.prisma` - Markets database schema
- ✅ Created `prisma/schema.users.prisma` - Users database schema
- ⚠️ Old `prisma/schema.prisma` should be removed after migration

### Database Clients
- ✅ `src/lib/database.ts` now exports:
  - `marketsPrisma` - For Market operations
  - `usersPrisma` - For User/Bet/Transaction operations
  - `prisma` - Legacy alias to `usersPrisma` (for backward compatibility)

### Services Updated
- ✅ `markets.services.ts` - Uses `marketsPrisma`
- ✅ `betting.services.ts` - Uses `usersPrisma` for bets, `marketsPrisma` for market lookups
- ✅ `auth.services.ts` - Uses `usersPrisma`
- ✅ `user.services.ts` - Uses `usersPrisma`
- ✅ `economy.services.ts` - Uses `usersPrisma`
- ✅ `leaderboard.services.ts` - Uses `usersPrisma`
- ✅ `transactions.services.ts` - Uses `usersPrisma`
- ✅ `referrals.services.ts` - Uses `usersPrisma`
- ✅ `purchases.services.ts` - Uses `usersPrisma`
- ✅ `market-resolution.services.ts` - Uses both databases
- ✅ `market-ingestion.service.ts` - Uses `marketsPrisma`

### Removed Components
- ❌ `src/lib/mongodb.ts` - Deleted
- ❌ MongoDB sync service - Converted to no-op (deprecated)
- ❌ `mongodb` dependency from `package.json` - Removed

### Environment Variables
- ✅ Updated `env.template` with:
  - `MARKETS_DATABASE_URL` - Markets database connection
  - `USERS_DATABASE_URL` - Users database connection
  - Removed `MONGODB_URL` and `MONGODB_DB_NAME`

## Migration Steps

### 1. Create Databases

```sql
CREATE DATABASE thisthat_markets;
CREATE DATABASE thisthat_users;
```

### 2. Update Environment Variables

Update `.env`:
```env
MARKETS_DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_markets?schema=public
USERS_DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_users?schema=public
```

### 3. Generate Prisma Clients

```bash
npm run db:generate
```

Or separately:
```bash
npm run db:generate:markets
npm run db:generate:users
```

### 4. Push Schemas

```bash
npm run db:push
```

Or separately:
```bash
npm run db:push:markets
npm run db:push:users
```

### 5. Migrate Existing Data (if needed)

If you have existing data in a single database:

1. Export Market data:
```sql
-- From old database
COPY (SELECT * FROM markets) TO '/tmp/markets.csv' CSV HEADER;
```

2. Export User/Bet/Transaction data:
```sql
-- From old database
COPY (SELECT * FROM users) TO '/tmp/users.csv' CSV HEADER;
COPY (SELECT * FROM bets) TO '/tmp/bets.csv' CSV HEADER;
-- etc.
```

3. Import into respective databases:
```sql
-- To markets database
COPY markets FROM '/tmp/markets.csv' CSV HEADER;

-- To users database
COPY users FROM '/tmp/users.csv' CSV HEADER;
COPY bets FROM '/tmp/bets.csv' CSV HEADER;
-- etc.
```

## Important Notes

1. **No Foreign Key Constraints**: `Bet.marketId` references `Market.id` but there's no foreign key constraint since they're in different databases. Application logic must ensure referential integrity.

2. **Transaction Limitations**: You cannot use database transactions across the two databases. Market lookups must happen before user transactions.

3. **Market Lookups**: When placing bets or resolving markets:
   - First query the market from `marketsPrisma`
   - Then perform user operations in `usersPrisma` transaction

4. **Market Ingestion**: Markets are now ingested directly into PostgreSQL via `market-ingestion.service.ts`. No MongoDB sync needed.

## Testing

After migration, test:
1. Market ingestion - Markets should be saved to markets database
2. Bet placement - Should work with market lookups from markets database
3. User operations - Should work with users database
4. Market resolution - Should update both databases correctly

