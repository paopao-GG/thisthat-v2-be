// Shared type definitions across the application

export interface Market {
  id: string;
  title: string;
  description: string;
  thisOption: string;
  thatOption: string;
  thisOdds: number;
  thatOdds: number;
  expiryDate: Date;
  category: string;
  liquidity: number;
  imageUrl?: string;
  thisImageUrl?: string; // For 2-image markets
  thatImageUrl?: string; // For 2-image markets
  marketType?: 'binary' | 'two-image'; // Market type: binary (1-image) or two-image
}

export interface Bet {
  id: string;
  marketId: string;
  userId: string;
  option: 'THIS' | 'THAT';
  amount: number;
  odds: number;
  timestamp: Date;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  payout?: number;
}

export interface UserStats {
  userId: string;
  username: string;
  credits: number;
  totalVolume: number;
  totalPnL: number;
  rank: number;
  winRate: number;
  totalBets: number;
  dailyStreak: number;
  tokenAllocation: number;
  lockedTokens: number;
  lastClaimDate?: Date | null;
}

export interface CreditPurchaseOption {
  id: string;
  credits: number;
  price: number;
  priceDisplay: string;
  popular?: boolean;
}

export interface BetConfig {
  minBet: number;
  maxBet: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  volume: number;
  pnl: number;
  winRate: number;
  totalBets: number;
  tokenAllocation: number;
}


