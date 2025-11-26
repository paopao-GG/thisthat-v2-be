# X OAuth Setup - Quick Reference

## Your Credentials

**Client ID:** `NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ`  
**Client Secret:** `I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA`

## ⚠️ Important: X Doesn't Accept Localhost

X/Twitter **does NOT accept `localhost` URLs** for OAuth 2.0. You have two options:

---

## Option 1: Use Production Domain (Recommended)

### X Developer Portal Configuration:
- **Callback URI:** `https://www.growgami.com/api/v1/auth/x/callback`
- **Website URL:** `https://www.growgami.com`

### Local Development Setup:

**Option 1A: Test with Production Backend**
- Deploy your backend to production first
- Test OAuth flow using production URLs
- Update environment variables accordingly

**Option 1B: Use ngrok to Tunnel to Local Backend**

1. **Start your local backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start ngrok (in a new terminal):**
   ```bash
   ngrok http 3001
   ```

3. **Copy the ngrok HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Update X Developer Portal:**
   - **Callback URI:** `https://abc123.ngrok.io/api/v1/auth/x/callback`
   - **Website URL:** `https://www.growgami.com` (keep your domain)

5. **Update `backend/.env`:**
   ```env
   X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
   X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
   X_REDIRECT_URI=https://abc123.ngrok.io/api/v1/auth/x/callback
   FRONTEND_URL=http://localhost:5173
   ```

**Note:** ngrok URLs change each restart. Update X Portal and `.env` when they change.

---

## Option 2: Use Production Domain for Everything

### X Developer Portal Configuration:
- **Callback URI:** `https://www.growgami.com/api/v1/auth/x/callback`
- **Website URL:** `https://www.growgami.com`

### Environment Variables:

**For Production (`backend/.env.production`):**
```env
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback
FRONTEND_URL=https://www.growgami.com
```

**For Local Development (if using ngrok):**
```env
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

---

## Quick Setup Steps

1. **Go to X Developer Portal:**
   - https://developer.twitter.com/en/portal/dashboard
   - Select your app
   - Navigate to "User authentication settings"
   - Click "Edit"

2. **Configure OAuth 2.0:**
   - Enable **OAuth 2.0** (not OAuth 1.0a)
   - **App permissions:** Read (or Read and write)
   - **Type of App:** Web App, Automated App or Bot
   - **Callback URI:** Use one of the options above ⬆️
   - **Website URL:** `https://www.growgami.com`

3. **Save and copy:**
   - Client ID: `NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ`
   - Client Secret: `I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA`

4. **Update `backend/.env`:**
   ```env
   X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
   X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
   X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback
   FRONTEND_URL=https://www.growgami.com
   ```

5. **Test the flow:**
   - Start backend: `cd backend && npm run dev`
   - Start frontend: `cd frontend && npm run dev`
   - Visit your app and click "Sign in with X"

---

## Production Deployment

When deploying to production:

1. **Keep the same Client ID/Secret** (they work for both environments)

2. **Add production callback URI** in X Portal (if not already added):
   - `https://www.growgami.com/api/v1/auth/x/callback`

3. **Set environment variables** on your hosting platform:
   ```env
   X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
   X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
   X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback
   FRONTEND_URL=https://www.growgami.com
   ```

---

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- ✅ Check that callback URI in X Portal exactly matches `X_REDIRECT_URI` in `.env`
- ✅ No trailing slashes
- ✅ Must use HTTPS (not HTTP) for production

**Error: "invalid_client"**
- ✅ Verify Client ID and Client Secret are correct
- ✅ Check that OAuth 2.0 is enabled (not OAuth 1.0a)

**Localhost not working**
- ✅ X doesn't accept localhost - use ngrok or production domain
- ✅ See Option 1 above

---

**Last Updated:** 2025-01-XX

