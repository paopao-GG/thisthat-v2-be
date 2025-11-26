import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import type { UserStats } from '@shared/types';
import { getUserBets } from '@shared/services/betService';
import ProfileSummaryCard from '@features/profile/components/ProfileSummaryCard';
import WalletSection from '@features/profile/wallet/components/WalletSection';
import PositionsTable from '@features/profile/components/PositionsTable';
import ReferralModal from '@features/profile/components/ReferralModal';

interface Position {
  id: string;
  market: string;
  prediction: string;
  shares: string;
  avgPrice: string;
  currentPrice: string;
  value: number;
  pnl: number;
  pnlPercent: number;
}

const ProfilePage: React.FC = () => {
  const { user, loading, logout: logoutUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'positions' | 'activity'>('positions');
  const [positionFilter, setPositionFilter] = useState<'active' | 'closed'>('active');
  const [timeFilter, setTimeFilter] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingBets, setLoadingBets] = useState(true);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});

  // Calculate stats from bets (memoized to recalculate when bets or timeFilter changes)
  const stats = useMemo(() => {
    if (allBets.length === 0) {
      return {
        totalPnL: 0,
        positionValue: 0,
        biggestWin: 0,
        totalBets: 0,
        winRate: 0,
      };
    }

    const now = new Date();
    let filteredBets = allBets;

    // Filter bets by time
    if (timeFilter !== 'ALL') {
      const daysAgo = timeFilter === '1D' ? 1 : timeFilter === '1W' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filteredBets = allBets.filter((bet: any) => {
        const betDate = new Date(bet.placedAt);
        return betDate >= cutoffDate;
      });
    }

    // Calculate PnL from filtered bets
    let totalPnL = 0;
    let positionValue = 0;
    let biggestWin = 0;
    let totalBets = filteredBets.length;
    let wins = 0;
    let losses = 0;

    filteredBets.forEach((bet: any) => {
      const amount = Number(bet.amount);
      const actualPayout = bet.actualPayout ? Number(bet.actualPayout) : null;
      const potentialPayout = Number(bet.potentialPayout) || (amount / (Number(bet.oddsAtBet) || 0.5));

      if (bet.status === 'won' && actualPayout) {
        // Won bet: realized profit
        const profit = actualPayout - amount;
        totalPnL += profit;
        if (profit > biggestWin) {
          biggestWin = profit;
        }
        wins++;
      } else if (bet.status === 'lost') {
        // Lost bet: realized loss
        totalPnL -= amount;
        losses++;
      } else if (bet.status === 'pending') {
        // Pending bet: unrealized, add to position value only
        positionValue += potentialPayout;
        // Don't add to PnL (unrealized)
      } else if (bet.status === 'cancelled') {
        // Cancelled bet: refunded, doesn't affect PnL
        positionValue += amount; // Refunded amount
      }
    });

    // Calculate win rate (only for closed bets)
    const closedBets = wins + losses;
    const winRate = closedBets > 0 ? (wins / closedBets) * 100 : 0;

    return {
      totalPnL,
      positionValue,
      biggestWin,
      totalBets,
      winRate,
    };
  }, [allBets, timeFilter]);

  // Convert user data to UserStats format
  const userStats: UserStats | null = user ? {
    userId: user.id,
    username: user.username,
    credits: Number(user.creditBalance) || 0,
    totalVolume: Number(user.totalVolume) || 0,
    totalPnL: stats.totalPnL, // Use calculated PnL based on time filter
    rank: user.rankByPnL || 0,
    winRate: stats.winRate,
    totalBets: stats.totalBets,
    dailyStreak: user.consecutiveDaysOnline || 0,
    tokenAllocation: 0, // V1 doesn't have tokens
    lockedTokens: 0, // V1 doesn't have tokens
    lastClaimDate: user.lastDailyRewardAt ? new Date(user.lastDailyRewardAt) : null,
  } : null;

  const referralCode = user?.referralCode || '';
  const referralLink = referralCode ? `https://thisthat.app/ref/${referralCode}` : '';

  const biggestWin = stats.biggestWin;
  const positionValue = stats.positionValue;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  // Convert bets to positions format
  const convertBetsToPositions = (bets: any[]): Position[] => {
    return bets.map((bet: any) => {
      const side = bet.side === 'this' ? 'THIS' : 'THAT';
      const amount = Number(bet.amount);
      const odds = Number(bet.oddsAtBet) || 0.5;
      const potentialPayout = Number(bet.potentialPayout) || (amount / odds);
      const actualPayout = bet.actualPayout ? Number(bet.actualPayout) : null;
      
      // Calculate PnL
      let pnl = 0;
      let pnlPercent = 0;
      let value = amount;
      
      if (bet.status === 'won' && actualPayout) {
        pnl = actualPayout - amount;
        pnlPercent = (pnl / amount) * 100;
        value = actualPayout;
      } else if (bet.status === 'lost') {
        pnl = -amount;
        pnlPercent = -100;
        value = 0;
      } else if (bet.status === 'pending') {
        // For pending bets, show potential value
        value = potentialPayout;
        pnl = potentialPayout - amount;
        pnlPercent = (pnl / amount) * 100;
      } else if (bet.status === 'cancelled') {
        pnl = 0;
        pnlPercent = 0;
        value = amount; // Refunded
      }
      
      return {
        id: bet.id,
        market: bet.market?.title || 'Unknown Market',
        prediction: side,
        shares: `${amount.toLocaleString()} credits`,
        avgPrice: `${odds.toFixed(2)}x`,
        currentPrice: bet.status === 'pending' ? `${odds.toFixed(2)}x` : (actualPayout ? `${(actualPayout / amount).toFixed(2)}x` : 'N/A'),
        value,
        pnl,
        pnlPercent,
      };
    });
  };

  // Filter positions based on positionFilter
  useEffect(() => {
    if (allBets.length === 0) {
      setPositions([]);
      return;
    }

    const positionsData = convertBetsToPositions(allBets);
    
    // Separate active (pending) and closed (won/lost/cancelled) positions
    const activePositions = positionsData.filter(p => {
      const bet = allBets.find((b: any) => b.id === p.id);
      return bet?.status === 'pending';
    });
    
    const closedPositions = positionsData.filter(p => {
      const bet = allBets.find((b: any) => b.id === p.id);
      return bet?.status !== 'pending';
    });
    
    // Update positions based on filter
    if (positionFilter === 'active') {
      setPositions(activePositions);
    } else {
      setPositions(closedPositions);
    }
  }, [allBets, positionFilter]);

  // Fetch user bets (only when user changes)
  useEffect(() => {
    const fetchBets = async () => {
      if (!user) {
        setAllBets([]);
        setActivity([]);
        return;
      }
      
      try {
        setLoadingBets(true);
        const response = await getUserBets({ limit: 100 });
        
        console.log('Bets response:', response);
        
        // Backend returns { success: true, bets: [...], total, limit, offset }
        const bets = response.bets || [];
        
        if (bets && Array.isArray(bets) && bets.length > 0) {
          setAllBets(bets);
          setActivity(bets);
        } else {
          setAllBets([]);
          setActivity([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch bets:', error);
        setAllBets([]);
        setActivity([]);
      } finally {
        setLoadingBets(false);
      }
    };

    fetchBets();
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [loading, user, navigate]);

  // Update slider position when activeTab changes
  useEffect(() => {
    const updateSliderPosition = () => {
      if (!tabsContainerRef.current) return;

      const activeIndex = activeTab === 'positions' ? 0 : 1;
      const container = tabsContainerRef.current;
      const buttons = container.querySelectorAll('button');
      const activeButton = buttons[activeIndex] as HTMLElement;
      
      if (!activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      const left = buttonRect.left - containerRect.left;
      const width = buttonRect.width;

      setSliderStyle({
        left: `${left}px`,
        width: `${width}px`,
      });
    };

    // Use requestAnimationFrame for smoother updates
    const rafId = requestAnimationFrame(() => {
      updateSliderPosition();
      // Double RAF to ensure layout is complete
      requestAnimationFrame(updateSliderPosition);
    });
    
    // Update on resize
    const handleResize = () => {
      requestAnimationFrame(updateSliderPosition);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab]);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
    }
  };

  const handleShareLink = () => {
    if (!referralLink) return;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join THIS<THAT',
        text: 'Check out this prediction market platform!',
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5f5f5] mx-auto mb-4"></div>
          <p className="text-[#f5f5f5]/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user
  if (!user || !userStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-[#f5f5f5] text-lg mb-4">Unable to load profile</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#667eea] text-white rounded-lg hover:bg-[#5568d3] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto pb-8">
      {/* Logout Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[#f5f5f5]/70 hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={16} />
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>

      {/* Wallet Section */}
      <WalletSection
        userStats={userStats}
      />

      {/* Summary Card */}
      <ProfileSummaryCard
        userStats={userStats}
        positions={positions}
        biggestWin={biggestWin}
        positionValue={positionValue}
        timeFilter={timeFilter}
        bets={allBets}
        onTimeFilterChange={setTimeFilter}
        onReferralClick={() => setIsModalOpen(true)}
      />

      {/* Tabs */}
      <div 
        ref={tabsContainerRef}
        className="flex items-center gap-6 mb-4 relative" 
        style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}
      >
        {/* Sliding gradient underline */}
        <div
          className="absolute bottom-0 h-0.5 pointer-events-none z-0"
          style={{
            ...sliderStyle,
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            transition: 'left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'left, width',
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('positions');
          }}
          className={`pb-3 px-1 text-sm font-semibold transition-all relative border-none z-10 ${
            activeTab === 'positions' ? 'text-[#f5f5f5]' : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
          }`}
        >
          Positions
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('activity');
          }}
          className={`pb-3 px-1 text-sm font-semibold transition-all relative border-none z-10 ${
            activeTab === 'activity' ? 'text-[#f5f5f5]' : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
          }`}
        >
          Previous Activity
        </button>
      </div>

      {/* Positions Table */}
      {activeTab === 'positions' && (
        <>
          {loadingBets ? (
            <div className="text-center py-12 text-[#f5f5f5]/50 text-sm">
              Loading positions...
            </div>
          ) : (
            <PositionsTable
              positions={positions}
              positionFilter={positionFilter}
              searchQuery={searchQuery}
              onFilterChange={setPositionFilter}
              onSearchChange={setSearchQuery}
            />
          )}
        </>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <>
          {loadingBets ? (
            <div className="text-center py-12 text-[#f5f5f5]/50 text-sm">
              Loading activity...
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-12 text-[#f5f5f5]/50 text-sm">
              No activity yet. Start betting to see your history here!
            </div>
          ) : (
            <div className="space-y-4">
              {activity.map((bet: any) => {
                const side = bet.side === 'this' ? 'THIS' : 'THAT';
                const amount = Number(bet.amount);
                const statusColor = 
                  bet.status === 'won' ? 'text-green-400' :
                  bet.status === 'lost' ? 'text-red-400' :
                  bet.status === 'cancelled' ? 'text-gray-400' :
                  'text-yellow-400';
                
                return (
                  <div key={bet.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[#f5f5f5] mb-1">
                          {bet.market?.title || 'Unknown Market'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-[#f5f5f5]/70">
                          <span className={`font-medium ${side === 'THIS' ? 'text-green-400' : 'text-red-400'}`}>
                            {side}
                          </span>
                          <span>{amount.toLocaleString()} credits</span>
                          <span>@{Number(bet.oddsAtBet).toFixed(2)}x</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${statusColor}`}>
                          {bet.status.toUpperCase()}
                        </div>
                        {bet.status === 'won' && bet.actualPayout && (
                          <div className="text-xs text-green-400 mt-1">
                            +{(Number(bet.actualPayout) - amount).toLocaleString()} credits
                          </div>
                        )}
                        {bet.status === 'lost' && (
                          <div className="text-xs text-red-400 mt-1">
                            -{amount.toLocaleString()} credits
                          </div>
                        )}
                        {bet.status === 'pending' && (
                          <div className="text-xs text-yellow-400 mt-1">
                            Potential: {Number(bet.potentialPayout).toLocaleString()} credits
                          </div>
                        )}
                        <div className="text-xs text-[#f5f5f5]/50 mt-1">
                          {new Date(bet.placedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}


      {/* Invite Friends Modal */}
      {referralCode && (
        <ReferralModal
          isOpen={isModalOpen}
          referralCode={referralCode}
          referralLink={referralLink}
          onClose={() => setIsModalOpen(false)}
          onCopyCode={handleCopyCode}
          onShareLink={handleShareLink}
        />
      )}
    </div>
  );
};

export default ProfilePage;
