import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppTitle from '@shared/components/AppTitle';
import Logo from '@shared/components/Logo';

const PreLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params
    const errorParam = searchParams.get('error');
    const details = searchParams.get('details');
    if (errorParam) {
      console.error('OAuth error:', errorParam, details);
      setError(errorParam);
      setErrorDetails(details);
      // Clear error from URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const handleSignInWithX = () => {
    // Redirect to backend OAuth endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/api/v1/auth/x`;
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{ 
        background: 'radial-gradient(ellipse at left, rgba(30, 30, 45, 0.5) 0%, transparent 50%), radial-gradient(ellipse at right, rgba(30, 30, 45, 0.5) 0%, transparent 50%), #0a0a0a'
      }}
    >
      {/* Welcome To header */}
      <div className="absolute top-8 left-0 right-0 flex justify-between items-center px-6 z-10">
        <span className="text-white/70 text-lg font-light">Welcome</span>
        <span className="text-white/70 text-lg font-light">To</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20">
        {/* This or That */}
        <AppTitle className="mb-12" showTagline={false} />

        {/* Logo */}
        <Logo className="mt-8" />
      </div>

      {/* Error message */}
      {error && (
        <div className="relative z-10 w-full px-6 pt-4">
          <div className="max-w-md mx-auto p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            <p className="font-semibold mb-1">Login Failed</p>
            <p className="mb-2">Error: {error}</p>
            {errorDetails && (
              <p className="text-xs mb-2 opacity-90 break-words">{errorDetails}</p>
            )}
            <p className="text-xs mt-2 opacity-75">Please check the backend console for more details.</p>
          </div>
        </div>
      )}

      {/* Sign in button at bottom */}
      <div className="relative z-10 w-full px-6 pb-12 pt-8">
        <button
          onClick={handleSignInWithX}
          className="btn-premium w-full max-w-md mx-auto py-5 px-10 text-sm font-light text-white rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] block tracking-wider"
        >
          <span className="relative z-10">Sign in with X Account</span>
          <div className="btn-premium-glow" />
        </button>
      </div>
    </div>
  );
};

export default PreLogin;

