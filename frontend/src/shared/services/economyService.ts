/**
 * Economy Service - Handles daily credits, stock trading, and portfolio operations
 */

import { apiPost, apiGet } from './api';

export interface DailyCreditsResponse {
  success: boolean;
  creditsAwarded: number;
  consecutiveDays: number;
  nextAvailableAt: string;
  error?: string;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  circulatingSupply: number;
  maxLeverage: number;
  status: string;
}

export interface PortfolioItem {
  id: string;
  stock: Stock;
  shares: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

/**
 * Claim daily credits
 */
export async function claimDailyCredits(): Promise<DailyCreditsResponse> {
  // Send empty object as body - Fastify requires a body for POST requests
  const response = await apiPost<DailyCreditsResponse>('/api/v1/economy/daily-credits', {});
  return response;
}

/**
 * Get all stocks
 */
export async function getStocks(): Promise<{ success: boolean; stocks: Stock[] }> {
  const response = await apiGet<{ success: boolean; stocks: Stock[] }>('/api/v1/economy/stocks');
  return response;
}

/**
 * Get user portfolio
 */
export async function getPortfolio(): Promise<{ success: boolean; portfolio: PortfolioItem[] }> {
  const response = await apiGet<{ success: boolean; portfolio: PortfolioItem[] }>('/api/v1/economy/portfolio');
  return response;
}

/**
 * Buy stock
 */
export async function buyStock(data: {
  stockId: string;
  shares: number;
  leverage: number;
}): Promise<{
  success: boolean;
  transaction: any;
  holding: any;
  newBalance: number;
}> {
  const response = await apiPost('/api/v1/economy/buy', data);
  return response;
}

/**
 * Sell stock
 */
export async function sellStock(data: {
  stockId: string;
  shares: number;
}): Promise<{
  success: boolean;
  transaction: any;
  holding: any;
  newBalance: number;
  profit: number;
}> {
  const response = await apiPost('/api/v1/economy/sell', data);
  return response;
}

