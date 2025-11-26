import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
      <Routes>
        <Route path="/" element={<PreLogin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="play" element={<BettingPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
