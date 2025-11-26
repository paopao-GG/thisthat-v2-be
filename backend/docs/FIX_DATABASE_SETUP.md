# Fix Database Setup Issues

## Issue 1: Database Authentication Failed

The error `P1000: Authentication failed` means your PostgreSQL credentials in `.env` are incorrect.

### Step 1: Find Your PostgreSQL Credentials

You need to know:
- **Username** (usually `postgres` on Windows)
- **Password** (the one you set when installing PostgreSQL)
- **Port** (usually `5432`)
- **Database name** (we'll use `thisthat_v1`)

### Step 2: Check if PostgreSQL is Running

```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*

# Or check if port 5432 is in use
netstat -an | findstr :5432
```

### Step 3: Test PostgreSQL Connection

Try connecting with psql (if installed):

```powershell
# Try connecting (replace with your username)
psql -U postgres -h localhost

# Or if you have a specific user
psql -U your_username -h localhost -d postgres
```

### Step 4: Update .env File

Edit `backend/.env` and replace the `DATABASE_URL` line:

**Option A: If you know your PostgreSQL username/password:**
```env
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/thisthat_v1
```

**Option B: If you don't remember your password, reset it:**

1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\15\bin` or similar)
3. Run:
```cmd
pg_ctl restart -D "C:\Program Files\PostgreSQL\15\data"
```

Or reset password via pgAdmin or psql.

**Option C: Use default postgres user (if you remember that password):**
```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/thisthat_v1
```

### Step 5: Create the Database

If the database `thisthat_v1` doesn't exist, create it:

```powershell
# Connect to PostgreSQL
psql -U postgres -h localhost

# Then in psql prompt:
CREATE DATABASE thisthat_v1;
\q
```

Or use pgAdmin GUI to create the database.

---

## Issue 2: Prisma Client Generation Permission Error

The `EPERM: operation not permitted` error happens when:
- Another process is using the Prisma client files
- File permissions are incorrect
- Antivirus is blocking the operation

### Fix 1: Close All Node Processes

```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a few seconds, then try again
npx prisma generate
```

### Fix 2: Delete Prisma Client and Regenerate

```powershell
cd backend

# Delete the Prisma client
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# Regenerate
npx prisma generate
```

### Fix 3: Run PowerShell as Administrator

1. Right-click PowerShell
2. Select "Run as Administrator"
3. Navigate to backend folder
4. Run: `npx prisma generate`

### Fix 4: Check Antivirus

Temporarily disable antivirus or add exception for:
- `backend\node_modules\.prisma\`
- `backend\node_modules\@prisma\`

---

## Complete Setup Steps (After Fixing Credentials)

Once you've fixed the DATABASE_URL:

```powershell
cd backend

# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database (creates/updates tables)
npx prisma db push

# 3. Verify it worked
npx prisma studio
# This opens a browser window where you can see your database tables
```

---

## Quick Test Connection

Test if your DATABASE_URL works:

```powershell
cd backend

# This will test the connection
npx prisma db pull
```

If this works, your connection is good!

---

## Alternative: Use SQLite for Development (Easier Setup)

If PostgreSQL is too complicated, you can temporarily use SQLite:

1. Edit `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

2. Update `.env`:
```env
DATABASE_URL="file:./dev.db"
```

3. Then run:
```powershell
npx prisma generate
npx prisma migrate dev --name init
```

**Note:** SQLite is fine for development, but PostgreSQL is recommended for production.

