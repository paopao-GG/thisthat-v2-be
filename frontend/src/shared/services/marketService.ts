/**
 * Market Service
 */

import { apiGet } from './api';
import type { Market } from '@shared/types';

export interface BackendMarket {
  // PostgreSQL format fields
  id?: string;
  polymarketId?: string;
  title?: string;
  description?: string;
  thisOption?: string;
  thatOption?: string;
  thisOdds?: number;
  thatOdds?: number;
  expiryDate?: string;
  expiresAt?: string;
  category?: string;
  liquidity?: number;
  status?: string;
  marketType?: 'binary' | 'two-image';
  
  // MongoDB format fields (FlattenedMarket)
  conditionId?: string;
  question?: string;
  endDate?: string;
  author?: string;
  source?: string;
}

/**
 * Convert backend market format to frontend Market format
 * Handles both PostgreSQL and MongoDB formats
 */
function convertBackendMarket(backendMarket: BackendMarket): Market {
  // MongoDB format uses 'question' instead of 'title', 'conditionId' instead of 'id'
  const isMongoDBFormat = !backendMarket.title && backendMarket.question;
  
  const id = isMongoDBFormat 
    ? (backendMarket.conditionId || backendMarket.id || '')
    : (backendMarket.id || backendMarket.conditionId || backendMarket.polymarketId || '');
  
  const title = isMongoDBFormat 
    ? (backendMarket.question || '')
    : (backendMarket.title || '');
  
  const description = backendMarket.description || '';
  
  const thisOption = backendMarket.thisOption || 'YES';
  const thatOption = backendMarket.thatOption || 'NO';
  
  // MongoDB markets don't have prices (lazy loading pattern) - use default odds
  // TODO: Fetch live prices from Polymarket API using conditionId for accurate odds
  // PostgreSQL markets may have prices from database
  const thisOdds = typeof backendMarket.thisOdds === 'number' && backendMarket.thisOdds > 0
    ? backendMarket.thisOdds
    : 1.5; // Default to 1.5x multiplier (0.67 probability) if no odds available
  
  const thatOdds = typeof backendMarket.thatOdds === 'number' && backendMarket.thatOdds > 0
    ? backendMarket.thatOdds
    : 1.5; // Default to 1.5x multiplier (0.67 probability) if no odds available
  
  // Handle expiry date - MongoDB uses 'endDate', PostgreSQL uses 'expiresAt' or 'expiryDate'
  const expiryDateStr = isMongoDBFormat
    ? backendMarket.endDate
    : (backendMarket.expiresAt || backendMarket.expiryDate);
  
  const expiryDate = expiryDateStr
    ? new Date(expiryDateStr)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days from now
  
  const category = backendMarket.category || 'Other';
  const liquidity = backendMarket.liquidity || 0;
  const marketType = backendMarket.marketType || 'binary';
  
  return {
    id,
    title,
    description,
    thisOption,
    thatOption,
    thisOdds,
    thatOdds,
    expiryDate,
    category,
    liquidity,
    marketType,
  };
}

/**
 * Get markets from backend
 */
export async function getMarkets(options?: {
  status?: 'active' | 'closed' | 'archived' | 'open';
  category?: string;
  limit?: number;
  skip?: number;
}): Promise<Market[]> {
  try {
    // MongoDB uses 'active' status, PostgreSQL uses 'open'
    // Try MongoDB first since user wants MongoDB data
    const mongoParams = new URLSearchParams();
    const mongoStatus = options?.status === 'open' ? 'active' : (options?.status || 'active');
    mongoParams.append('status', mongoStatus);
    if (options?.category) mongoParams.append('category', options.category);
    if (options?.limit) mongoParams.append('limit', options.limit.toString());
    if (options?.skip) mongoParams.append('skip', options.skip.toString());
    
    const mongoQueryString = mongoParams.toString();
    const mongoEndpoint = `/api/v1/markets/legacy${mongoQueryString ? `?${mongoQueryString}` : ''}`;
    
    console.log(`Fetching markets from MongoDB: ${mongoEndpoint}`);
    let response = await apiGet<{ success: boolean; data: BackendMarket[]; count?: number }>(mongoEndpoint);
    
    console.log('MongoDB endpoint response:', { 
      success: response.success, 
      count: response.data?.length || 0,
      data: response.data ? response.data.slice(0, 2) : null // Log first 2 for debugging
    });
    
    // If MongoDB has data, use it
    if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
      const markets = response.data.map(convertBackendMarket);
      console.log(`✅ Converted ${markets.length} markets from MongoDB`);
      return markets;
    }
    
    // Fallback to PostgreSQL endpoint if MongoDB is empty
    if (!response.success || !response.data || response.data.length === 0) {
      console.log('MongoDB returned empty, trying PostgreSQL endpoint...');
      const pgParams = new URLSearchParams();
      const pgStatus = options?.status === 'active' ? 'open' : (options?.status || 'open');
      pgParams.append('status', pgStatus);
      if (options?.category) pgParams.append('category', options.category);
      if (options?.limit) pgParams.append('limit', options.limit.toString());
      if (options?.skip) pgParams.append('skip', options.skip.toString());
      
      const pgQueryString = pgParams.toString();
      const pgEndpoint = `/api/v1/markets${pgQueryString ? `?${pgQueryString}` : ''}`;
      
      response = await apiGet<{ success: boolean; data: BackendMarket[]; count?: number }>(pgEndpoint);
      console.log('PostgreSQL endpoint response:', { success: response.success, count: response.data?.length || 0 });
      
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        const markets = response.data.map(convertBackendMarket);
        console.log(`✅ Converted ${markets.length} markets from PostgreSQL`);
        return markets;
      }
    }
    
    // Fallback: check if response has markets array directly
    if (Array.isArray(response)) {
      return response.map(convertBackendMarket);
    }
    
    console.warn('No markets found in response:', response);
    return [];
  } catch (error: any) {
    console.error('getMarkets error:', error);
    // Return empty array on error to prevent UI breakage
    return [];
  }
}

/**
 * Fetch markets from Polymarket and save to backend
 */
export async function fetchMarketsFromPolymarket(options?: {
  active?: boolean;
  limit?: number;
}): Promise<void> {
  try {
    const params = new URLSearchParams();
    if (options?.active !== undefined) params.append('active', options.active.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/v1/markets/legacy/fetch${queryString ? `?${queryString}` : ''}`;
    
    await apiGet(endpoint);
  } catch (error: any) {
    console.error('fetchMarketsFromPolymarket error:', error);
    throw error;
  }
}

