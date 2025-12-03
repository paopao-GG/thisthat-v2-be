import { usersPrisma as prisma } from '../../lib/database.js';
import { hashPassword } from './auth.services.js';
import crypto from 'node:crypto';

// JWT sign/verify interface compatible with @fastify/jwt
interface JwtInstance {
  sign: (payload: object, options?: { expiresIn?: string | number }) => string;
  verify: <T = unknown>(token: string) => T;
}

// Response types from X OAuth API
interface XTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface XUserResponse {
  data: {
    id: string;
    username: string;
    name: string;
  };
}

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_USER_INFO_URL = 'https://api.twitter.com/2/users/me';

interface XUserInfo {
  id: string;
  username: string;
  name: string;
}

export interface OAuthState {
  state: string;
  codeVerifier: string;
  expiresAt: Date;
}

// In-memory storage for OAuth state (use Redis in production)
const oauthStateStore = new Map<string, OAuthState>();

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

  // Store state and codeVerifier (expires in 10 minutes)
  oauthStateStore.set(state, {
    state,
    codeVerifier,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Clean up expired states
  cleanupExpiredStates();

  // Encode codeVerifier in state for fallback (not ideal but works for single-server setup)
  // Format: base64(state:codeVerifier) - we'll decode it in callback if needed
  const stateWithVerifier = Buffer.from(`${state}:${codeVerifier}`).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: process.env.X_REDIRECT_URI!,
    scope: 'tweet.read users.read offline.access',
    state: stateWithVerifier, // Pass encoded state with verifier
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const url = `${X_AUTH_URL}?${params.toString()}`;

  return { url, state, codeVerifier };
}

/**
 * Get stored code verifier for a state
 */
export function getCodeVerifier(state: string): string | null {
  const stored = oauthStateStore.get(state);
  if (!stored) {
    return null;
  }

  // Check if expired
  if (stored.expiresAt < new Date()) {
    oauthStateStore.delete(state);
    return null;
  }

  return stored.codeVerifier;
}

/**
 * Clean up expired OAuth states
 */
function cleanupExpiredStates() {
  const now = new Date();
  for (const [state, data] of oauthStateStore.entries()) {
    if (data.expiresAt < now) {
      oauthStateStore.delete(state);
    }
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken?: string }> {
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

  const data = await response.json() as XTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
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

  const data = await response.json() as XUserResponse;
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

/**
 * Generate unique username from X username
 */
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  // Clean username: lowercase, alphanumeric + underscore only
  let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (username.length === 0) {
    username = 'user';
  }
  if (username.length > 45) {
    username = username.slice(0, 45);
  }

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

/**
 * Handle X OAuth callback - create or update user and generate JWT
 */
export async function handleXCallback(
  code: string,
  state: string,
  codeVerifierParam: string,
  jwt: JwtInstance
): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
  // Decode state (it contains state:codeVerifier encoded)
  let actualState = state;
  let codeVerifier: string | null = null;
  
  try {
    // Try to decode the state (it might be encoded with codeVerifier)
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    if (decoded.includes(':')) {
      const [decodedState, decodedVerifier] = decoded.split(':');
      actualState = decodedState;
      codeVerifier = decodedVerifier;
      console.log('[OAuth] Decoded state and codeVerifier from state parameter');
    }
  } catch (err) {
    // If decoding fails, use state as-is
    console.log('[OAuth] Could not decode state, using as-is');
    actualState = state;
  }
  
  // Try to get code verifier from stored state
  if (!codeVerifier) {
    codeVerifier = getCodeVerifier(actualState);
    if (codeVerifier) {
      console.log('[OAuth] Retrieved codeVerifier from state store');
    }
  }
  
  // Fallback to query param if provided
  if (!codeVerifier && codeVerifierParam) {
    codeVerifier = codeVerifierParam;
    console.log('[OAuth] Using codeVerifier from query parameter');
  }
  
  if (!codeVerifier) {
    console.error('[OAuth] Code verifier not found. State:', state.substring(0, 20) + '...');
    throw new Error('Invalid or expired OAuth state - code verifier not found. State may have expired or server restarted.');
  }

  // Exchange code for token
  console.log('[OAuth] Exchanging code for token...');
  let accessToken: string;
  let xRefreshToken: string | null;
  try {
    const tokenResult = await exchangeCodeForToken(code, codeVerifier);
    accessToken = tokenResult.accessToken;
    xRefreshToken = tokenResult.refreshToken ?? null;
    console.log('[OAuth] Token exchange successful');
  } catch (error: any) {
    console.error('[OAuth] Token exchange failed:', error.message, error.stack);
    throw new Error(`Token exchange failed: ${error.message}`);
  }

  // Get user info from X
  console.log('[OAuth] Fetching user info from X API...');
  let xUserInfo: any;
  try {
    xUserInfo = await getXUserInfo(accessToken);
    console.log('[OAuth] User info received:', { id: xUserInfo.id, username: xUserInfo.username });
  } catch (error: any) {
    console.error('[OAuth] Failed to get user info:', error.message, error.stack);
    throw new Error(`Failed to get user info: ${error.message}`);
  }

  // Find or create user
  console.log('[OAuth] Looking up OAuth account in database...');
  let existingAccount;
  try {
    existingAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'x',
          providerAccountId: xUserInfo.id,
        },
      },
      include: { user: true },
    });
  } catch (error: any) {
    console.error('[OAuth] Database query failed:', error.message, error.code);
    if (error.code === 'P2002') {
      throw new Error('Database constraint violation. User might already exist.');
    } else if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
      throw new Error('Database migration not run. Please run: npx prisma migrate dev');
    }
    throw new Error(`Database error: ${error.message}`);
  }
  
  if (existingAccount) {
    console.log('[OAuth] Existing account found, updating...');
  } else {
    console.log('[OAuth] New user, creating account...');
  }

  let user;
  try {
    if (existingAccount) {
      // Update existing OAuth account
      await prisma.oAuthAccount.update({
      where: { id: existingAccount.id },
      data: {
        username: xUserInfo.username,
        accessToken,
        refreshToken: xRefreshToken || undefined,
        updatedAt: new Date(),
      },
    });

    // Update user last login and check consecutive days
    const now = new Date();
    const lastLoginAt = existingAccount.user.lastLoginAt;
    
    let consecutiveDays = existingAccount.user.consecutiveDaysOnline;
    if (lastLoginAt) {
      const daysSinceLastLogin = Math.floor(
        (now.getTime() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastLogin === 0) {
        consecutiveDays = existingAccount.user.consecutiveDaysOnline;
      } else if (daysSinceLastLogin === 1) {
        consecutiveDays = existingAccount.user.consecutiveDaysOnline + 1;
      } else {
        consecutiveDays = 1;
      }
    } else {
      consecutiveDays = 1;
    }

    user = await prisma.user.update({
      where: { id: existingAccount.userId },
      data: {
        name: xUserInfo.name,
        lastLoginAt: now,
        consecutiveDaysOnline: consecutiveDays,
        updatedAt: now,
      },
    });

    // Clean up state
    oauthStateStore.delete(actualState);
  } else {
    // Create new user and OAuth account
    const username = await generateUniqueUsername(xUserInfo.username);
    const email = `${xUserInfo.id}@x.oauth`; // Placeholder email for OAuth users
    const referralCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

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
        referralCode,
        oauthAccounts: {
          create: {
            provider: 'x',
            providerAccountId: xUserInfo.id,
            username: xUserInfo.username,
            accessToken,
            refreshToken: xRefreshToken || undefined,
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

      // Clean up state
      oauthStateStore.delete(actualState);
    }
  } catch (error: any) {
    console.error('[OAuth] Database operation failed:', error.message, error.code);
    if (error.code === 'P2002') {
      throw new Error('Database constraint violation. User might already exist.');
    } else if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
      throw new Error('Database migration not run. Please run: npx prisma migrate dev');
    }
    throw new Error(`Database error: ${error.message}`);
  }

  // Generate JWT tokens
  console.log('[OAuth] Generating JWT tokens...');
  const jwtAccessToken = jwt.sign(
    { userId: user.id, email: user.email },
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  const jwtRefreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  // Store refresh token
  console.log('[OAuth] Storing refresh token...');
  const refreshTokenHash = await hashPassword(jwtRefreshToken);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  
  console.log('[OAuth] OAuth callback completed successfully for user:', user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      creditBalance: Number(user.creditBalance),
      availableCredits: Number(user.availableCredits),
      expendedCredits: Number(user.expendedCredits),
      consecutiveDaysOnline: user.consecutiveDaysOnline,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralCreditsEarned: Number(user.referralCreditsEarned),
      totalVolume: Number(user.totalVolume),
      overallPnL: Number(user.overallPnL),
      lastDailyRewardAt: user.lastDailyRewardAt,
      rankByPnL: user.rankByPnL,
      rankByVolume: user.rankByVolume,
    },
    tokens: {
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken,
    },
  };
}

