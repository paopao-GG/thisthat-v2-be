import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import type { UserStats } from '@shared/types';
import ProfileSummaryCard from '@features/profile/components/ProfileSummaryCard';
import WalletSection from '@features/profile/wallet/components/WalletSection';
import PositionsTable from '@features/profile/components/PositionsTable';
import ReferralModal from '@features/profile/components/ReferralModal';

const mockPositions: Array<{
  id: string;
  market: string;
  prediction: string;
  shares: string;
  avgPrice: string;
  currentPrice: string;
  value: number;
  pnl: number;
  pnlPercent: number;
}> = [
  {
    id: '1',
    market: "Will 'The Running Man' Opening Weekend Box Office be between 17m and 19m?",
    prediction: 'Yes',
    shares: '6,343,700.5 shares at 50¢',
    avgPrice: '50¢',
    currentPrice: '0.1¢',
    value: 3474.85,
    pnl: -3471379.33,
    pnlPercent: -99.9,
  },
];

const ProfilePage: React.FC = () => {
  const { user, loading, logout: logoutUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'positions' | 'activity'>('positions');
  const [positionFilter, setPositionFilter] = useState<'active' | 'closed'>('active');
  const [timeFilter, setTimeFilter] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});

  // Convert user data to UserStats format
  const userStats: UserStats | null = user ? {
    userId: user.id,
    username: user.username,
    credits: Number(user.creditBalance) || 0,
    totalVolume: Number(user.totalVolume) || 0,
    totalPnL: Number(user.overallPnL) || 0,
    rank: user.rankByPnL || 0,
    winRate: 0, // TODO: Calculate from bets
    totalBets: 0, // TODO: Fetch from bets endpoint
    dailyStreak: user.consecutiveDaysOnline || 0,
    tokenAllocation: 0, // V1 doesn't have tokens
    lockedTokens: 0, // V1 doesn't have tokens
    lastClaimDate: null, // TODO: Fetch from daily rewards
  } : null;

  const referralCode = user?.referralCode || '';
  const referralLink = referralCode ? `https://thisthat.app/ref/${referralCode}` : '';

  const biggestWin = 0; // TODO: Calculate from bets

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

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
        positions={mockPositions}
        biggestWin={biggestWin}
        timeFilter={timeFilter}
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
        <PositionsTable
          positions={mockPositions}
          positionFilter={positionFilter}
          searchQuery={searchQuery}
          onFilterChange={setPositionFilter}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="text-center py-12 text-[#f5f5f5]/50 text-sm">
          Activity history coming soon
        </div>
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
