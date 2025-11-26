/**
 * Authentication Service
 */

import { apiGet, apiPost, clearTokens, setTokens } from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  creditBalance: number;
  availableCredits?: number;
  expendedCredits?: number;
  consecutiveDaysOnline?: number;
  totalVolume?: number;
  overallPnL?: number;
  rankByPnL?: number;
  rankByVolume?: number;
  referralCode?: string;
  referralCount?: number;
  referralCreditsEarned?: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await apiGet<User>('/api/v1/auth/me');
    console.log('getCurrentUser response:', response);
    
    // Backend returns { success: true, user: {...} } directly
    if (response.success && response.user) {
      return response.user;
    }
    // Fallback: check data property (for consistency with other endpoints)
    if (response.success && response.data) {
      return response.data as User;
    }
    
    console.error('Invalid response format:', response);
    throw new Error(response.error || 'Failed to get user profile - invalid response format');
  } catch (error: any) {
    console.error('getCurrentUser error:', error);
    throw error;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiPost('/api/v1/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTokens();
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    const response = await apiPost<{ accessToken: string }>('/api/v1/auth/refresh', {
      refreshToken,
    });

    if (response.success && response.data?.accessToken) {
      const currentRefreshToken = localStorage.getItem('refreshToken');
      if (currentRefreshToken) {
        setTokens(response.data.accessToken, currentRefreshToken);
      }
      return response.data.accessToken;
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

