# THISTHAT - Items Still Needing Accomplishment

**Generated:** 2025-01-XX  
**Based on:** Codebase review and `changes.md` analysis

---

## Summary

**Total Items:** 10  
**✅ Accomplished:** 5 (50%)  
**🔄 Partially Done:** 2 (20%)  
**❌ Not Started:** 3 (30%)

---

## 🔴 HIGH PRIORITY (Critical for Launch)

### 3. **Auth Security Review** 🔄 Partially Done
**Status:** 🔄 Partially Done  
**Impact:** Security Critical  
**Effort:** Medium (3-4 hours)  
**Priority:** HIGHEST (Critical for Production)

#### What's Complete:
- ✅ Rate limiting implemented (10 req/15min for auth endpoints)
- ✅ OAuth with PKCE flow implemented
- ✅ JWT token handling
- ✅ Security recommendations document exists (`auth-speed-security-improvements.md`)
- ✅ Input validation with Zod
- ✅ CORS configured

#### What's Missing:
- ❌ **HttpOnly Cookies** - Currently tokens stored in localStorage (XSS vulnerable)
  - Need to implement HttpOnly, Secure, SameSite cookies for tokens
  - Backend needs to set cookies instead of returning tokens in response body
  - Frontend needs to remove localStorage token storage
  
- ❌ **Formal Security Audit** - No penetration testing or security review completed
  - Need to audit:
    - Token handling vulnerabilities
    - OAuth callback security
    - Public endpoint exposure
    - CSRF protection
    - XSS prevention
  
- ❌ **Token Refresh Strategy** - Refresh tokens exist but not using HttpOnly cookies
  - Current: Refresh tokens stored in database but sent in response body
  - Needed: HttpOnly cookie storage for refresh tokens
  
- ❌ **User Profile Caching** - `/me` endpoint always queries database
  - Recommendation: Add Redis caching with short TTL (10-60 seconds)
  - Invalidate cache on balance-changing actions

#### Files to Update:
- `backend/src/features/auth/auth.controllers.ts` - Set HttpOnly cookies
- `backend/src/features/auth/oauth.services.ts` - Cookie handling
- `frontend/src/shared/contexts/AuthContext.tsx` - Remove localStorage, use cookies
- `frontend/src/shared/services/authService.ts` - Update to handle cookies

#### Recommended Next Steps:
1. Implement HttpOnly cookie storage for tokens (highest priority)
2. Conduct formal security audit
3. Add Redis caching for user profiles
4. Implement CSRF protection

---

## 🟡 MEDIUM PRIORITY (Improve UX)

### 4. **Skipped Markets Time Window** ❌ Not Started
**Status:** ❌ Not Started  
**Impact:** User Experience  
**Effort:** Low (2-3 hours)  
**Priority:** MEDIUM

#### Current State:
- ✅ Markets marked as "swiped" are tracked in `SwipedMarketsContext`
- ✅ Persisted in localStorage per user
- ❌ **No timestamp tracking** - Only stores market IDs
- ❌ **No time window logic** - Markets never reappear once swiped

#### What's Needed:
- Add timestamp to swiped market tracking: `{ marketId: string, swipedAt: Date }`
- Implement time window check (e.g., 3 days)
- Auto-remove markets from swiped list after time window expires
- Update filtering logic to check timestamps

#### Implementation Plan:
```typescript
// Current: Only stores IDs
swipedMarketIds: Set<string>

// Needed: Store with timestamps
swipedMarkets: Map<string, Date> // marketId -> swipedAt

// Check before filtering:
const isMarketSwiped = (marketId: string) => {
  const swipedAt = swipedMarkets.get(marketId);
  if (!swipedAt) return false;
  
  const daysSinceSwiped = (Date.now() - swipedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceSwiped > 3) {
    // Auto-remove after 3 days
    swipedMarkets.delete(marketId);
    return false;
  }
  return true;
};
```

#### Files to Update:
- `frontend/src/shared/contexts/SwipedMarketsContext.tsx` - Add timestamp tracking
- `frontend/src/app/pages/BettingPage.tsx` - Update filtering logic

---

### 5. **Continuous Prefetching per Category** 🔄 Partially Done
**Status:** 🔄 Partially Done  
**Impact:** User Experience  
**Effort:** Medium (4-5 hours)  
**Priority:** MEDIUM

#### What's Complete:
- ✅ Market ingestion by category exists (`ingestMarketsFromPolymarket` with category filter)
- ✅ Category-based market fetching (`getMarketsByCategory`)
- ✅ Frontend detects low markets and triggers ingestion (`BettingPage.tsx`)
- ✅ Background job for market ingestion (runs every 5 minutes)
- ✅ Basic prefetching when category exhausted

#### What's Missing:
- ❌ **Automatic Background Monitoring** - No proactive detection of low market counts per category
  - Current: Frontend triggers ingestion when user runs out
  - Needed: Backend job that monitors category market counts and prefetches proactively
  
- ❌ **Message Queue for Retries** - No queue system for failed prefetching operations
  - Current: Errors are logged but not retried automatically
  - Needed: Message queue (BullMQ, RabbitMQ, or similar) for:
    - Retrying failed prefetch operations
    - Dead letter queue for permanently failed operations
    - Scheduled retries with exponential backoff
  
- ❌ **Category Market Count Monitoring** - No background job monitoring category levels
  - Needed: Job that checks market counts per category
  - Triggers prefetching when counts drop below threshold (e.g., < 50 markets)
  
- ❌ **Caching Strategy** - Prefetched data not explicitly cached
  - Current: Data stored in database
  - Needed: Redis caching layer for prefetched markets (optional optimization)

#### Implementation Plan:
1. Create background job that monitors category market counts
2. Implement message queue for prefetching operations
3. Add automatic prefetching when category counts drop below threshold
4. Add retry logic with exponential backoff for failed prefetches

#### Files to Create/Update:
- `backend/src/jobs/category-prefetch.job.ts` - New job for monitoring and prefetching
- `backend/src/services/category-monitor.service.ts` - New service for monitoring category counts
- `backend/src/lib/message-queue.ts` - Message queue setup (BullMQ or similar)
- `backend/src/features/markets/markets.services.ts` - Add category count monitoring

---

## 🟢 LOWER PRIORITY (Can Defer)

### 7. **Static Test Data** ❌ Not Started
**Status:** ❌ Not Started  
**Impact:** Development Convenience  
**Effort:** Low (2-3 hours)  
**Priority:** LOW

#### What's Needed:
- Create `prisma/seed.ts` file with sample data:
  - Test users with various credit balances
  - Test markets (open, closed, resolved)
  - Test bets (won, lost, pending)
  - Test transactions
  - Test leaderboard data

#### Implementation:
```typescript
// prisma/seed.ts
async function main() {
  // Create test users
  // Create test markets
  // Create test bets
  // Create test transactions
}
```

#### Files to Create:
- `backend/prisma/seed.ts` - Seed script
- Update `backend/package.json` - Ensure `db:seed` script exists

---

### 8. **Scenario & Risk Mapping** ❌ Not Started
**Status:** ❌ Not Started  
**Impact:** Documentation & Planning  
**Effort:** Medium (4-6 hours)  
**Priority:** LOW

#### What's Needed:
- Document all possible scenarios:
  - What happens if Polymarket API is down?
  - What happens if database connection fails?
  - What happens if Redis is unavailable?
  - What happens during high traffic spikes?
  - What happens if a market resolution fails?
  
- Document all possible errors:
  - Network errors
  - Database errors
  - API rate limits
  - Authentication failures
  - Validation errors
  
- Design countermeasures for each risk:
  - Fallback strategies
  - Retry mechanisms
  - Graceful degradation
  - Alerting and monitoring

#### Files to Create:
- `backend/docs/RISK_MAPPING.md` - Comprehensive risk documentation
- `backend/docs/SCENARIO_PLANNING.md` - Scenario documentation
- `backend/docs/DISASTER_RECOVERY.md` - Recovery procedures

---

## ✅ Already Complete (No Action Needed)

1. ✅ **Rate Limiting** - Fully implemented
2. ✅ **Error Handling & Failover** - Circuit breakers, retry logic, graceful degradation
6. ✅ **Database Separation** - Two PostgreSQL databases, MongoDB removed
9. ✅ **Input Sanitization** - Zod validation, Prisma ORM
10. ✅ **Frictionless Leaderboards** - Redis caching, background updates

---

## Recommended Priority Order

### Before Production Launch:
1. **Auth Security Review** (#3) - Implement HttpOnly cookies (CRITICAL)
2. **Formal Security Audit** (#3) - Security review (CRITICAL)

### Post-Launch Improvements:
3. **Skipped Markets Time Window** (#4) - Quick UX win (2-3 hours)
4. **Continuous Prefetching** (#5) - Improve market availability (4-5 hours)

### Development/Testing:
5. **Static Test Data** (#7) - Helpful for QA (2-3 hours)
6. **Scenario & Risk Mapping** (#8) - Long-term planning (4-6 hours)

---

## Quick Wins (Low Effort, High Impact)

1. **Skipped Markets Time Window** - 2-3 hours, improves UX significantly
2. **Static Test Data** - 2-3 hours, helps with testing and demos
3. **HttpOnly Cookies** - 2-3 hours, critical security improvement

---

**Last Updated:** 2025-01-XX

