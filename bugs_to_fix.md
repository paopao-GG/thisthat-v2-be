# BUGS TO FIX

## 1. ✅ **FIXED** - OAuth Redirect Issue (Multiple Fixes Applied)

### Issue Description
During login, when you didn't sign up your X account or used Google to sign in to X, after authenticating, instead of redirecting to the main app page, it redirects to X.com.

### Root Causes Identified & Fixed

#### Fix #1: Frontend URL Detection (COMPLETED)
- **Problem**: Backend was using hardcoded production FRONTEND_URL
- **Solution**: Backend now detects localhost from referer header and redirects accordingly
- **Files Modified**:
  - `backend/src/features/auth/auth.controllers.ts` - Smart frontend URL detection
  - `frontend/src/app/pages/PreLogin.tsx` - Better error handling for cancelled sign-ins

#### Fix #2: X OAuth Redirect URI Mismatch (COMPLETED)
- **Problem**: Backend was sending X OAuth redirect_uri as production URL, but X needs localhost for local development
- **Solution**:
  - Backend now dynamically determines redirect_uri based on NODE_ENV
  - In development: Uses `http://localhost:3001/api/v1/auth/x/callback`
  - In production: Uses production URL from X_REDIRECT_URI env variable
  - Same redirect_uri used in both authorization and token exchange (OAuth 2.0 requirement)
- **Files Modified**:
  - `backend/src/features/auth/oauth.services.ts` - Added `getRedirectUri()` function

### Action Required by User
You must configure X Developer Portal to whitelist the callback URLs:
1. Go to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Navigate to your app → Settings → User authentication settings
3. Add these callback URLs:
   - `http://localhost:3001/api/v1/auth/x/callback` (for local development)
   - `https://www.growgami.com/api/v1/auth/x/callback` (for production)

**See**: [X_OAUTH_SETUP_GUIDE.md](X_OAUTH_SETUP_GUIDE.md) for detailed setup instructions

### Testing
After configuring X Developer Portal:
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173`
4. Click "Sign in with X Account"
5. Sign in with X using Google (or any method)
6. Expected: Redirects to `http://localhost:5173/auth/callback` then to `/app`

### Status
✅ Code fixes applied
⚠️ **Requires X Developer Portal configuration by user**

---

## Future Bugs

### Prisma Client Generation
**Status**: ⚠️ Requires manual action

When regenerating Prisma clients with the new schema changes (AMM reserves, shares fields), you may encounter:
```
EPERM: operation not permitted, rename '...\query_engine-windows.dll.node.tmp' -> '...\query_engine-windows.dll.node'
```

**Solution**: Stop the backend server before running:
```bash
npx prisma generate --schema=prisma/schema.markets.prisma
npx prisma generate --schema=prisma/schema.users.prisma
npx prisma db push --schema=prisma/schema.markets.prisma
npx prisma db push --schema=prisma/schema.users.prisma
```

*(Add new bugs here as they are discovered)*
