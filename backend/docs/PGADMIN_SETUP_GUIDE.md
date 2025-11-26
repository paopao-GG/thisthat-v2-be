# pgAdmin Setup Guide - Complete Walkthrough

## Step 1: Check if pgAdmin is Already Installed

pgAdmin usually comes bundled with PostgreSQL installation.

**To find pgAdmin:**

1. Press `Windows Key` and type `pgAdmin`
2. Look for "pgAdmin 4" in your start menu
3. If you see it, skip to **Step 3**

**If pgAdmin is NOT installed**, continue to Step 2.

---

## Step 2: Install pgAdmin (if needed)

### Option A: Check Your PostgreSQL Installation Folder

1. Open File Explorer
2. Navigate to: `C:\Program Files\PostgreSQL\`
3. Look for a folder like `15` or `16` (your PostgreSQL version)
4. Inside, check if there's a `pgAdmin 4` folder
5. If yes, open it and find `bin\pgAdmin4.exe`
6. Double-click to launch it

### Option B: Download pgAdmin Separately

If not found, download it:

1. Go to: https://www.pgadmin.org/download/pgadmin-4-windows/
2. Download the latest version (Windows installer)
3. Run the installer
4. Follow the installation wizard (keep default settings)
5. Launch pgAdmin 4 from the Start Menu

---

## Step 3: First-Time pgAdmin Setup

When you open pgAdmin for the first time:

1. **Set Master Password**
   - pgAdmin will ask you to create a "Master Password"
   - This password protects your saved database credentials
   - Choose something you'll remember (e.g., `admin123`)
   - Click "OK"

2. **Wait for pgAdmin to Load**
   - It opens in your web browser (usually at http://127.0.0.1:xxxxx)
   - This is normal - pgAdmin 4 is a web-based application

---

## Step 4: Connect to Your PostgreSQL Server

### 4.1: Check if Server Already Exists

In the left sidebar (Browser panel):

- Look for "Servers" → "PostgreSQL 15" (or similar)
- If you see this, **click on it**
- It will prompt for your PostgreSQL password
- Enter the password you set during PostgreSQL installation
- **If connected successfully, skip to Step 5**

### 4.2: Add a New Server (if not already there)

If no server exists:

1. **Right-click on "Servers"** in the left panel
2. Select **"Register" → "Server..."**

3. **General Tab:**
   - Name: `Local PostgreSQL` (or any name you like)

4. **Connection Tab:**
   - Host name/address: `localhost`
   - Port: `5432`
   - Maintenance database: `postgres`
   - Username: `postgres` (or your PostgreSQL username)
   - Password: `[Your PostgreSQL password]`
   - ☑️ Check "Save password"

5. Click **"Save"**

### 4.3: Troubleshooting Connection Issues

**If you get an error:**

#### Error: "could not connect to server"

PostgreSQL service might not be running.

**Fix:**
```powershell
# Open PowerShell as Administrator
# Check service status
Get-Service -Name postgresql*

# Start the service (replace with your actual service name)
Start-Service postgresql-x64-15
```

#### Error: "password authentication failed"

You entered the wrong password.

**Options:**
1. Try different passwords you might have used
2. Check if you wrote it down during installation
3. Look in password managers
4. Last resort: Reset PostgreSQL password (see Appendix A)

---

## Step 5: Create the Database

Now that you're connected:

1. **Expand the Server** in the left panel
   - Click the `>` next to your server name
   - You'll see: Databases, Login/Group Roles, etc.

2. **Right-click on "Databases"**
   - Select **"Create" → "Database..."**

3. **In the Create Database dialog:**
   - **General Tab:**
     - Database: `thisthat_v1`
     - Owner: `postgres` (or your username)
     - Comment: `ThisThat application database` (optional)

4. Click **"Save"**

5. **Verify Creation:**
   - Expand "Databases" in the left panel
   - You should see `thisthat_v1` listed

✅ **Success!** Your database is now created.

---

## Step 6: Verify Database Connection in Your App

Now test that your application can connect:

1. **Make sure your `.env` file has the correct DATABASE_URL:**

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/thisthat_v1
```

Replace:
- `postgres` with your PostgreSQL username (if different)
- `YOUR_PASSWORD` with your actual PostgreSQL password

2. **Run Prisma commands:**

```powershell
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio to view database
npx prisma studio
```

If `npx prisma studio` opens in your browser and shows your database tables, **everything is working!**

---

## Step 7: Useful pgAdmin Features

### View Database Tables

1. Expand: `Databases` → `thisthat_v1` → `Schemas` → `public` → `Tables`
2. Right-click any table → **"View/Edit Data"** → **"All Rows"**

### Run SQL Queries

1. Right-click on `thisthat_v1` database
2. Select **"Query Tool"**
3. Type SQL queries, e.g.:
   ```sql
   SELECT * FROM "User";
   ```
4. Click the **▶️ Execute** button (or press F5)

### Backup Database

1. Right-click on `thisthat_v1`
2. Select **"Backup..."**
3. Choose a filename and location
4. Click **"Backup"**

---

## Common Issues & Solutions

### Issue: "Permission denied" errors in pgAdmin

**Solution:** Run pgAdmin as Administrator
- Right-click pgAdmin icon → "Run as administrator"

### Issue: Can't find PostgreSQL password

**See Appendix A below**

### Issue: Port 5432 already in use

Another PostgreSQL instance might be running.

**Check:**
```powershell
netstat -ano | findstr :5432
```

### Issue: pgAdmin won't open/crashes

**Try:**
1. Clear pgAdmin cache: Delete `C:\Users\YOUR_USERNAME\AppData\Roaming\pgAdmin`
2. Reinstall pgAdmin
3. Use an older pgAdmin version

---

## Appendix A: Reset PostgreSQL Password

If you forgot your PostgreSQL password:

### Method 1: Via Windows Services

1. Open **Services** (Press `Win + R`, type `services.msc`)
2. Find service like `postgresql-x64-15`
3. Note the service name
4. Open **Command Prompt as Administrator**

```cmd
# Stop PostgreSQL
net stop postgresql-x64-15

# Edit pg_hba.conf to allow password-less login
# Location: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Change all "md5" or "scram-sha-256" to "trust"

# Start PostgreSQL
net start postgresql-x64-15

# Connect without password
psql -U postgres

# In psql, reset password:
ALTER USER postgres PASSWORD 'new_password';
\q

# Revert pg_hba.conf changes (change "trust" back to "md5")
# Restart service
net stop postgresql-x64-15
net start postgresql-x64-15
```

### Method 2: Reinstall PostgreSQL (Last Resort)

1. Uninstall PostgreSQL via Control Panel
2. Delete folder: `C:\Program Files\PostgreSQL`
3. Delete folder: `C:\Users\YOUR_USERNAME\AppData\Roaming\postgresql`
4. Reinstall PostgreSQL from: https://www.postgresql.org/download/windows/
5. **Write down the password this time!**

---

## Next Steps

After setting up pgAdmin and creating the database:

1. ✅ Database created: `thisthat_v1`
2. ✅ pgAdmin connected and working
3. **Next:** Run Prisma migrations to create tables
   ```powershell
   cd backend
   npx prisma db push
   ```
4. **Then:** Start your backend server
   ```powershell
   npm run dev
   ```

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Open pgAdmin | Start Menu → pgAdmin 4 |
| Connect to server | Click server name, enter password |
| Create database | Right-click Databases → Create → Database |
| View tables | Databases → thisthat_v1 → Schemas → public → Tables |
| Run SQL | Right-click database → Query Tool |
| Check service | `Get-Service postgresql*` in PowerShell |
| Start service | `Start-Service postgresql-x64-15` |

---

## Need More Help?

1. Check [QUICK_FIX.md](./QUICK_FIX.md) for environment setup
2. Check [FIX_DATABASE_SETUP.md](./FIX_DATABASE_SETUP.md) for database alternatives
3. PostgreSQL docs: https://www.postgresql.org/docs/
4. pgAdmin docs: https://www.pgadmin.org/docs/

---

**You're all set!** Follow the steps above and you'll have pgAdmin configured and your database ready to go. 🚀
