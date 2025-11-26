/**
 * Betting Service
 */

import { apiGet, apiPost } from './api';

export interface PlaceBetRequest {
  marketId: string;
  side: 'this' | 'that';
  amount: number;
}

export interface PlaceBetResponse {
  success: boolean;
  bet: {
    id: string;
    marketId: string;
    userId: string;
    amount: number;
    side: 'this' | 'that';
    oddsAtBet: number;
    potentialPayout: number;
    status: 'pending' | 'won' | 'lost' | 'cancelled';
    placedAt: string;
    market: {
      id: string;
      title: string;
      thisOption: string;
      thatOption: string;
      status: string;
    };
  };
  newBalance: number;
  potentialPayout: number;
}

/**
 * Place a bet
 */
export async function placeBet(request: PlaceBetRequest): Promise<PlaceBetResponse> {
  try {
    const response = await apiPost<PlaceBetResponse>('/api/v1/bets', request);
    
    if (response.success && response.bet) {
      return {
        success: true,
        bet: response.bet,
        newBalance: response.newBalance,
        potentialPayout: response.potentialPayout,
      };
    }
    
    throw new Error(response.error || 'Failed to place bet');
  } catch (error: any) {
    console.error('placeBet error:', error);
    throw error;
  }
}

export interface UserBet {
  id: string;
  marketId: string;
  userId: string;
  amount: number;
  side: 'this' | 'that';
  oddsAtBet: number;
  potentialPayout: number;
  actualPayout?: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  placedAt: string;
  resolvedAt?: string;
  market?: {
    id: string;
    title: string;
    thisOption: string;
    thatOption: string;
    status: string;
    resolution?: string;
    resolvedAt?: string;
  };
}

export interface UserBetsResponse {
  success: boolean;
  bets: UserBet[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get user's bets
 */
export async function getUserBets(options?: {
  status?: 'pending' | 'won' | 'lost' | 'cancelled';
  limit?: number;
  offset?: number;
}): Promise<UserBetsResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/v1/bets/me${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiGet<UserBetsResponse>(endpoint);
    
    if (response.success && response.bets) {
      return {
        success: true,
        bets: response.bets,
        total: response.total || response.bets.length,
        limit: response.limit || options?.limit || 50,
        offset: response.offset || options?.offset || 0,
      };
    }
    
    // Fallback if response format is different
    if (response.success && Array.isArray(response)) {
      return {
        success: true,
        bets: response as any,
        total: response.length,
        limit: options?.limit || 50,
        offset: options?.offset || 0,
      };
    }
    
    throw new Error(response.error || 'Failed to get bets');
  } catch (error: any) {
    console.error('getUserBets error:', error);
    throw error;
  }
}

export interface SellPositionRequest {
  amount?: number; // Optional: partial sell amount
}

export interface SellPositionResponse {
  success: boolean;
  bet: UserBet;
  creditsReturned: number;
  newBalance: number;
  currentValue: number;
}

/**
 * Sell a position early (before market expires)
 */
export async function sellPosition(
  betId: string,
  request?: SellPositionRequest
): Promise<SellPositionResponse> {
  try {
    const response = await apiPost<SellPositionResponse>(
      `/api/v1/bets/${betId}/sell`,
      request || {}
    );
    
    if (response.success) {
      return response;
    }
    
    throw new Error(response.error || 'Failed to sell position');
  } catch (error: any) {
    console.error('sellPosition error:', error);
    throw error;
  }
}

