import React from 'react';
import type { Market } from '@shared/types';
import '@/styles/betting/style.css';

interface MarketCardProps {
  market: Market;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  return (
    <div className="w-full max-w-2xl mx-auto border border-white/10 rounded-lg betting-controls-option-container">
      {market.imageUrl && (
        <div 
          className="w-full h-48 bg-cover bg-center relative rounded-t-lg"
          style={{ backgroundImage: `url(${market.imageUrl})` }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-24 betting-controls-option-container" />
        </div>
      )}
      
      <div className="px-5 py-6">
        <h2 className="text-2xl font-semibold mb-2 leading-tight text-white tracking-tight">
          {market.title}
        </h2>
        <p className="text-sm text-white/60 leading-relaxed">
          {market.description}
        </p>
      </div>
    </div>
  );
};

export default MarketCard;


