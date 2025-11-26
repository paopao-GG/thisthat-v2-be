/**
 * Leaderboard Service - API calls for leaderboard data
 */

import { apiGet } from './api';

export interface LeaderboardUser {
  id: string;
  username: string;
}

export interface BackendLeaderboardEntry {
  rank: number;
  user: LeaderboardUser;
  overallPnL: number;
  totalVolume: number;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: BackendLeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get PnL leaderboard
 */
export async function getPnLLeaderboard(limit: number = 100, offset: number = 0): Promise<LeaderboardResponse> {
  const response = await apiGet<LeaderboardResponse>(`/api/v1/leaderboard/pnl?limit=${limit}&offset=${offset}`);
  return response;
}

/**
 * Get Volume leaderboard
 */
export async function getVolumeLeaderboard(limit: number = 100, offset: number = 0): Promise<LeaderboardResponse> {
  const response = await apiGet<LeaderboardResponse>(`/api/v1/leaderboard/volume?limit=${limit}&offset=${offset}`);
  return response;
}

/**
 * Get current user's ranking
 */
export interface UserRankingResponse {
  success: boolean;
  ranking: {
    rank: number | null;
    totalUsers: number;
    overallPnL: number;
    totalVolume: number;
  };
}

export async function getUserRanking(type: 'pnl' | 'volume' = 'pnl'): Promise<UserRankingResponse> {
  const response = await apiGet<UserRankingResponse>(`/api/v1/leaderboard/me?type=${type}`);
  return response;
}

