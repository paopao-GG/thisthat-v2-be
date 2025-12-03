# Next Steps After Creating Databases

You've created the databases! Here's what to do next:

## Step 1: Update Your .env File

Open `backend/.env` and make sure you have these two database URLs:

```env
# Markets database - stores market data only
MARKETS_DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/thisthat_markets?schema=public

# Users database - stores user data, bets, transactions, etc.
USERS_DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/thisthat_users?schema=public
```

**Important:** Replace:
- `postgres` with your PostgreSQL username (if different)
- `yourpassword` with your actual PostgreSQL password
- `localhost:5432` with your host/port (if different)

## Step 2: Generate Prisma Clients

Generate the Prisma clients for both databases:

```powershell
cd backend
npm run db:generate
```

This will:
- Generate client for markets database (`schema.markets.prisma`)
- Generate client for users database (`schema.users.prisma`)

**Expected output:**
```
✔ Generated Prisma Client (markets) to ./node_modules/.prisma/client-markets
✔ Generated Prisma Client (users) to ./node_modules/.prisma/client-users
```

## Step 3: Push Schemas to Databases

Push the schemas to create all tables:

```powershell
npm run db:push
```

This will:
- Create all tables in `thisthat_markets` database
- Create all tables in `thisthat_users` database

**Expected output:**
```
✔ Markets database schema pushed successfully
✔ Users database schema pushed successfully
```

## Step 4: Verify Tables Were Created

You can verify in pgAdmin4:

1. **Check Markets Database:**
   - Expand `thisthat_markets` → `Schemas` → `public` → `Tables`
   - You should see: `markets` table

2. **Check Users Database:**
   - Expand `thisthat_users` → `Schemas` → `public` → `Tables`
   - You should see: `users`, `bets`, `credit_transactions`, `daily_rewards`, `refresh_tokens`, `oauth_accounts`, `stocks`, `stock_holdings`, `stock_transactions`, `credit_purchases`

## Step 5: Test the Setup

Start your development server:

```powershell
npm run dev
```

The server should start without database connection errors.

## Troubleshooting

### Error: "Can't reach database server"
- Check that PostgreSQL is running
- Verify the connection string in `.env` is correct
- Check host/port/username/password

### Error: "Database does not exist"
- Verify database names match exactly: `thisthat_markets` and `thisthat_users`
- Check for typos in `.env` file

### Error: "Prisma schema validation failed"
- Make sure both schema files exist:
  - `prisma/schema.markets.prisma`
  - `prisma/schema.users.prisma`

### Error: "Table already exists"
- This is normal if you've run `db:push` before
- Prisma will update existing tables if schemas changed

## Quick Command Reference

```powershell
# Generate Prisma clients (both databases)
npm run db:generate

# Generate only markets client
npm run db:generate:markets

# Generate only users client
npm run db:generate:users

# Push schemas to databases (both)
npm run db:push

# Push only markets schema
npm run db:push:markets

# Push only users schema
npm run db:push:users

# Open Prisma Studio (view/edit data)
npm run db:studio
```

## What's Next?

After completing these steps:
1. ✅ Databases created
2. ✅ Prisma clients generated
3. ✅ Tables created
4. ✅ Server can connect to databases

You're ready to:
- Run the application: `npm run dev`
- Start ingesting markets from Polymarket
- Test user registration and betting flows

