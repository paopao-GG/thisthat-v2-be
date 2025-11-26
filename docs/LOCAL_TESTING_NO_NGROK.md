# Local Testing Without ngrok

## The Problem

X/Twitter **does NOT accept `localhost` URLs** for OAuth callbacks. However, you can try these alternatives:

---

## Option 1: Use 127.0.0.1 (Try This First)

Sometimes X accepts `127.0.0.1` instead of `localhost`.

### Step 1: Update `backend/.env`
```env
# X OAuth Configuration (Local Testing)
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=http://127.0.0.1:3001/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

### Step 2: Update X Developer Portal
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app → "User authentication settings" → "Edit"
3. Add callback URI: `http://127.0.0.1:3001/api/v1/auth/x/callback`
4. Save

### Step 3: Test
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit: http://localhost:5173

**If this doesn't work** (X rejects it), try Option 2.

---

## Option 2: Use Production Callback URI

If your backend is already deployed and accessible at the production URL:

### Update `backend/.env`
```env
# X OAuth Configuration (Using Production Callback)
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

**How it works:**
1. User clicks "Sign in with X" on localhost:5173
2. Redirects to X OAuth
3. X redirects to production backend callback (`https://www.growgami.com/api/v1/auth/x/callback`)
4. Production backend processes OAuth and redirects to `FRONTEND_URL` (localhost:5173)
5. Frontend receives tokens and logs user in

**Requirements:**
- Your backend must be deployed and accessible at `https://www.growgami.com`
- The production backend must have the same environment variables set

---

## Option 3: Cloudflare Tunnel (Free Alternative to ngrok)

If Options 1 and 2 don't work, use Cloudflare Tunnel (free, no URL changes):

1. Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Run: `cloudflared tunnel --url http://localhost:3001`
3. Use the provided HTTPS URL in X Portal and `.env`

---

## Recommended: Use ngrok (Most Reliable)

While you said you don't want to use ngrok, it's the most reliable solution for local OAuth testing. It's free and takes 2 minutes to set up:

1. Download: https://ngrok.com/download
2. Run: `ngrok http 3001`
3. Copy HTTPS URL
4. Update X Portal and `.env`

---

## Current Configuration

For your setup (frontend: localhost:5173, backend: localhost:3001):

**Try Option 1 first** - Update your `backend/.env`:
```env
X_REDIRECT_URI=http://127.0.0.1:3001/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

And add `http://127.0.0.1:3001/api/v1/auth/x/callback` to X Developer Portal.

If X rejects it, you'll need to either:
- Deploy backend to production (Option 2)
- Use ngrok/Cloudflare Tunnel (Option 3)

---

**Last Updated:** 2025-01-XX

