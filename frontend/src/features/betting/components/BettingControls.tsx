import React, { useState } from 'react';
import type { Market } from '@shared/types';
import '@/styles/betting/style.css';

interface BettingControlsProps {
  market: Market;
  onPlaceBet: (option: 'THIS' | 'THAT', amount: number) => void;
  maxCredits: number;
}

const BettingControls: React.FC<BettingControlsProps> = ({ market, onPlaceBet, maxCredits }) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedOption, setSelectedOption] = useState<'THIS' | 'THAT' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOptionSelect = (option: 'THIS' | 'THAT') => {
    setSelectedOption(option);
  };

  const handleBetAmountClick = () => {
    setIsModalOpen(true);
  };

  const handlePlaceBet = () => {
    if (selectedOption && betAmount > 0 && betAmount <= maxCredits) {
      onPlaceBet(selectedOption, betAmount);
      setSelectedOption(null);
      setBetAmount(100);
      setIsModalOpen(false);
    }
  };

  const calculatePotentialPayout = () => {
    if (!selectedOption) return 0;
    const odds = selectedOption === 'THIS' ? market.thisOdds : market.thatOdds;
    return betAmount * odds;
  };

  return (
    <>
      <div className="w-full max-w-2xl  mx-auto">
        <div className="flex gap-2 items-stretch mb-2">
          <div
            className="flex-1 px-5 py-6 border border-white/10 relative min-h-[200px] flex items-center justify-center transition-all betting-controls-option-container"
          >
            <span className="text-base text-white leading-tight text-center">{market.thisOption}</span>
          </div>

          <div
            className="flex-1 px-5 py-6 border border-white/10 relative min-h-[300px] flex items-center justify-center transition-all betting-controls-option-container"
          >
            <span className="text-base text-white leading-tight text-center">{market.thatOption}</span>
          </div>
        </div>

        <div className="flex gap-3 md:gap-4 mb-4">
          <button
            className={`flex-1 py-3.5 md:py-4 px-4 md:px-6 font-semibold uppercase tracking-wider transition-all text-sm md:text-base border focus:outline-none ${
              selectedOption === 'THIS'
                ? 'border-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_20px_rgba(255,255,255,0.3)]'
                : 'border-white/10 hover:border-white/20'
            }`}
            className="betting-controls-this-button"
            onClick={() => handleOptionSelect('THIS')}
          >
            THIS
          </button>

          <button
            className={`flex-1 py-3.5 md:py-4 px-4 md:px-6 font-semibold uppercase tracking-wider transition-all text-sm md:text-base border focus:outline-none ${
              selectedOption === 'THAT'
                ? 'border-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_20px_rgba(255,255,255,0.3)]'
                : 'border-white/10 hover:border-white/20'
            }`}
            className="betting-controls-that-button"
            onClick={() => handleOptionSelect('THAT')}
          >
            THAT
          </button>
        </div>

        <button
          onClick={handleBetAmountClick}
          className="w-full p-5 md:p-6 border border-white/10 transition-all hover:border-white/20 relative min-h-[70px] md:min-h-[80px] focus:outline-none betting-controls-amount-button"
        >
          <span className="absolute top-4 left-4 md:top-5 md:left-5 text-sm text-white/50 font-normal">Amount</span>
          <div className="flex items-center justify-center h-full">
            <span className="text-2xl md:text-3xl font-semibold text-white">${betAmount}</span>
          </div>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 betting-controls-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-md md:max-w-lg p-5 md:p-6 border border-white/10 backdrop-blur-sm animate-slideDown betting-controls-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Selection Buttons */}
            <div className="flex gap-3 mb-5">
              <button
                className={`flex-1 py-3 px-4 font-semibold transition-all text-sm border focus:outline-none ${
                  selectedOption === 'THIS'
                    ? 'border-green-400/60 shadow-[0_0_0_1px_rgba(34,197,94,0.4),0_0_15px_rgba(34,197,94,0.2)]'
                    : 'border-green-800/30 hover:border-green-700/50'
                }`}
                className={selectedOption === 'THIS' ? 'betting-controls-modal-this-button' : 'betting-controls-modal-this-button-inactive'}
                onClick={() => handleOptionSelect('THIS')}
              >
                <span 
                  className={selectedOption === 'THIS' ? 'betting-controls-modal-this-text-active' : 'betting-controls-modal-this-text-inactive'}
                >
                  Yes {market.thisOdds.toFixed(2)}x
                </span>
              </button>

              <button
                className={`flex-1 py-3 px-4 font-semibold transition-all text-sm border focus:outline-none ${
                  selectedOption === 'THAT'
                    ? 'border-red-400/60 shadow-[0_0_0_1px_rgba(248,113,113,0.4),0_0_15px_rgba(248,113,113,0.2)]'
                    : 'border-red-800/30 hover:border-red-700/50'
                }`}
                className={selectedOption === 'THAT' ? 'betting-controls-modal-that-button' : 'betting-controls-modal-that-button-inactive'}
                onClick={() => handleOptionSelect('THAT')}
              >
                <span 
                  className={selectedOption === 'THAT' ? 'betting-controls-modal-that-text-active' : 'betting-controls-modal-that-text-inactive'}
                >
                  No {market.thatOdds.toFixed(2)}x
                </span>
              </button>
            </div>

            {/* Amount Section */}
            <div className="mb-5">
              <div className="relative mb-3 p-4 border border-white/10 bg-transparent min-h-[70px] flex items-center justify-end betting-controls-amount-input-container">
                <span className="absolute top-3 left-4 text-sm text-white/50">Amount</span>
                <div className="flex items-center justify-end">
                  <span className="text-2xl font-semibold text-white">$</span>
                  <input
                    type="number"
                    min="1"
                    max={maxCredits}
                    value={betAmount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (value >= 0 && value <= maxCredits) {
                        setBetAmount(value);
                      }
                    }}
                    className="text-2xl font-semibold bg-transparent border-none outline-none text-left focus:outline-none betting-controls-amount-input"
                    style={{
                      width: `${String(betAmount).length * 20}px`,
                      minWidth: '40px',
                      maxWidth: '200px'
                    }}
                  />
                </div>
              </div>
              
              <div className="text-xs text-white/30 mb-3 text-right">
                Max: {maxCredits.toLocaleString()}
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 py-2.5 px-3 border border-white/10 hover:border-white/20 text-white text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none betting-controls-increment-button"
                  onClick={() => setBetAmount(Math.min(betAmount + 1, maxCredits))}
                  disabled={betAmount >= maxCredits}
                >
                  +$1
                </button>
                <button
                  className="flex-1 py-2.5 px-3 border border-white/10 hover:border-white/20 text-white text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none betting-controls-increment-button"
                  onClick={() => setBetAmount(Math.min(betAmount + 250, maxCredits))}
                  disabled={betAmount >= maxCredits}
                >
                  +$250
                </button>
                <button
                  className="flex-1 py-2.5 px-3 border border-white/10 hover:border-white/20 text-white text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none betting-controls-increment-button"
                  onClick={() => setBetAmount(Math.min(betAmount + 100, maxCredits))}
                  disabled={betAmount >= maxCredits}
                >
                  +$100
                </button>
                <button
                  className="flex-1 py-2.5 px-3 border border-white/10 hover:border-white/20 text-white text-sm font-medium transition-all focus:outline-none betting-controls-increment-button"
                  onClick={() => setBetAmount(maxCredits)}
                >
                  Max
                </button>
              </div>
            </div>

            {/* Potential Payout */}
            {selectedOption && betAmount > 0 && (
              <div className="mb-4 p-3 border border-white/5 bg-transparent">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/50">Potential return</span>
                  <span className="font-semibold text-white">${calculatePotentialPayout().toFixed(0)}</span>
                </div>
              </div>
            )}

            {/* Trade Button */}
            <button
              className={`w-full py-3.5 md:py-4 px-4 md:px-6 font-semibold uppercase tracking-wider transition-all text-sm md:text-base focus:outline-none disabled:cursor-not-allowed ${
                !selectedOption || betAmount === 0 || betAmount > maxCredits
                  ? 'betting-controls-place-bet-button-disabled'
                  : 'betting-controls-place-bet-button border border-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_0_20px_rgba(255,255,255,0.3)]'
              }`}
              onClick={handlePlaceBet}
              disabled={!selectedOption || betAmount === 0 || betAmount > maxCredits}
            >
              {selectedOption ? 'Trade' : 'Select an option'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BettingControls;


