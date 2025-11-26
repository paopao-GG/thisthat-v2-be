# X (Twitter) OAuth Implementation Guide

This guide implements "Login with X" authentication using **better-auth** for the frontend and integrating with the existing Fastify backend JWT system.

## Why better-auth?

- ✅ Framework-agnostic (works with React/Vite)
- ✅ Excellent OAuth support (X/Twitter, Google, GitHub, etc.)
- ✅ Can integrate with existing JWT backend
- ✅ TypeScript-first
- ✅ Better than Auth.js for non-Next.js apps

---

## Architecture Overview

```
Frontend (React/Vite)
  ↓ better-auth client
  ↓ OAuth flow
Backend (Fastify)
  ↓ OAuth callback handler
  ↓ Create/update user
  ↓ Generate JWT tokens
  ↓ Return tokens to frontend
```

**Flow:**
1. User clicks "Sign in with X"
2. Frontend redirects to X OAuth
3. X redirects back to backend callback
4. Backend creates/updates user, generates JWT
5. Backend redirects to frontend with tokens
6. Frontend stores tokens and authenticates

---

## Step 1: Update Prisma Schema

Add OAuth support to User model:

```prisma
model User {
  // ... existing fields ...
  passwordHash        String?  @map("password_hash") @db.VarChar(255) // Make optional for OAuth users
  // ... rest of fields ...
  
  // Add OAuth accounts relation
  oauthAccounts       OAuthAccount[]
}

// New model for OAuth accounts
model OAuthAccount {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  provider          String   @db.VarChar(50) // 'x', 'google', etc.
  providerAccountId String  @map("provider_account_id") @db.VarChar(255) // X user ID
  username          String?  @db.VarChar(100) // X username
  email             String?  @db.VarChar(255)
  accessToken       String?  @map("access_token") @db.Text
  refreshToken      String? @map("refresh_token") @db.Text
  expiresAt         DateTime? @map("expires_at") @db.Timestamp()
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamp()
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamp()
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@index([userId])
  @@index([provider])
  @@map("oauth_accounts")
}
```

---

## Step 2: Backend - Install Dependencies

```bash
cd backend
npm install oauth4webapi
npm install --save-dev @types/oauth4webapi
```

---

## Step 3: Backend - Environment Variables

Add to `backend/.env`:

```env
# X OAuth Configuration
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=http://localhost:3001/api/v1/auth/x/callback
FRONTEND_URL=http://localhost:5173
```

**Get X OAuth 2.0 Credentials:**

⚠️ **Important:** You need **OAuth 2.0** credentials (Client ID + Client Secret), NOT OAuth 1.0a credentials (Access Token + Access Token Secret).

**Steps:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app (or create a new one)
3. Navigate to **"User authentication settings"**
4. Click **"Set up"** or **"Edit"**
5. Enable **OAuth 2.0** (not OAuth 1.0a)
6. Configure:
   - **App permissions:** Read (or Read and write if needed)
   - **Type of App:** Web App, Automated App or Bot
   - **Callback URI / Redirect URL:** Use one of the options below ⬇️
   - **Website URL:** Use one of the options below ⬇️

**⚠️ IMPORTANT - Website URL Options:**

X/Twitter **does NOT accept `localhost` URLs**. You have 3 options:

### Option 1: Use ngrok (Recommended for Local Development)

1. Install ngrok: https://ngrok.com/download
2. Start your backend: `cd backend && npm run dev` (runs on port 3001)
3. In a new terminal, run:
   ```bash
   ngrok http 3001
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. In X Developer Portal, use:
   - **Callback URI:** `https://abc123.ngrok.io/api/v1/auth/x/callback`
   - **Website URL:** `https://abc123.ngrok.io`
6. Update your `.env`:
   ```env
   X_REDIRECT_URI=https://abc123.ngrok.io/api/v1/auth/x/callback
   FRONTEND_URL=https://abc123.ngrok.io
   ```

**Note:** ngrok URLs change each time you restart (unless you have a paid plan). Update the URLs in X Portal and `.env` when they change.

### Option 2: Use a Placeholder Domain

For testing, you can use a placeholder domain that X accepts:

- **Callback URI:** `http://127.0.0.1:3001/api/v1/auth/x/callback` (sometimes works)
- **Website URL:** `http://127.0.0.1:5173` (sometimes works)

OR use a test domain:
- **Callback URI:** `https://example.com/api/v1/auth/x/callback`
- **Website URL:** `https://example.com`

Then update your `.env` to match:
```env
X_REDIRECT_URI=https://example.com/api/v1/auth/x/callback
FRONTEND_URL=https://example.com
```

**Note:** You'll need to update your `/etc/hosts` file to point `example.com` to `127.0.0.1` for this to work locally.

### Option 3: Use Your Production Domain (If Available)

If you have a production domain:
- **Callback URI:** `https://yourdomain.com/api/v1/auth/x/callback`
- **Website URL:** `https://yourdomain.com`

7. Click **"Save"**
8. You'll see:
   - **Client ID** (copy this → `X_CLIENT_ID`)
   - **Client Secret** (copy this → `X_CLIENT_SECRET` - click "Regenerate" if needed)

**Note:** If you only see "Consumer Key" and "Consumer Secret", you're looking at OAuth 1.0a. Make sure OAuth 2.0 is enabled in your app settings.

---

## Step 4: Backend - Create OAuth Service

Create `backend/src/features/auth/oauth.services.ts`:

```typescript
import { AuthorizationServer, Client } from 'oauth4webapi';
import { prisma } from '../../lib/database.js';
import { hashPassword } from './auth.services.js';
import type { FastifyJWT } from '@fastify/jwt';
import crypto from 'node:crypto';

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_USER_INFO_URL = 'https://api.twitter.com/2/users/me';

interface XUserInfo {
  id: string;
  username: string;
  name: string;
}

/**
 * Generate OAuth authorization URL for X
 */
export function getXAuthUrl(): { url: string; state: string; codeVerifier: string } {
  const state = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: process.env.X_REDIRECT_URI!,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const url = `${X_AUTH_URL}?${params.toString()}`;

  // Store state and codeVerifier in memory (or Redis for production)
  // For now, we'll return them and handle in callback
  return { url, state, codeVerifier };
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<string> {
  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.X_REDIRECT_URI!,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get user info from X API
 */
async function getXUserInfo(accessToken: string): Promise<XUserInfo> {
  const response = await fetch(
    `${X_USER_INFO_URL}?user.fields=id,username,name`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

/**
 * Handle X OAuth callback - create or update user and generate JWT
 */
export async function handleXCallback(
  code: string,
  state: string,
  codeVerifier: string,
  jwt: FastifyJWT['jwt']
): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
  // Exchange code for token
  const accessToken = await exchangeCodeForToken(code, codeVerifier);

  // Get user info from X
  const xUserInfo = await getXUserInfo(accessToken);

  // Find or create user
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'x',
        providerAccountId: xUserInfo.id,
      },
    },
    include: { user: true },
  });

  let user;
  if (existingAccount) {
    // Update existing OAuth account
    await prisma.oAuthAccount.update({
      where: { id: existingAccount.id },
      data: {
        username: xUserInfo.username,
        accessToken,
        updatedAt: new Date(),
      },
    });

    // Update user last login
    user = await prisma.user.update({
      where: { id: existingAccount.userId },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new user and OAuth account
    const username = await generateUniqueUsername(xUserInfo.username);
    const email = `${xUserInfo.id}@x.oauth`; // Placeholder email for OAuth users

    user = await prisma.user.create({
      data: {
        username,
        email,
        name: xUserInfo.name,
        passwordHash: null, // OAuth users don't have passwords
        creditBalance: 1000,
        availableCredits: 1000,
        consecutiveDaysOnline: 1,
        lastLoginAt: new Date(),
        referralCode: crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
        oauthAccounts: {
          create: {
            provider: 'x',
            providerAccountId: xUserInfo.id,
            username: xUserInfo.username,
            accessToken,
          },
        },
        creditTransactions: {
          create: {
            amount: 1000,
            transactionType: 'signup_bonus',
            balanceAfter: 1000,
          },
        },
      },
    });
  }

  // Generate JWT tokens
  const jwtAccessToken = jwt.sign(
    { userId: user.id, email: user.email },
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  const jwtRefreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  // Store refresh token
  const refreshTokenHash = await hashPassword(jwtRefreshToken);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      creditBalance: Number(user.creditBalance),
      // ... other profile fields
    },
    tokens: {
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken,
    },
  };
}

async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
  let counter = 0;

  while (true) {
    const candidate = counter === 0 ? username : `${username}${counter}`;
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
    });

    if (!exists) {
      return candidate;
    }

    counter++;
    if (counter > 1000) {
      // Fallback to UUID-based username
      return `x_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    }
  }
}
```

---

## Step 5: Backend - Add OAuth Routes

Update `backend/src/features/auth/auth.routes.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { 
  signupHandler, 
  loginHandler, 
  getMeHandler, 
  refreshHandler, 
  logoutHandler,
  xAuthHandler,
  xCallbackHandler,
} from './auth.controllers.js';
import { authenticate } from './auth.middleware.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Public routes
  fastify.post('/signup', signupHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/refresh', refreshHandler);
  fastify.post('/logout', logoutHandler);
  
  // OAuth routes
  fastify.get('/x', xAuthHandler);
  fastify.get('/x/callback', xCallbackHandler);

  // Protected routes (require authentication)
  fastify.get('/me', { preHandler: authenticate }, getMeHandler);
}
```

---

## Step 6: Backend - Add OAuth Controllers

Add to `backend/src/features/auth/auth.controllers.ts`:

```typescript
import { getXAuthUrl, handleXCallback } from './oauth.services.js';

/**
 * Initiate X OAuth flow
 */
export async function xAuthHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { url, state, codeVerifier } = getXAuthUrl();
    
    // Store state and codeVerifier in session/cookie (or Redis for production)
    // For now, we'll use query params (less secure, but simpler)
    // In production, use secure httpOnly cookies or Redis
    
    reply.redirect(`${url}&state=${state}&code_verifier=${codeVerifier}`);
  } catch (error: any) {
    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: 'Failed to initiate OAuth',
    });
  }
}

/**
 * Handle X OAuth callback
 */
export async function xCallbackHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { code, state, code_verifier } = request.query as {
      code?: string;
      state?: string;
      code_verifier?: string;
    };

    if (!code || !code_verifier) {
      return reply.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
    }

    // Handle OAuth callback
    const result = await handleXCallback(
      code,
      state || '',
      code_verifier,
      request.server.jwt
    );

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      userId: result.user.id,
    });

    reply.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`);
  } catch (error: any) {
    request.log.error(error);
    reply.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
  }
}
```

---

## Step 7: Frontend - Install better-auth

```bash
cd frontend
npm install better-auth
```

---

## Step 8: Frontend - Configure better-auth

Create `frontend/src/lib/auth.ts`:

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  // We'll use custom OAuth flow, so minimal config here
});

// Export auth hooks
export const { useSession, signIn, signOut } = authClient;
```

---

## Step 9: Frontend - Update PreLogin Component

Update `frontend/src/app/pages/PreLogin.tsx`:

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppTitle from '@shared/components/AppTitle';
import Logo from '@shared/components/Logo';

const PreLogin: React.FC = () => {
  const navigate = useNavigate();

  const handleSignInWithX = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/auth/x`;
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{ 
        background: 'radial-gradient(ellipse at left, rgba(30, 30, 45, 0.5) 0%, transparent 50%), radial-gradient(ellipse at right, rgba(30, 30, 45, 0.5) 0%, transparent 50%), #0a0a0a'
      }}
    >
      {/* Welcome To header */}
      <div className="absolute top-8 left-0 right-0 flex justify-between items-center px-6 z-10">
        <span className="text-white/70 text-lg font-light">Welcome</span>
        <span className="text-white/70 text-lg font-light">To</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20">
        {/* This or That */}
        <AppTitle className="mb-12" showTagline={false} />

        {/* Logo */}
        <Logo className="mt-8" />
      </div>

      {/* Sign in button at bottom */}
      <div className="relative z-10 w-full px-6 pb-12 pt-8">
        <button
          onClick={handleSignInWithX}
          className="btn-premium w-full max-w-md mx-auto py-5 px-10 text-sm font-light text-white rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] block tracking-wider"
        >
          <span className="relative z-10">Sign in with X Account</span>
          <div className="btn-premium-glow" />
        </button>
      </div>
    </div>
  );
};

export default PreLogin;
```

---

## Step 10: Frontend - Handle OAuth Callback

Create `frontend/src/app/pages/AuthCallback.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/?error=oauth_failed');
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Redirect to app
      navigate('/app');
    } else {
      navigate('/?error=missing_tokens');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Completing sign in...</p>
    </div>
  );
};

export default AuthCallback;
```

---

## Step 11: Update App Routes

Update `frontend/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '@shared/components/layout/AppLayout';
import PreLogin from '@app/pages/PreLogin';
import AuthCallback from '@app/pages/AuthCallback';
import HomePage from '@app/pages/HomePage';
import BettingPage from '@app/pages/BettingPage';
import LeaderboardPage from '@app/pages/LeaderboardPage';
import ProfilePage from '@app/pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PreLogin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="play" element={<BettingPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Step 12: Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_oauth_support
npx prisma generate
```

---

## Testing

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Flow:**
   - Go to http://localhost:5173
   - Click "Sign in with X Account"
   - Complete X OAuth flow
   - Should redirect back and log you in

---

## Security Considerations

1. **State & Code Verifier Storage:**
   - Currently using query params (not secure)
   - **Production:** Use Redis or secure httpOnly cookies

2. **Token Storage:**
   - Currently using localStorage
   - **Production:** Consider httpOnly cookies for better security

3. **HTTPS Required:**
   - OAuth requires HTTPS in production
   - Use ngrok or similar for local testing

---

## Production Checklist

- [ ] Set up X OAuth app with production callback URL
- [ ] Use Redis for state/codeVerifier storage
- [ ] Use HTTPS for all OAuth endpoints
- [ ] Implement proper error handling
- [ ] Add rate limiting to OAuth endpoints
- [ ] Set up monitoring/logging
- [ ] Test token refresh flow
- [ ] Test user already exists scenario

---

## Deployment Configuration

### ⚠️ Important: Callback URI Changes for Production

**No, the callback URI will NOT stay the same.** You need different callback URIs for:
- **Local Development:** `https://your-ngrok-url.ngrok.io/api/v1/auth/x/callback`
- **Production:** `https://yourdomain.com/api/v1/auth/x/callback`

### Step 1: Add Production Callback URI to X Developer Portal

X/Twitter allows **multiple callback URIs**. You can add both:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Navigate to **"User authentication settings"**
4. Click **"Edit"**
5. In **"Callback URI / Redirect URL"**, add BOTH:
   - `https://your-ngrok-url.ngrok.io/api/v1/auth/x/callback` (for local dev)
   - `https://yourdomain.com/api/v1/auth/x/callback` (for production)
6. Update **"Website URL"** to your production domain: `https://yourdomain.com`
7. Click **"Save"**

**Note:** X may allow multiple callback URIs separated by commas, or you may need to add them one at a time. Check X's documentation for the exact format.

### Step 2: Environment Variables by Environment

#### Local Development (`backend/.env.local` or `.env`):
```env
# X OAuth Configuration
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/v1/auth/x/callback
FRONTEND_URL=https://your-ngrok-url.ngrok.io
NODE_ENV=development
```

#### Production (`backend/.env.production` or server environment variables):
```env
# X OAuth Configuration
X_CLIENT_ID=your_x_client_id  # Same Client ID
X_CLIENT_SECRET=your_x_client_secret  # Same Client Secret
X_REDIRECT_URI=https://yourdomain.com/api/v1/auth/x/callback  # Production URL
FRONTEND_URL=https://yourdomain.com  # Production frontend URL
NODE_ENV=production
```

### Step 3: Update Frontend Environment Variables

#### Local Development (`frontend/.env.local`):
```env
VITE_API_URL=https://your-ngrok-url.ngrok.io
```

#### Production (`frontend/.env.production`):
```env
VITE_API_URL=https://yourdomain.com
```

### Step 4: Deployment Best Practices

1. **Never commit `.env` files** - Use environment variables in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Railway: Variables tab
   - Heroku: Config Vars
   - AWS: Parameter Store / Secrets Manager

2. **Use the same Client ID/Secret** for both environments (X allows multiple callback URIs)

3. **Always use HTTPS** in production (OAuth requires HTTPS)

4. **Test the production callback** before going live:
   ```bash
   # Test that your production backend is accessible
   curl https://yourdomain.com/health
   
   # Test OAuth flow
   # Visit: https://yourdomain.com/api/v1/auth/x
   ```

### Step 5: Common Deployment Platforms

#### Vercel / Netlify (Frontend):
```bash
# Set environment variables in dashboard:
VITE_API_URL=https://yourdomain.com
```

#### Railway / Render / Fly.io (Backend):
```bash
# Set environment variables:
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=https://yourdomain.com/api/v1/auth/x/callback
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
DATABASE_URL=your_production_database_url
# ... other env vars
```

### Step 6: Verify Production Setup

1. ✅ Production backend is running and accessible
2. ✅ Production frontend is running and accessible
3. ✅ X Developer Portal has production callback URI configured
4. ✅ Environment variables are set correctly on hosting platform
5. ✅ HTTPS is enabled (required for OAuth)
6. ✅ Test OAuth flow: Visit `https://yourdomain.com` → Click "Sign in with X"

### Troubleshooting Production Issues

**Error: "redirect_uri_mismatch"**
- ✅ Check that callback URI in X Portal matches `X_REDIRECT_URI` in your `.env`
- ✅ Ensure no trailing slashes or extra characters
- ✅ Verify HTTPS is used (not HTTP)

**Error: "invalid_client"**
- ✅ Verify `X_CLIENT_ID` and `X_CLIENT_SECRET` are correct
- ✅ Check that OAuth 2.0 is enabled (not OAuth 1.0a)

**OAuth works locally but not in production**
- ✅ Check that production callback URI is added to X Portal
- ✅ Verify environment variables are set on hosting platform
- ✅ Ensure HTTPS is enabled (OAuth requires HTTPS)

---

**Last Updated:** 2025-01-XX

