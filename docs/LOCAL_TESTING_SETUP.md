# Local Testing Setup for X OAuth

## ⚠️ Important: X Doesn't Accept Localhost

X/Twitter **does NOT accept `localhost` URLs** for OAuth callbacks. You have a few options:

---

## Option 1: Use 127.0.0.1 (May Work)

Sometimes X accepts `127.0.0.1` instead of `localhost`. Try this first:

### Update `backend/.env`:
```env
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=http://127.0.0.1:3001/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

### Update X Developer Portal:
- Add callback URI: `http://127.0.0.1:3001/api/v1/auth/x/callback`

**Note:** This may not work as X often rejects all local IPs. If it doesn't work, use Option 2.

---

## Option 2: Use Production Callback (If Backend is Deployed)

If your backend is already deployed and accessible at `https://www.growgami.com`:

### Update `backend/.env`:
```env
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

**Note:** OAuth callback will go to production backend, but frontend redirect will go to localhost:5173.

---

## Option 3: Use ngrok (Most Reliable)

For reliable local testing, ngrok is recommended. See original guide below.

---

## Quick Setup for Local Testing (Without ngrok - Try Option 1 First)

### Step 1: Install ngrok
Download from: https://ngrok.com/download

### Step 2: Start Your Backend
```bash
cd backend
npm run dev
```
Backend runs on: `http://localhost:3001`

### Step 3: Start ngrok Tunnel
In a **new terminal**:
```bash
ngrok http 3001
```

You'll see something like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 4: Update X Developer Portal
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app → "User authentication settings" → "Edit"
3. In **"Callback URI / Redirect URL"**, add:
   - `https://abc123.ngrok.io/api/v1/auth/x/callback` (your ngrok URL)
   - Keep the production one: `https://www.growgami.com/api/v1/auth/x/callback`
4. **Website URL:** Keep as `https://www.growgami.com`
5. Click **"Save"**

### Step 5: Update `backend/.env`
```env
# X OAuth Configuration (Local Testing)
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://abc123.ngrok.io/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

**⚠️ Important:** Replace `abc123.ngrok.io` with your actual ngrok URL!

### Step 6: Create `frontend/.env.local` (Optional)
```env
VITE_API_URL=http://localhost:3001
```

Or the frontend will default to `http://localhost:3001` automatically.

---

## Testing Flow

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start ngrok** (in a new terminal):
   ```bash
   ngrok http 3001
   ```

3. **Start Frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

4. **Visit:** http://localhost:5173

5. **Click:** "Sign in with X Account"

6. **Complete X OAuth** on X's website

7. **Should redirect back** to http://localhost:5173/auth/callback

8. **Then redirect** to http://localhost:5173/app

---

## Important Notes

### ngrok URLs Change
- Free ngrok URLs change each time you restart ngrok
- **Update both:**
  1. X Developer Portal callback URI
  2. `backend/.env` `X_REDIRECT_URI`

### Or Use ngrok Static Domain (Paid)
- Paid ngrok plans allow static domains
- Then you don't need to update URLs each time

---

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- ✅ Check that callback URI in X Portal **exactly** matches `X_REDIRECT_URI` in `.env`
- ✅ Make sure you're using the **HTTPS** ngrok URL (not HTTP)
- ✅ If you restarted ngrok, update both X Portal and `.env`

**Error: "Connection refused"**
- ✅ Make sure backend is running on port 3001
- ✅ Make sure ngrok is running and pointing to port 3001

**OAuth works but redirects to wrong frontend URL**
- ✅ Check `FRONTEND_URL` in `backend/.env` is `http://localhost:5173`
- ✅ Make sure frontend is running on port 5173

**ngrok shows "Session Expired"**
- ✅ Sign up for a free ngrok account: https://dashboard.ngrok.com/signup
- ✅ Add your authtoken: `ngrok config add-authtoken YOUR_TOKEN`

---

## Environment Variables Summary

### Local Testing:
```env
# backend/.env
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

```env
# frontend/.env.local (optional)
VITE_API_URL=http://localhost:3001
```

### Production:
```env
# backend/.env
X_CLIENT_ID=NHZKbVRLSG9VTldiVjRjeVpkOGY6MTpjaQ
X_CLIENT_SECRET=I81A85lyP18Rl-np2sEZbySDAkCZmPXBzj9lCnUjo7hsist9KA
X_REDIRECT_URI=https://www.growgami.com/api/v1/auth/x/callback
FRONTEND_URL=https://www.growgami.com
```

---

**Last Updated:** 2025-01-XX
