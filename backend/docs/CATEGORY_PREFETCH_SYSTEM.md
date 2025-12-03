# Category Prefetch System

**Intelligent market prefetching system for THISTHAT**

## 📋 Overview

The Category Prefetch System automatically maintains sufficient markets across all categories to ensure users never run out of content while betting. It monitors market counts per category and intelligently prefetches from Polymarket when levels drop below thresholds.

## 🎯 Goals

- **Target**: 300,000 total markets across all categories
- **Per Category Limit**: 10,000 markets maximum
- **Minimum Threshold**: 500 markets per category
- **Prefetch Batch Size**: 1,000 markets per category per run
- **Check Frequency**: Every 5 minutes

## 🏗️ Architecture

### Components

1. **Category Monitor Service** (`src/services/category-monitor.service.ts`)
   - Tracks market counts per category
   - Identifies categories needing prefetch
   - Calculates system-wide statistics

2. **Category Prefetch Job** (`src/jobs/category-prefetch.job.ts`)
   - Runs every 5 minutes via cron
   - Checks all categories automatically
   - Enqueues prefetch tasks for low categories
   - Supports manual runs that wait for queue completion

3. **Prefetch Queue Service** (`src/services/prefetch-queue.service.ts`)
   - Redis-backed queue with in-memory fallback
   - Automatic retries with exponential backoff
   - Dead-letter queue for exhausted attempts
   - Concurrency + poll interval configurable

4. **Category Cache Service** (`src/services/category-cache.service.ts`)
   - Stores prefetched markets per category in Redis
   - TTL/limit configurable (defaults: 5 minutes / 200 markets)
   - Used by API before falling back to PostgreSQL

5. **Market Ingestion Service** (`src/services/market-ingestion.service.ts`)
   - Fetches markets from Polymarket Gamma API
   - Supports category-specific filtering
   - Handles deduplication (update vs create)

## ⚙️ Configuration

### Environment Variables

```env
# Minimum markets per category before triggering prefetch
MIN_MARKETS_PER_CATEGORY=500

# Maximum markets allowed per category (10,000 limit)
MAX_MARKETS_PER_CATEGORY=10000

# How many markets to fetch per prefetch batch
PREFETCH_BATCH_SIZE=1000

# Cron schedule for category monitoring (every 5 minutes)
CATEGORY_PREFETCH_CRON=*/5 * * * *

# Prefetch cache (Redis)
CATEGORY_PREFETCH_CACHE_TTL_SECONDS=300
CATEGORY_PREFETCH_CACHE_LIMIT=200

# Prefetch queue
PREFETCH_QUEUE_MAX_ATTEMPTS=3
PREFETCH_QUEUE_RETRY_BASE_MS=30000
PREFETCH_QUEUE_RETRY_BACKOFF_MULTIPLIER=2
PREFETCH_QUEUE_POLL_INTERVAL_MS=1000
PREFETCH_QUEUE_CONCURRENCY=1
PREFETCH_QUEUE_MANUAL_TIMEOUT_MS=180000
```

### Categories Monitored

The system monitors 8 categories:
- **Politics** - Elections, government, policy
- **Sports** - Football, basketball, championships
- **Crypto** - Bitcoin, Ethereum, blockchain
- **Technology** - AI, software, hardware
- **Economics** - Markets, inflation, GDP
- **Entertainment** - Movies, celebrities, awards
- **Weather** - Climate, temperature, storms
- **General** - Miscellaneous markets

## 🚀 How It Works

### Automatic Prefetch Cycle

1. **Every 5 minutes**, the job wakes up
2. **Checks** all monitored categories
3. **Identifies** categories below the minimum threshold
4. **Enqueues** queue tasks with fetch volumes tuned per category
5. **Queue workers** execute ingestion with retries + backoff
6. **Caches** fresh markets in Redis for instant client access
7. **Stops** when category reaches 10,000 (capacity)
8. **Logs** detailed statistics + queue metrics

### Example Run

```
[Category Prefetch Job] ========== SCHEDULED RUN ==========
[Category Prefetch Job] System Overview:
  - Total markets: 1,000
  - Categories needing prefetch: 8

[Category Prefetch Job] Category Status:
  🔴 LOW politics        202 / 10000 markets
  🔴 LOW sports          410 / 10000 markets
  🔴 LOW crypto           32 / 10000 markets

[Category Prefetch Job] 📥 Prefetching for 8 categories...
[Category Prefetch Job] 🔄 Fetching 1000 markets for "politics"...
[Category Prefetch Job] ✅ "politics" complete: 798 created, 0 updated
[Category Prefetch Job] ========== COMPLETE ==========
```

## 📊 Monitoring

### View Statistics

```bash
# Show current stats dashboard
npm run stats
```

Output:
```
╔════════════════════════════════════════════════════════════════╗
║            CATEGORY STATISTICS DASHBOARD                      ║
╚════════════════════════════════════════════════════════════════╝

🌐 System Overview:
   Total markets:             1,000
   Total open markets:        1,000
   Average per category:      125.0
   Categories needing prefetch: 8
   Categories at capacity:    0

📂 Category Breakdown:
   ┌─────────────────┬───────────┬──────────┬───────────┬────────────┐
   │ Category        │ Count     │ Target   │ Max       │ Status     │
   ├─────────────────┼───────────┼──────────┼───────────┼────────────┤
   │ politics        │     202 │    500 │   10000 │ 🔴 LOW     │
   │ sports          │     410 │    500 │   10000 │ 🔴 LOW     │
   └─────────────────┴───────────┴──────────┴───────────┴────────────┘

📈 Progress to 300,000 markets goal:
   Current: 1,000
   Target:  300,000
   Progress: 0.33%
   Remaining: 299,000
```

### Test Prefetch

```bash
# Manually trigger a prefetch cycle
npm run test:prefetch
```

## 💾 Caching & ⚙️ Queueing

### Redis Category Cache
- Stores up to 200 prefetched markets per category (configurable)
- TTL defaults to 5 minutes (configurable)
- API layer checks cache before hitting PostgreSQL when `skip=0`
- Cache is automatically refreshed after every successful prefetch run

### Prefetch Queue
- Redis-backed queue with in-memory fallback when Redis is unavailable
- Configurable retry attempts, base delay, backoff multiplier, concurrency, and poll interval
- Failed tasks are retried with exponential backoff; exhausted tasks are moved to a dead-letter queue (`queue:prefetch:dead-letter:v1`)
- Manual runs wait for the queue to finish (with timeout) so scripts receive deterministic feedback

## 🔧 Maintenance

### Manual Triggers

```typescript
import { triggerManualPrefetch } from './jobs/category-prefetch.job.js';

// Trigger prefetch manually (for admin panel)
await triggerManualPrefetch();
```

### Check Category Status

```typescript
import { getAllCategoryStats } from './services/category-monitor.service.js';

const stats = await getAllCategoryStats();
stats.forEach(stat => {
  console.log(`${stat.category}: ${stat.count} markets`);
});
```

## 📈 Scaling to 300,000 Markets

### Timeline Estimates

Assuming Polymarket has sufficient markets:

- **Starting**: 1,000 markets
- **Target**: 300,000 markets
- **Needed**: 299,000 more markets

**With current settings:**
- Fetches 1,000 markets per category per run
- 8 categories × 1,000 = 8,000 markets per cycle (max)
- Runs every 5 minutes
- ~96,000 markets per day (theoretical maximum)

**To reach 300k:**
- ~3-4 days if Polymarket has unlimited active markets
- In practice: Depends on Polymarket's available active markets

### Capacity Planning

- **Max per category**: 10,000
- **8 categories**: 8 × 10,000 = 80,000 markets max
- **To reach 300k**: Need more categories or higher limits

**Note**: Current system caps at 80,000 markets total. To reach 300k, you would need to:
1. Increase `MAX_MARKETS_PER_CATEGORY` to 37,500 (300,000 ÷ 8)
2. Or add more categories
3. Or include closed/resolved markets

## ⚠️ Important Notes

### Rate Limiting

- Polymarket API has rate limits
- System includes circuit breaker + retry logic
- External API calls limited to 5 req/min
- Automatic backoff on failures

### Database Considerations

- Markets stored in `thisthat_markets` PostgreSQL DB
- Ensure sufficient storage (300k markets ≈ 500MB)
- Regular backups recommended

### Polymarket Availability

- System depends on Polymarket having active markets
- If Polymarket runs out of markets in a category, prefetch stops for that category
- Check Polymarket's actual market availability before setting aggressive targets

## 🐛 Troubleshooting

### No Markets Being Fetched

1. Check Polymarket API connectivity
2. Verify environment variables are set
3. Check logs for errors: `[Category Prefetch Job]`
4. Ensure cron job is running

### Category Stuck at Low Count

1. Check if Polymarket has markets in that category
2. Verify category filtering logic
3. Check for API rate limiting errors

### System Not Prefetching

1. Verify job is started: Check for "Scheduler started" log
2. Check cron expression: `CATEGORY_PREFETCH_CRON`
3. Restart backend server

## 📝 Logs

Look for these log prefixes:
- `[Category Prefetch Job]` - Prefetch operations
- `[Market Ingestion]` - Polymarket API calls
- `[Category Monitor]` - Category statistics

## 🎮 Commands

```bash
# View current statistics
npm run stats

# Test prefetch manually
npm run test:prefetch

# Check markets in database
npm run list:markets

# Show categories
npm run list:categories
```

## 🔮 Future Enhancements

- [ ] Add admin API endpoint to trigger prefetch
- [ ] Dashboard UI for monitoring
- [ ] Email alerts when categories run low
- [ ] Historical tracking of market counts
- [ ] Per-category prefetch schedules
- [ ] Dynamic batch sizes based on demand
