# Redis Setup for Windows

## Option 1: Use WSL (Windows Subsystem for Linux) - Recommended

### Step 1: Install WSL (if not already installed)
```powershell
# Run PowerShell as Administrator
wsl --install
# Restart your computer after installation
```

### Step 2: Install Redis in WSL
```bash
# Open WSL terminal (Ubuntu)
sudo apt update
sudo apt install redis-server -y

# Start Redis
sudo service redis-server start

# Verify it's running
redis-cli ping
# Should return: PONG
```

### Step 3: Configure Redis to accept connections
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Find and change:
# bind 127.0.0.1
# to:
# bind 0.0.0.0

# Restart Redis
sudo service redis-server restart
```

### Step 4: Access Redis from Windows
The Redis server running in WSL will be accessible at `localhost:6379` from Windows.

---

## Option 2: Use Docker Desktop

### Step 1: Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Wait for Docker to fully start (whale icon in system tray)

### Step 2: Run Redis Container
```powershell
# Run Redis container
docker run -d -p 6379:6379 --name redis redis:latest

# Verify it's running
docker ps

# Test connection
docker exec -it redis redis-cli ping
# Should return: PONG
```

### Step 3: Stop/Start Redis
```powershell
# Stop Redis
docker stop redis

# Start Redis
docker start redis
```

---

## Option 3: Use Memurai (Windows Native Redis)

### Step 1: Download Memurai
1. Download from: https://www.memurai.com/get-memurai
2. Install Memurai (it's a Redis-compatible server for Windows)

### Step 2: Start Memurai
```powershell
# Start Memurai service
net start Memurai

# Or use the Memurai GUI from Start Menu
```

### Step 3: Verify Connection
```powershell
# If you have redis-cli installed, test:
redis-cli -h localhost -p 6379 ping
```

---

## Option 4: Use Cloud Redis (Easiest for Development)

### Redis Cloud (Free Tier)
1. Sign up at: https://redis.com/try-free/
2. Create a free database
3. Get connection URL (e.g., `redis://default:password@host:port`)
4. Update `.env`:
```env
REDIS_URL=redis://default:yourpassword@yourhost:port
```

### Upstash Redis (Free Tier)
1. Sign up at: https://upstash.com/
2. Create a Redis database
3. Get connection URL
4. Update `.env`:
```env
REDIS_URL=your_upstash_redis_url
```

---

## Option 5: Run Without Redis (Development Only)

The system will work without Redis, but leaderboards will be slower (no caching).

### Update `.env`:
```env
# Comment out or remove REDIS_URL
# REDIS_URL=redis://localhost:6379
```

The application will log a warning but continue to work.

---

## Verify Redis Connection

### Test from Node.js
```powershell
# In backend directory
node -e "const redis = require('redis'); const client = redis.createClient({url: 'redis://localhost:6379'}); client.connect().then(() => { console.log('✅ Redis connected!'); client.quit(); }).catch(err => console.error('❌ Redis error:', err));"
```

### Test from Application
Start your server and check logs:
```
✅ Redis connected
```

---

## Troubleshooting

### Redis Connection Refused
- Make sure Redis is running
- Check if port 6379 is available: `netstat -an | findstr 6379`
- Verify firewall isn't blocking port 6379

### Docker Not Starting
- Make sure Docker Desktop is installed and running
- Check Windows features: WSL 2 must be enabled
- Restart Docker Desktop

### WSL Redis Not Accessible from Windows
- Make sure WSL is running: `wsl --status`
- Check Redis is bound to 0.0.0.0, not just 127.0.0.1
- Restart Redis service in WSL

---

## Recommended Setup for Development

**For quickest setup:** Use Option 4 (Cloud Redis - Upstash or Redis Cloud)
- No installation needed
- Free tier available
- Works immediately

**For local development:** Use Option 1 (WSL) or Option 2 (Docker)
- More control
- No external dependencies
- Better for offline development

