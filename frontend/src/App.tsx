import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { RequireAuth } from '@shared/components/RequireAuth';
import AppLayout from '@shared/components/layout/AppLayout';
import PreLogin from '@app/pages/PreLogin';
import AuthCallback from '@app/pages/AuthCallback';
import HomePage from '@app/pages/HomePage';
import BettingPage from '@app/pages/BettingPage';
import LeaderboardPage from '@app/pages/LeaderboardPage';
import ProfilePage from '@app/pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PreLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="play" element={<BettingPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
