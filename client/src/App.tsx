import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { LeftNav } from './components/common/LeftNav';
import { DemoBanner } from './components/common/DemoBanner';
import { LandingPage } from './pages/LandingPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { ComponentsPage } from './pages/ComponentsPage';
import { MarkdownPage } from './pages/MarkdownPage';
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
  bodyLayout: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    minHeight: 'calc(100vh - 56px)',
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
});

export const App: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(() => {
    return localStorage.getItem('ppqa_nav_expanded') !== 'false';
  });
  const [importedScenario, setImportedScenario] = useState<any | null>(null);

  const handleToggleNav = () => {
    setIsNavExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('ppqa_nav_expanded', String(next));
      return next;
    });
  };

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
        onToggleNav={handleToggleNav}
        isNavExpanded={isNavExpanded}
      />
      <div className={styles.bodyLayout}>
        <LeftNav expanded={isNavExpanded} onToggle={handleToggleNav} />
        <main className={styles.content}>
          <Routes>
            <Route path="/" element={<Navigate to="/solutions" replace />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/components" element={<ComponentsPage />} />
            <Route path="/markdown" element={<MarkdownPage />} />
            <Route path="/test-suites" element={<TestSuitesPage />} />
            <Route path="/runs" element={<LiveRunsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/solutions" replace />} />
          </Routes>
        </main>
      </div>

      <ChatAssistantDrawer
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onScenarioImported={handleScenarioImported}
      />
    </div>
  );
};

export default App;
