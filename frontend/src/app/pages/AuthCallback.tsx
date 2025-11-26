import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setTokens } from '@shared/services/api';
import { getCurrentUser } from '@shared/services/authService';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const error = searchParams.get('error');

    console.log('AuthCallback - Received params:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken, 
      userId,
      error 
    });

    if (error) {
      console.error('OAuth error in callback:', error);
      navigate('/?error=oauth_failed');
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens
      setTokens(accessToken, refreshToken, userId || undefined);
      
      console.log('Tokens stored, redirecting to /app');
      
      // Redirect to app - AuthProvider will fetch user data
      navigate('/app', { replace: true });
    } else {
      console.error('Missing tokens in callback');
      navigate('/?error=missing_tokens');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-[#f5f5f5] text-lg mb-2">Completing sign in...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f5f5f5] mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;

