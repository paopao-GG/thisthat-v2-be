/**
 * Market Service
 */

import { apiGet, apiPost } from './api';
import type { Market } from '../types';

export interface MarketStaticData {
  id: string;
  polymarketId: string | null;
  title: string;
  description: string | null;
  thisOption: string;
  thatOption: string;
  author?: string | null; // Not in schema, optional
  category: string | null;
  imageUrl?: string | null; // Not in schema, optional
  status: string;
  expiresAt: string | null;
}

export interface MarketLiveData {
  polymarketId: string;
  thisOdds: number;
  thatOdds: number;
  liquidity: number;
  volume: number;
  volume24hr: number;
  acceptingOrders: boolean;
}

export interface MarketWithLiveData extends MarketStaticData {
  live: MarketLiveData | null;
}

export interface GetMarketsOptions {
  status?: 'open' | 'closed' | 'resolved';
  category?: string;
  limit?: number;
  skip?: number;
}

/**
 * Get markets with optional filtering
 * Returns Market[] format compatible with BettingPage
 */
export async function getMarkets(options?: GetMarketsOptions): Promise<Market[]> {
  try {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.skip) params.append('skip', options.skip.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/v1/markets${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiGet<{ success: boolean; data: any[]; count?: number }>(endpoint);
    
    if (response.success && response.data) {
      // Transform MarketStaticData to Market format
      return response.data.map((market: any): Market => ({
        id: market.id,
        title: market.title || '',
        description: market.description || '',
        thisOption: market.thisOption || 'YES',
        thatOption: market.thatOption || 'NO',
        thisOdds: market.thisOdds || 0.5,
        thatOdds: market.thatOdds || 0.5,
        expiryDate: market.expiresAt ? new Date(market.expiresAt) : new Date(),
        category: market.category || 'Other',
        liquidity: market.liquidity || 0,
        imageUrl: market.imageUrl || undefined,
        marketType: 'binary' as const,
      }));
    }
    
    return [];
  } catch (error: any) {
    console.error('getMarkets error:', error);
    return [];
  }
}

/**
 * Get market by ID (static data only)
 */
export async function getMarketById(marketId: string): Promise<MarketStaticData | null> {
  try {
    const response = await apiGet<{ success: boolean; data: MarketStaticData }>(
      `/api/v1/markets/${marketId}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  } catch (error: any) {
    console.error('getMarketById error:', error);
    return null;
  }
}

/**
 * Get live price data for a market
 */
export async function getMarketLivePrices(marketId: string): Promise<MarketLiveData | null> {
  try {
    const response = await apiGet<{ success: boolean; data: MarketLiveData; marketId: string }>(
      `/api/v1/markets/${marketId}/live`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  } catch (error: any) {
    console.error('getMarketLivePrices error:', error);
    return null;
  }
}

/**
 * Get market with both static data and live prices
 */
export async function getMarketFull(marketId: string): Promise<MarketWithLiveData | null> {
  try {
    const response = await apiGet<{ success: boolean; data: MarketWithLiveData }>(
      `/api/v1/markets/${marketId}/full`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  } catch (error: any) {
    console.error('getMarketFull error:', error);
    return null;
  }
}

/**
 * Trigger on-demand Polymarket ingestion (category optional)
 */
export async function ingestMarkets(options?: { category?: string; limit?: number }) {
  try {
    const response = await apiPost<{ success: boolean; data: any }>(
      '/api/v1/markets/ingest',
      options ?? {}
    );
    return response;
  } catch (error: any) {
    console.error('ingestMarkets error:', error);
    throw error;
  }
}
