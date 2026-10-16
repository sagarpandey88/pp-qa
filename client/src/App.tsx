import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { DemoBanner } from './components/common/DemoBanner';
import { LandingPage } from './pages/LandingPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { TestSuitesPage } from './pages/TestSuitesPage';
import { LiveRunsPage } from './pages/LiveRunsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatAssistantDrawer } from './components/chat/ChatAssistantDrawer';

const useStyles = makeStyles({
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
});

export const App: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [importedScenario, setImportedScenario] = useState<any | null>(null);

  const handleScenarioImported = (sc: any) => {
    try {
      const stored = localStorage.getItem('ppqa_draft_scenarios');
      const list = stored ? JSON.parse(stored) : [];
      list.push(sc);
      localStorage.setItem('ppqa_draft_scenarios', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
    setImportedScenario(sc);
    navigate('/test-suites');
  };

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className={styles.appContainer}>
      <DemoBanner />
      <Header
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
      />
      <Navigation />
      <main className={styles.content}>
        <Routes>
          <Route path="/" element={<Navigate to="/solutions" replace />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/test-suites" element={<TestSuitesPage />} />
          <Route path="/runs" element={<LiveRunsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/solutions" replace />} />
        </Routes>
      </main>

      <ChatAssistantDrawer
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onScenarioImported={handleScenarioImported}
      />
    </div>
  );
};

export default App;

