# Redis Setup Guide for Windows

Redis is **optional** for V1 - the system works without it, but leaderboards will be slower.

## Option 1: Use Docker (Recommended if Docker Desktop is installed)

1. **Start Docker Desktop** (if not already running)

2. **Run Redis container:**
   ```powershell
   docker run -d -p 6379:6379 --name thisthat-redis redis:7-alpine
   ```

3. **Verify it's running:**
   ```powershell
   docker ps | findstr redis
   ```

4. **Test connection:**
   ```powershell
   docker exec -it thisthat-redis redis-cli ping
   ```
   Should return: `PONG`

## Option 2: Install Redis for Windows

### Using WSL2 (Windows Subsystem for Linux)

1. **Install WSL2** (if not already installed):
   ```powershell
   wsl --install
   ```

2. **Open WSL terminal** and install Redis:
   ```bash
   sudo apt update
   sudo apt install redis-server
   ```

3. **Start Redis:**
   ```bash
   sudo service redis-server start
   ```

4. **Verify:**
   ```bash
   redis-cli ping
   ```

### Using Memurai (Windows-native Redis alternative)

1. Download from: https://www.memurai.com/
2. Install and start the service
3. It runs on port 6379 by default

## Option 3: Use Cloud Redis (Production)

- **Redis Cloud:** https://redis.com/try-free/
- **AWS ElastiCache:** https://aws.amazon.com/elasticache/
- **Azure Cache for Redis:** https://azure.microsoft.com/en-us/services/cache/

Set `REDIS_URL` in your `.env` file to the cloud Redis URL.

## Option 4: Run Without Redis (Current State)

**The system works perfectly without Redis!** 

- Leaderboards will query the database directly (slightly slower)
- No caching, but fully functional
- No setup required

Just start the server:
```powershell
cd backend
npm run dev
```

You'll see: `⚠️  Redis not available (continuing without cache - leaderboards will work but be slower)`

## Configuration

If you set up Redis, add to `backend/.env`:

```env
REDIS_URL=redis://localhost:6379
```

Or leave it unset to use the default (`redis://localhost:6379`).

## Verify Redis is Working

When you start the server, you should see:
- `✅ Redis connected` - Redis is working
- `⚠️  Redis not available...` - Redis not found, but system continues

Leaderboard endpoints will work either way!




