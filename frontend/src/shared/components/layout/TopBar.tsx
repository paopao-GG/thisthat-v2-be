import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import '@/styles/shared/style.css';

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userCredits = user ? Number(user.creditBalance) || 0 : 0;

  return (
    <header className="px-6 py-4 z-[100] premium-glass border-b topbar-header">
      <div className="flex justify-between items-center">
        {/* Left side: Back button */}
        <button 
          onClick={() => navigate('/app')}
          className="text-[#f5f5f5] p-2.5 hover:bg-[#1a1a1a] rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 w-fit topbar-back-button"
          aria-label="Go to home"
        >
          <ArrowLeft size={22} />
        </button>
        
        {/* Right side: Wallet */}
        <div className="flex gap-2 items-center">
            <div 
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl topbar-wallet-container"
          >
            <svg width="0" height="0" className="topbar-wallet-gradient">
              <defs>
                <linearGradient id="wallet-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
            </svg>
            <Wallet size={18} className="wallet-icon-gradient" style={{ stroke: 'url(#wallet-gradient)' }} />
            <span className="text-sm font-semibold text-white tracking-wide">
              {userCredits.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;


