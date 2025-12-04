# X (Twitter) OAuth Setup Guide

## Problem: OAuth Redirects to X Instead of Your App

**Issue**: After authenticating with X (especially when using Google to sign in to X), users are redirected to X.com instead of back to your application.

**Root Cause**: The redirect URI configuration in X Developer Portal doesn't match what your application is using.

---

## Solution: Configure X Developer Portal

### Step 1: Access X Developer Portal

1. Go to [https://developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your X account
3. Navigate to your app in the dashboard

### Step 2: Configure OAuth 2.0 Settings

1. Click on your app name
2. Go to **"App Settings"** or **"Settings"** tab
3. Scroll to **"User authentication settings"**
4. Click **"Set up"** or **"Edit"**

### Step 3: Add Callback URLs

You need to add **BOTH** development and production callback URLs:

#### For Local Development:
```
http://localhost:3001/api/v1/auth/x/callback
```

#### For Production:
```
https://www.growgami.com/api/v1/auth/x/callback
```

**Important**:
- X requires you to add each callback URL separately
- The protocol (http/https) must match exactly
- The port must match exactly
- The path must match exactly

### Step 4: Configure App Permissions

Make sure these are enabled:
- ✅ **Read** - For reading user profile information
- ✅ **OAuth 2.0** - Enable OAuth 2.0 authentication
- ✅ **PKCE** - Enable PKCE (Proof Key for Code Exchange)

Required scopes:
```
tweet.read
users.read
offline.access
```

### Step 5: Get Your Credentials

Copy these values to your `.env` file:

```env
# X OAuth Configuration
X_CLIENT_ID=your_client_id_from_x_developer_portal
X_CLIENT_SECRET=your_client_secret_from_x_developer_portal
```

---

## Environment Variable Configuration

### For Local Development

Your `backend/.env` should have:

```env
NODE_ENV=development
PORT=3001

# X OAuth Configuration
X_CLIENT_ID=your_actual_client_id
X_CLIENT_SECRET=your_actual_client_secret
# Leave X_REDIRECT_URI empty for local development (auto-detected)
# X_REDIRECT_URI=

# Frontend URL (auto-detected for localhost)
# FRONTEND_URL=
```

**How it works**:
- When `NODE_ENV=development`, the app automatically uses `http://localhost:3001/api/v1/auth/x/callback`
- You don't need to set `X_REDIRECT_URI` for local development

### For Production

Your production `backend/.env` should have:

```env
NODE_ENV=production
PORT=3001

# X OAuth Configuration
X_CLIENT_ID=your_actual_client_id
X_CLIENT_SECRET=your_actual_client_secret
X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback

# Frontend URL
FRONTEND_URL=https://www.growgami.com
```

---

## Code Changes Made

### 1. Dynamic Redirect URI ([oauth.services.ts:47-67](backend/src/features/auth/oauth.services.ts#L47-L67))

The code now automatically determines the correct redirect URI:

```typescript
function getRedirectUri(): string {
  // Check if we have an explicit redirect URI from env
  if (process.env.X_REDIRECT_URI) {
    return process.env.X_REDIRECT_URI;
  }

  // Otherwise, construct from backend URL
  const port = process.env.PORT || '3001';
  const host = process.env.HOST || '0.0.0.0';

  // In development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:${port}/api/v1/auth/x/callback`;
  }

  // In production, construct from host
  return `http://${host}:${port}/api/v1/auth/x/callback`;
}
```

**Benefits**:
- ✅ Automatically uses `localhost` in development
- ✅ Uses production URL when `X_REDIRECT_URI` is set
- ✅ No manual configuration changes needed when switching environments

### 2. Consistent Redirect URI Usage

The same `redirect_uri` is now used in both:
- Authorization request to X
- Token exchange request

This is **required by OAuth 2.0 spec** - both requests must use identical redirect URIs.

---

## Testing the Fix

### Test 1: Local Development with New X Account (Google Sign-In)

1. **Start your backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start your frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to** `http://localhost:5173`

4. **Click "Sign in with X Account"**
   - Browser redirects to X OAuth page
   - You'll see the callback URL in the browser address bar should be `localhost`

5. **On X OAuth page, click "Sign in with Google"**
   - Complete Google authentication
   - X will authenticate you

6. **Expected Result**:
   - ✅ X redirects to `http://localhost:3001/api/v1/auth/x/callback?code=...`
   - ✅ Backend processes the callback
   - ✅ Frontend redirects to `http://localhost:5173/auth/callback?accessToken=...`
   - ✅ You land on `/app` (home page) with valid session

### Test 2: Verify Redirect URI in Logs

Look for this log message in your backend console:

```
[OAuth] Generated auth URL with redirect_uri: http://localhost:3001/api/v1/auth/x/callback
```

If you see this, the dynamic redirect URI is working correctly.

### Test 3: Existing User Sign-In

1. Navigate to `http://localhost:5173`
2. Click "Sign in with X Account"
3. If you're already signed in to X, it should automatically redirect back
4. Expected: You land on `/app` (home page)

---

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Cause**: The callback URL in your X Developer Portal doesn't match what your app is using.

**Solution**:
1. Go to X Developer Portal
2. Check "User authentication settings"
3. Make sure **EXACTLY** this URL is added for local development:
   ```
   http://localhost:3001/api/v1/auth/x/callback
   ```
4. Note: `http` (not `https`), `localhost` (not `127.0.0.1`), port `3001`

### Issue: Still Redirects to X.com After Sign-In

**Possible Causes**:
1. **Callback URL not whitelisted in X Developer Portal**
   - Solution: Add the exact callback URL as shown above

2. **Using wrong X app credentials**
   - Solution: Verify `X_CLIENT_ID` and `X_CLIENT_SECRET` in `.env` match your X app

3. **X app not approved for OAuth 2.0**
   - Solution: Complete X app review process if required

4. **Cached OAuth state**
   - Solution: Clear browser cookies and try again

### Issue: "Invalid code verifier" Error

**Cause**: The state parameter expired or was lost between requests.

**Solution**:
- This is normal if you take too long (>10 minutes) to complete OAuth flow
- Just try signing in again
- The code includes fallback mechanisms to handle this

### Issue: Backend Shows "Missing code parameter"

**Cause**: X didn't send the authorization code back to your app.

**Possible Reasons**:
1. Callback URL not whitelisted in X Developer Portal
2. User denied authorization
3. Network issue during redirect

**Solution**:
1. Check X Developer Portal callback URLs
2. Look at X Developer Portal logs for more details
3. Try the OAuth flow again

---

## X Developer Portal Screenshots Guide

### Where to Find OAuth Settings:

1. **Dashboard** → Select your app
2. **Settings** tab
3. **User authentication settings** section
4. **OAuth 2.0 Client ID and Client Secret** - Copy these to your `.env`
5. **Callback URLs / Redirect URLs** - Add both local and production URLs here

### Required Configuration:

```
App permissions: Read
Type of App: Web App
Callback URLs:
  - http://localhost:3001/api/v1/auth/x/callback
  - https://www.growgami.com/api/v1/auth/x/callback
Website URL: https://www.growgami.com (or your production domain)
```

---

## Security Considerations

### Why Dynamic Redirect URI is Safe

**Question**: Is it secure to dynamically determine the redirect URI?

**Answer**: Yes, for these reasons:
1. The redirect URI is only used for **routing** the OAuth callback
2. X validates the redirect URI against your whitelist in Developer Portal
3. The actual authentication is protected by:
   - PKCE (Proof Key for Code Exchange)
   - State parameter (prevents CSRF)
   - Client secret (server-side only)
4. If someone tries to use a different redirect URI, X will reject it

### Best Practices

✅ **DO**:
- Whitelist only specific callback URLs (not wildcards)
- Use HTTPS in production
- Keep `X_CLIENT_SECRET` secure (never expose to frontend)
- Use PKCE for added security
- Set short expiration times for OAuth state (currently 10 minutes)

❌ **DON'T**:
- Don't commit `.env` files to Git
- Don't expose client secrets in frontend code
- Don't use `http://` in production (use `https://`)
- Don't use wildcard redirect URIs

---

## Summary of Changes

### Files Modified:
1. ✅ `backend/src/features/auth/oauth.services.ts`
   - Added `getRedirectUri()` function for dynamic redirect URI
   - Updated authorization URL generation
   - Updated token exchange to use same redirect URI

2. ✅ `backend/.env` (user must update)
   - Remove or leave `X_REDIRECT_URI` empty for local development
   - Set `X_REDIRECT_URI` to production URL in production

3. ✅ X Developer Portal (user must configure)
   - Add localhost callback URL: `http://localhost:3001/api/v1/auth/x/callback`
   - Add production callback URL: `https://www.growgami.com/api/v1/auth/x/callback`

---

## Quick Start Checklist

- [ ] Go to X Developer Portal
- [ ] Add callback URL: `http://localhost:3001/api/v1/auth/x/callback`
- [ ] Add callback URL: `https://www.growgami.com/api/v1/auth/x/callback`
- [ ] Copy `X_CLIENT_ID` and `X_CLIENT_SECRET` to `backend/.env`
- [ ] Set `NODE_ENV=development` in `backend/.env`
- [ ] Remove or comment out `X_REDIRECT_URI` in `backend/.env` (for local development)
- [ ] Restart backend: `cd backend && npm run dev`
- [ ] Test OAuth flow: Navigate to `http://localhost:5173` and sign in

---

**Status**: ✅ Ready for testing
**Last Updated**: 2025-01-XX
**Created By**: Claude Code Agent
