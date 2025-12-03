# How to Create the Two PostgreSQL Databases

This guide shows you how to create the two separate PostgreSQL databases required for THISTHAT.

## Method 1: Using the Provided Scripts (Recommended)

### Windows (PowerShell)

```powershell
# Navigate to backend directory
cd backend

# Run the PowerShell script
.\scripts\create-databases.ps1
```

### Linux/macOS (Bash)

```bash
# Navigate to backend directory
cd backend

# Make script executable
chmod +x scripts/create-databases.sh

# Run the bash script
./scripts/create-databases.sh
```

**Note:** You can set environment variables before running:
- `DB_HOST` (default: localhost)
- `DB_PORT` (default: 5432)
- `DB_USER` (default: postgres)
- `DB_PASSWORD` (default: password)

Example:
```bash
DB_PASSWORD=mysecretpassword ./scripts/create-databases.sh
```

---

## Method 2: Using psql Command Line

### Step 1: Connect to PostgreSQL

```bash
# Windows/Linux/macOS
psql -U postgres
```

Or with password:
```bash
# Set password as environment variable
export PGPASSWORD=yourpassword  # Linux/macOS
$env:PGPASSWORD="yourpassword"   # PowerShell

psql -U postgres -h localhost
```

### Step 2: Create the Databases

Once connected to PostgreSQL, run:

```sql
-- Create markets database
CREATE DATABASE thisthat_markets;

-- Create users database
CREATE DATABASE thisthat_users;

-- Verify databases were created
\l
```

### Step 3: Exit psql

```sql
\q
```

---

## Method 3: Using Docker

If you're using Docker for PostgreSQL:

```bash
# Connect to PostgreSQL container
docker exec -it <postgres-container-name> psql -U postgres

# Then run the SQL commands from Method 2
```

Or create databases directly:

```bash
docker exec -it <postgres-container-name> psql -U postgres -c "CREATE DATABASE thisthat_markets;"
docker exec -it <postgres-container-name> psql -U postgres -c "CREATE DATABASE thisthat_users;"
```

---

## Method 4: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database..."
4. Create first database:
   - Name: `thisthat_markets`
   - Click "Save"
5. Repeat for second database:
   - Name: `thisthat_users`
   - Click "Save"

---

## Method 5: Using SQL File

Create a file `create-databases.sql`:

```sql
-- Create markets database
CREATE DATABASE thisthat_markets;

-- Create users database
CREATE DATABASE thisthat_users;
```

Then run:

```bash
psql -U postgres -f create-databases.sql
```

---

## Verify Databases Were Created

After creating the databases, verify they exist:

```sql
-- Connect to PostgreSQL
psql -U postgres

-- List all databases
\l

-- You should see both:
--   thisthat_markets
--   thisthat_users
```

Or using command line:

```bash
psql -U postgres -c "\l" | grep thisthat
```

---

## Update Environment Variables

After creating the databases, update your `.env` file:

```env
# Markets database
MARKETS_DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_markets?schema=public

# Users database
USERS_DATABASE_URL=postgresql://postgres:password@localhost:5432/thisthat_users?schema=public
```

Replace:
- `postgres` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost:5432` with your PostgreSQL host and port if different

---

## Next Steps

After creating the databases:

1. **Generate Prisma clients:**
   ```bash
   npm run db:generate
   ```

2. **Push schemas to databases:**
   ```bash
   npm run db:push
   ```

3. **Verify tables were created:**
   ```bash
   # Check markets database
   psql -U postgres -d thisthat_markets -c "\dt"
   
   # Check users database
   psql -U postgres -d thisthat_users -c "\dt"
   ```

---

## Troubleshooting

### Error: "database already exists"
- The database already exists. You can either:
  - Skip creation (safe if you want to keep existing data)
  - Drop and recreate: `DROP DATABASE thisthat_markets;` (⚠️ **WARNING**: This deletes all data!)

### Error: "permission denied"
- Make sure you're using a user with database creation privileges (usually `postgres` superuser)
- Or grant privileges: `GRANT ALL PRIVILEGES ON DATABASE thisthat_markets TO your_user;`

### Error: "psql: command not found"
- Install PostgreSQL client tools
- Or use Docker: `docker exec -it <postgres-container> psql -U postgres`

### Error: "connection refused"
- Make sure PostgreSQL is running
- Check host/port in connection string
- Verify firewall settings

---

## Database Names

The default database names are:
- **Markets Database:** `thisthat_markets`
- **Users Database:** `thisthat_users`

You can use different names, but make sure to update:
1. The SQL commands above
2. Your `.env` file
3. The Prisma schema files (if you change the database names in the connection URLs)

