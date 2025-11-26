import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-32 h-32 md:w-40 md:h-40',
    md: 'w-48 h-48 md:w-64 md:h-64',
    lg: 'w-64 h-64 md:w-80 md:h-80'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full border-2 border-white/20 flex items-center justify-center ${className}`}
      style={{ background: 'rgba(20, 20, 30, 0.5)' }}
    >
      <div className="text-center">
        <div className="text-white/30 text-xs md:text-sm font-light">Logo</div>
      </div>
    </div>
  );
};

export default Logo;

