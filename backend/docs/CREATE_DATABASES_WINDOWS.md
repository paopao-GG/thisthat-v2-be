# Creating Databases on Windows (psql not in PATH)

If you see the error `psql : The term 'psql' is not recognized`, here are solutions:

## Solution 1: Use the Enhanced Windows Script (Recommended)

Run the enhanced script that automatically finds PostgreSQL:

```powershell
cd backend
.\scripts\create-databases-windows.ps1
```

This script will:
- Search for PostgreSQL in common installation locations
- Offer to use Docker if PostgreSQL isn't found
- Guide you through the process

## Solution 2: Find and Use Full Path to psql

### Step 1: Find PostgreSQL Installation

PostgreSQL is usually installed in one of these locations:
- `C:\Program Files\PostgreSQL\16\bin\psql.exe`
- `C:\Program Files\PostgreSQL\15\bin\psql.exe`
- `C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe`

### Step 2: Use Full Path

```powershell
# Replace with your actual path
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres

# Then run:
CREATE DATABASE thisthat_markets;
CREATE DATABASE thisthat_users;
\q
```

Or in one command:
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE thisthat_markets;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE thisthat_users;"
```

## Solution 3: Add PostgreSQL to PATH

### Option A: Temporary (Current Session)

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
psql -U postgres
```

### Option B: Permanent

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find "Path" and click "Edit"
5. Click "New" and add: `C:\Program Files\PostgreSQL\16\bin` (adjust version number)
6. Click "OK" on all dialogs
7. **Restart PowerShell** for changes to take effect

## Solution 4: Use Docker

If you have Docker Desktop installed:

```powershell
# Find your PostgreSQL container name
docker ps

# Create databases (replace 'postgres' with your container name)
docker exec -it postgres psql -U postgres -c "CREATE DATABASE thisthat_markets;"
docker exec -it postgres psql -U postgres -c "CREATE DATABASE thisthat_users;"
```

## Solution 5: Use pgAdmin (GUI)

1. Open **pgAdmin** (usually installed with PostgreSQL)
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database..."
4. Name: `thisthat_markets` → Click "Save"
5. Repeat for `thisthat_users`

## Solution 6: Install PostgreSQL Client Tools

If PostgreSQL isn't installed at all:

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. During installation:
   - ✅ Check "Add PostgreSQL to PATH"
   - ✅ Remember the password you set for the `postgres` user
3. After installation, restart PowerShell and try again

## Quick Test

After adding to PATH or finding the full path, test it:

```powershell
# Test if psql works
psql --version

# Or with full path
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version
```

## Recommended Approach

**For Windows users, I recommend:**

1. **First try:** Run `.\scripts\create-databases-windows.ps1` (it handles everything)
2. **If that fails:** Use pgAdmin (GUI) - easiest if you're not comfortable with command line
3. **If you have Docker:** Use the Docker method

## After Creating Databases

Once databases are created, continue with:

```powershell
# 1. Update .env file with database URLs
# 2. Generate Prisma clients
npm run db:generate

# 3. Push schemas
npm run db:push
```

