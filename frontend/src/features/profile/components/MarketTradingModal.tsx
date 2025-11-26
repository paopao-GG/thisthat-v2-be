import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { getMarketFull, type MarketWithLiveData } from '@shared/services/marketService';
import { placeBet, sellPosition } from '@shared/services/betService';
import PriceChart from './PriceChart';
import '@/styles/profile/style.css';

interface Position {
  id: string;
  marketId: string;
  market: string;
  prediction: 'THIS' | 'THAT';
  shares: string;
  avgPrice: string;
  currentPrice: string;
  value: number;
  pnl: number;
  pnlPercent: number;
  betData?: any; // Full bet data
}

interface MarketTradingModalProps {
  isOpen: boolean;
  position: Position | null;
  onClose: () => void;
  onTradeSuccess?: () => void;
}

const MarketTradingModal: React.FC<MarketTradingModalProps> = ({
  isOpen,
  position,
  onClose,
  onTradeSuccess,
}) => {
  const { user } = useAuth();
  const [marketData, setMarketData] = useState<MarketWithLiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<string>('');
  const [tradeSide, setTradeSide] = useState<'this' | 'that'>(
    position?.prediction?.toUpperCase() === 'THIS' ? 'this' : 'that'
  );
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  const [priceUpdateInterval, setPriceUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch market data when modal opens
  useEffect(() => {
    if (isOpen && position?.marketId) {
      fetchMarketData();
      
      // Poll for live prices every 5 seconds
      const interval = setInterval(() => {
        fetchMarketData();
      }, 5000);
      setPriceUpdateInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else {
      setMarketData(null);
      setError(null);
    }
  }, [isOpen, position?.marketId]);

  // Update trade side when position changes
  useEffect(() => {
    if (position?.prediction) {
      setTradeSide(position.prediction.toUpperCase() === 'THIS' ? 'this' : 'that');
    }
  }, [position?.prediction]);

  const fetchMarketData = async () => {
    if (!position?.marketId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getMarketFull(position.marketId);
      if (data) {
        setMarketData(data);
      } else {
        setError('Failed to load market data');
      }
    } catch (err: any) {
      console.error('Error fetching market data:', err);
      setError(err.message || 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!position?.marketId || !user) return;

    if (tradeMode === 'sell') {
      // Selling position early - sell full position
      try {
        setIsPlacingTrade(true);
        setError(null);
        
        // Get bet ID from position
        const betId = position.id;
        if (!betId) {
          setError('Cannot sell: Position ID not found');
          return;
        }

        // Sell the position (full position - no amount needed)
        const result = await sellPosition(betId);

        // Notify parent to refresh data
        if (onTradeSuccess) {
          onTradeSuccess();
        }
        
        // Close modal after successful sell
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err: any) {
        console.error('Error selling position:', err);
        setError(err.message || 'Failed to sell position');
      } finally {
        setIsPlacingTrade(false);
      }
      return;
    }

    // Buy more (place additional bet)
    if (!tradeAmount) {
      setError('Please enter an amount');
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount < 10 || amount > 10000) {
      setError('Amount must be between 10 and 10,000 credits');
      return;
    }

    // Buy more (place additional bet)
    try {
      setIsPlacingTrade(true);
      setError(null);
      
      await placeBet({
        marketId: position.marketId,
        side: tradeSide,
        amount,
      });

      // Reset form
      setTradeAmount('');
      
      // Notify parent to refresh data
      if (onTradeSuccess) {
        onTradeSuccess();
      }
      
      // Close modal after successful trade
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error placing trade:', err);
      setError(err.message || 'Failed to place trade');
    } finally {
      setIsPlacingTrade(false);
    }
  };

  const quickAmounts = [100, 250, 500, 1000, 2500];
  const availableCredits = user ? Number(user.creditBalance) : 0;

  // Check if market is expired
  const isExpired = marketData?.expiresAt 
    ? new Date(marketData.expiresAt) < new Date()
    : false;

  // Calculate time until expiry
  const getTimeUntilExpiry = () => {
    if (!marketData?.expiresAt) return null;
    const expiry = new Date(marketData.expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isOpen || !position) return null;

  const currentOdds = marketData?.live 
    ? (tradeSide === 'this' ? marketData.live.thisOdds : marketData.live.thatOdds)
    : 0.5;
  
  const potentialPayout = tradeAmount 
    ? parseFloat(tradeAmount) / currentOdds
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-[#0a0a0a]">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-1">
              {position.market}
            </h2>
            {marketData && (
              <div className="flex items-center gap-4 text-sm text-[#f5f5f5]/60">
                <span>Expires: {marketData.expiresAt ? new Date(marketData.expiresAt).toLocaleString() : 'N/A'}</span>
                {getTimeUntilExpiry() && (
                  <span className={isExpired ? 'text-red-400' : 'text-yellow-400'}>
                    {getTimeUntilExpiry()}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#f5f5f5]/60 hover:text-[#f5f5f5] hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && !marketData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#667eea]"></div>
            </div>
          ) : error && !marketData ? (
            <div className="text-center py-12 text-red-400">{error}</div>
          ) : (
            <>
              {/* Market Info */}
              {marketData && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <p className="text-sm text-[#f5f5f5]/70 mb-2">{marketData.description || 'No description available'}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#f5f5f5]/50">Category:</span>
                      <span className="text-[#f5f5f5]">{marketData.category || 'Uncategorized'}</span>
                    </div>
                  </div>

                  {/* Current Position */}
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <h3 className="text-sm font-semibold text-[#f5f5f5] mb-3">Your Position</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#f5f5f5]/50 mb-1">Side</p>
                        <p className={`text-sm font-medium ${
                          position.prediction === 'THIS' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {position.prediction}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#f5f5f5]/50 mb-1">Value</p>
                        <p className="text-sm font-medium text-[#f5f5f5]">
                          {position.value.toLocaleString()} credits
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#f5f5f5]/50 mb-1">Avg Price</p>
                        <p className="text-sm font-medium text-[#f5f5f5]">{position.avgPrice}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#f5f5f5]/50 mb-1">PnL</p>
                        <p className={`text-sm font-medium ${
                          position.pnl > 0 ? 'text-green-400' : position.pnl < 0 ? 'text-red-400' : 'text-[#f5f5f5]'
                        }`}>
                          {position.pnl >= 0 ? '+' : ''}{position.pnl.toLocaleString()} ({position.pnlPercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price Chart */}
                  {marketData.live && (
                    <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                      <h3 className="text-sm font-semibold text-[#f5f5f5] mb-3">Price Chart</h3>
                      <PriceChart
                        marketId={position.marketId}
                        thisOption={marketData.thisOption}
                        thatOption={marketData.thatOption}
                        currentThisOdds={marketData.live.thisOdds}
                        currentThatOdds={marketData.live.thatOdds}
                      />
                    </div>
                  )}

                  {/* Live Prices */}
                  {marketData.live && (
                    <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                      <h3 className="text-sm font-semibold text-[#f5f5f5] mb-3">Current Odds</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded bg-white/5">
                          <p className="text-xs text-[#f5f5f5]/50 mb-1">{marketData.thisOption}</p>
                          <p className="text-lg font-bold text-green-400">
                            {(marketData.live.thisOdds * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="p-3 rounded bg-white/5">
                          <p className="text-xs text-[#f5f5f5]/50 mb-1">{marketData.thatOption}</p>
                          <p className="text-lg font-bold text-red-400">
                            {(marketData.live.thatOdds * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[#f5f5f5]/50">
                        Liquidity: {marketData.live.liquidity.toLocaleString()} | 
                        Volume 24h: {marketData.live.volume24hr.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trading Interface */}
              {!isExpired && (
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setTradeMode('buy')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        tradeMode === 'buy'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-white/5 text-[#f5f5f5]/60 border border-white/10'
                      }`}
                    >
                      Buy More
                    </button>
                    <button
                      onClick={() => setTradeMode('sell')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        tradeMode === 'sell'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-white/5 text-[#f5f5f5]/60 border border-white/10'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {tradeMode === 'buy' && (
                    <>
                      {/* Side Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-[#f5f5f5] mb-2">
                          Select Side
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTradeSide('this')}
                            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                              tradeSide === 'this'
                                ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                                : 'bg-white/5 text-[#f5f5f5]/60 border border-white/10'
                            }`}
                          >
                            {marketData?.thisOption || 'THIS'}
                          </button>
                          <button
                            onClick={() => setTradeSide('that')}
                            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                              tradeSide === 'that'
                                ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                                : 'bg-white/5 text-[#f5f5f5]/60 border border-white/10'
                            }`}
                          >
                            {marketData?.thatOption || 'THAT'}
                          </button>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-[#f5f5f5] mb-2">
                          Amount (Credits)
                        </label>
                        <input
                          type="number"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          placeholder="Enter amount"
                          min="10"
                          max="10000"
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-[#f5f5f5] focus:outline-none focus:border-[#667eea] transition-colors"
                        />
                        <div className="flex gap-2 mt-2">
                          {quickAmounts.map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setTradeAmount(amount.toString())}
                              className="px-3 py-1 text-xs rounded bg-white/5 text-[#f5f5f5]/70 hover:bg-white/10 border border-white/10 transition-colors"
                            >
                              {amount.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trade Summary */}
                      {tradeAmount && parseFloat(tradeAmount) > 0 && (
                        <div className="p-3 rounded-lg bg-white/5 mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-[#f5f5f5]/70">Current Odds:</span>
                            <span className="text-[#f5f5f5] font-medium">
                              {(currentOdds * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-[#f5f5f5]/70">Potential Payout:</span>
                            <span className="text-green-400 font-medium">
                              {potentialPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credits
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#f5f5f5]/70">Available Credits:</span>
                            <span className="text-[#f5f5f5] font-medium">
                              {availableCredits.toLocaleString()} credits
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                          {error}
                        </div>
                      )}

                      {/* Buy Button */}
                      <button
                        onClick={handleTrade}
                        disabled={!tradeAmount || isPlacingTrade || parseFloat(tradeAmount) < 10 || parseFloat(tradeAmount) > availableCredits}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPlacingTrade ? 'Placing Trade...' : `Buy ${tradeSide === 'this' ? marketData?.thisOption : marketData?.thatOption}`}
                      </button>
                    </>
                  )}

                  {tradeMode === 'sell' && (
                    <>
                      {/* Sell Info */}
                      <div className="mb-4">
                        <div className="p-4 rounded-lg bg-white/5 mb-4">
                          <h4 className="text-sm font-semibold text-[#f5f5f5] mb-3">Sell Your Position</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#f5f5f5]/70">Position Value:</span>
                              <span className="text-[#f5f5f5] font-medium">
                                {position.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credits
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#f5f5f5]/70">Original Bet:</span>
                              <span className="text-[#f5f5f5] font-medium">
                                {position.betData?.amount ? Number(position.betData.amount).toLocaleString() : 'N/A'} credits
                              </span>
                            </div>
                            {marketData?.live && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-[#f5f5f5]/70">Current Odds ({position.prediction}):</span>
                                  <span className={`font-medium ${
                                    position.prediction === 'THIS' ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {((position.prediction === 'THIS' ? marketData.live.thisOdds : marketData.live.thatOdds) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#f5f5f5]/70">Odds at Bet:</span>
                                  <span className="text-[#f5f5f5] font-medium">
                                    {(Number(position.betData?.oddsAtBet || 0.5) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Estimated Return */}
                        {marketData?.live && position.betData && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-yellow-400/70">Estimated Return:</span>
                              <span className="text-yellow-400 font-medium">
                                {(() => {
                                  const betAmount = Number(position.betData.amount);
                                  const oddsAtBet = Number(position.betData.oddsAtBet);
                                  const currentOdds = position.prediction === 'THIS' 
                                    ? marketData.live.thisOdds 
                                    : marketData.live.thatOdds;
                                  const estimatedReturn = betAmount * (currentOdds / oddsAtBet);
                                  return estimatedReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()} credits
                              </span>
                            </div>
                            <p className="text-xs text-yellow-400/60 mt-1">
                              Based on current market odds. Actual return may vary slightly.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                          {error}
                        </div>
                      )}

                      {/* Sell Button */}
                      <button
                        onClick={handleTrade}
                        disabled={isPlacingTrade || isExpired}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPlacingTrade ? 'Selling Position...' : 'Sell Position'}
                      </button>

                      <p className="text-xs text-[#f5f5f5]/50 text-center mt-3">
                        Selling will close your position and return credits based on current market odds.
                      </p>
                    </>
                  )}
                </div>
              )}

              {isExpired && (
                <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-center">
                  <p className="text-red-400 font-medium">This market has expired</p>
                  <p className="text-sm text-[#f5f5f5]/60 mt-1">Your position will be resolved soon</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketTradingModal;

