# Auth Speed & Security Improvements

This document outlines recommended **performance (speed)** and **security** improvements for the current auth system, which uses:

- Stateless JWT authentication
- OAuth login via X (Twitter)
- `/api/v1/auth/me` endpoint that **always fetches user data from the database** using Prisma
- Node.js / TypeScript backend with Postgres

The goal is to make this architecture **safe and scalable** for many users.

---

## 1. Current Architecture (Summary)

**Login flow (OAuth with X):**

1. User clicks “Login with X” on the frontend.
2. Frontend redirects to backend OAuth endpoint.
3. Backend handles callback at `GET /api/v1/auth/x/callback`:
   - Exchanges OAuth code for X access token.
   - Fetches user info from X API.
   - Looks up user in the database:
     - If OAuthAccount exists → update user.
     - If new → create a new user record.
   - Returns:
     - User data from the database.
     - A signed **JWT access token** (and optionally a refresh token).

**Authenticated requests (e.g. `/api/v1/auth/me`):**

1. Frontend includes JWT in the request (e.g. Authorization header).
2. `auth.middleware.ts`:
   - Verifies the JWT signature.
   - Decodes token to get `userId` and `email`.
   - Attaches decoded info to the request.
   - **No database lookup here.**
3. `getMeHandler`:
   - Reads `userId` from the request.
   - Calls `getUserProfile(userId)`.
4. `getUserProfile`:
   - Uses Prisma to query Postgres.
   - Returns **fresh user data** (credits, stats, etc.) from the DB every time.

**Key properties:**

- JWT token contains only `userId` and `email` (no profile data).
- User profile is **always fetched from the database**.
- No server-side session storage → **stateless** auth.
- Every `/me` request → 1 DB query.

This is a **standard and solid pattern**, but for high traffic and many users we can improve both **speed** and **security**.

---

## 2. Performance Improvements (Speed)

### 2.1 Reduce unnecessary `/me` calls on the frontend

**Problem:** If the frontend calls `/me` too often (e.g. on every page, every few seconds), this creates unnecessary load on the database.

**Recommendations:**

- Call `/me` **once after login** and store the user in:
  - React context, Zustand, Redux, or React Query cache.
- Only refetch `/me` when:
  - User comes back after a long time (e.g. on page reload).
  - An action that clearly changes user data happens (e.g. placing a bet, resolving a market, changing profile).
- For pages that don’t need user details, **do not** call `/me` at all.

**Result:** Fewer DB queries, faster response times, lower cost.

---

### 2.2 Query only the fields you need

**Problem:** Fetching full user records (including large JSON, relations, or rarely used fields) wastes bandwidth and CPU.

**Recommendations:**

- In `getUserProfile`, use Prisma `select` to fetch a minimal subset of fields, e.g.:

```ts
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    username: true,
    credits: true,
    stats: true,
    // Avoid selecting huge relations by default
  },
});
```

- Add separate endpoints for heavy or rarely used data (e.g. detailed history, logs) instead of bundling everything into `/me`.

**Result:** Faster queries, smaller JSON, less CPU/memory usage.

---

### 2.3 Ensure proper database indexing & connection pooling

**Recommendations:**

- Ensure the `id` field is the **primary key** and indexed (this is usually default).
- If you query by other fields often (e.g. `email`), add proper database indexes.
- Use a **connection pool** (via your Postgres provider or a pooler like PgBouncer).

This prevents connection exhaustion and keeps DB latency low under load.

---

### 2.4 Caching layer (optional, for high traffic)

For large scale or read-heavy workloads, you can add **Redis caching** on top of the DB:

- Cache the resolved user profile for a short time (e.g. 10–60 seconds):
  - Cache key: `user:profile:${userId}`
  - Value: JSON of the selected user fields.
- On `/me`:
  1. Check Redis first.
  2. If present → return cached data.
  3. If not → query Postgres → store in Redis → return.

**Important:**

- Keep TTL short so user data (credits, balances) stays reasonably fresh.
- Invalidate or refresh cache after key balance-changing actions (e.g. placing a bet).

This is a **later-stage optimization** once the system has real traffic.

---

### 2.5 Rate limiting & load shedding

- Implement rate limiting on auth-related endpoints, including:
  - `/api/v1/auth/x` (start OAuth)
  - `/api/v1/auth/x/callback`
  - `/api/v1/auth/me`
- Use a library like `express-rate-limit` (or similar) with Redis storage for distributed setups.
- Define safe limits per IP/user, e.g.:
  - `/me`: 10–30 requests per minute per user is usually more than enough.

This protects the DB and auth system from abuse or accidental flooding.

---

## 3. Security Improvements

### 3.1 JWT configuration

**Recommendations:**

- Use a **strong JWT secret** (`JWT_SECRET`):
  - Long, random string; stored in environment variables only.
  - Do not commit it to Git.
- Use a secure algorithm such as `HS256` (symmetric) or `RS256` (asymmetric).
- Include basic claims:
  - `sub` (subject, usually `userId`)
  - `iat` (issued at)
  - `exp` (expiration time)
  - Optionally `iss` (issuer) and `aud` (audience).

Example access token lifetime: **15 minutes to 1 hour**.

If you need long-lived sessions, use **refresh tokens** (see below).

---

### 3.2 Access token + Refresh token strategy

To balance security and UX:

- **Access token (JWT):**
  - Short-lived (15–60 minutes).
  - Used for calling APIs like `/me` and betting endpoints.
- **Refresh token:**
  - Long-lived (days/weeks).
  - Stored more securely (e.g. HttpOnly cookie).
  - Used only at `/api/v1/auth/refresh` to issue new access tokens.

**Benefits:**

- If an access token is leaked, it becomes useless quickly.
- Refresh tokens can be invalidated (e.g. via a `tokenVersion` field in the DB).

---

### 3.3 Token storage on the frontend

**Recommendations:**

- Prefer **HttpOnly cookies** for storing access/refresh tokens:
  - `HttpOnly` → JavaScript cannot read it (protects against XSS).
  - `Secure` → only sent over HTTPS.
  - `SameSite=Lax` or `Strict` → reduces CSRF risk.
- If you use localStorage or sessionStorage:
  - Be very strict about preventing XSS (input validation, CSP headers, no `eval`, etc.).
  - Understand that any XSS bug can expose tokens.

Using HttpOnly cookies with proper CORS and CSRF protection is usually safer.

---

### 3.4 OAuth (X/Twitter) best practices

- Use **PKCE** for OAuth where possible.
- Always validate the `state` parameter to prevent CSRF during OAuth login.
- Restrict redirect/callback URLs to known, trusted URLs (e.g., your production and dev domains only).
- Request minimal scopes necessary from X, not broad access.

---

### 3.5 API protection & authorization

- Apply JWT auth middleware to **all protected routes**, not just `/me`.
- Enforce **authorization** (what the user is allowed to do), not just authentication (who they are):
  - Role/permissions checks where needed (e.g. admin-only endpoints).
- Validate and sanitize all incoming data (body, query, params):
  - Use a schema validation library (e.g. Zod, Joi, Yup).
- Return safe error messages:
  - Do not leak internal details (stack traces, SQL queries) to clients.

---

### 3.6 Transport security (HTTPS & CORS)

- Run everything over **HTTPS** in production.
- Use **HSTS headers** to force browsers to use HTTPS.
- Configure **CORS** to only allow trusted frontends, e.g.:
  - `https://your-production-frontend.com`
  - `http://localhost:5173` for local dev (if needed)
- Do not use `Access-Control-Allow-Origin: *` on auth endpoints.

---

### 3.7 Logging & monitoring

- Log security-relevant events:
  - Logins, logouts, refresh token use, failed JWT verifications.
- Store logs centrally (e.g. in a logging service) and monitor for:
  - Unusual token usage.
  - Repeated failed auth attempts.
- Do NOT log full tokens or sensitive data; log only safe identifiers (e.g. userId, part of token ID).

---

## 4. Prioritized Checklist

### 4.1 Must-have before production

1. **JWT config**
   - Strong secret, stored in env.
   - `exp` set for access tokens.
2. **HTTPS everywhere** in production.
3. **CORS locked down** to trusted origins only.
4. **Auth middleware** applied to all protected routes.
5. **Minimal field selection** in `/me` (Prisma `select`).
6. **Frontend** does not spam `/me` (use caching/state).
7. **Rate limiting** on auth endpoints.
8. **Validation of inputs** on all critical routes.

### 4.2 High-value next steps

1. Implement **access + refresh token** flow.
2. Introduce **role-based authorization** for admin or special features.
3. Add **Redis caching** for `/me` and/or other hot read endpoints if DB load becomes high.
4. Add **monitoring and alerting** for error rates, DB latency, and auth failures.

---

## 5. Summary

Your current architecture (stateless JWT + database lookups for `/me`) is **a solid, modern foundation**.

To scale safely for many users:

- **Speed:**  
  - Reduce unnecessary `/me` calls.  
  - Select only needed fields.  
  - Ensure proper indexing and pooling.  
  - Add caching and rate limiting when traffic grows.

- **Security:**  
  - Harden JWT (secret, expiry, claims).  
  - Use safe token storage (prefer HttpOnly cookies).  
  - Follow OAuth best practices with X.  
  - Enforce strict CORS, HTTPS, input validation, and logging.

With these improvements, the system will be much more ready for **real-world, high-traffic deployment** while keeping user data safe and performance smooth.
