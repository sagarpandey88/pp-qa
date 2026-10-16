import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Card,
  CardHeader,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowRightRegular,
  SparkleRegular,
  BoxRegular,
  BotRegular,
  CodeRegular,
  PlayRegular,
  CheckmarkCircleRegular,
  ShieldCheckmarkRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LoginButton, MicrosoftIcon } from '../components/auth/LoginButton';

const useStyles = makeStyles({
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  navBar: {
    height: '64px',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoIcon: {
    fontSize: '26px',
    color: '#0078d4',
  },
  brandTitle: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  heroSection: {
    padding: '72px 24px 56px 24px',
    maxWidth: '1080px',
    margin: '0 auto',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroBadge: {
    marginBottom: '20px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: '46px',
    lineHeight: '1.18',
    fontWeight: '800',
    letterSpacing: '-0.8px',
    marginBottom: '20px',
    color: tokens.colorNeutralForeground1,
    '@media (max-width: 768px)': {
      fontSize: '32px',
    },
  },
  heroHighlight: {
    color: '#0078d4',
  },
  heroSubtitle: {
    fontSize: '19px',
    lineHeight: '1.5',
    color: tokens.colorNeutralForeground2,
    maxWidth: '820px',
    margin: '0 auto 36px auto',
  },
  ctaRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  primaryCta: {
    fontSize: '16px',
    height: '48px',
    padding: '0 28px',
    fontWeight: '600',
  },
  secondaryCta: {
    fontSize: '16px',
    height: '48px',
    padding: '0 24px',
    fontWeight: '600',
  },
  trustRow: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
    marginTop: '12px',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  section: {
    padding: '56px 24px',
    maxWidth: '1140px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  sectionHeading: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '10px',
  },
  sectionDesc: {
    fontSize: '16px',
    color: tokens.colorNeutralForeground2,
    maxWidth: '680px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  featureCard: {
    padding: '24px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: tokens.shadow8,
    },
  },
  cardIcon: {
    fontSize: '32px',
    color: '#0078d4',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  cardText: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.45',
  },
  stepsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '28px',
  },
  stepCard: {
    padding: '24px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    position: 'relative',
  },
  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#0078d4',
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: '14px',
  },
  ctaBanner: {
    margin: '64px 24px',
    padding: '48px 32px',
    borderRadius: '12px',
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  footer: {
    padding: '32px 24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
    marginTop: 'auto',
  },
});

export const LandingPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoClick = async () => {
    setDemoLoading(true);
    try {
      await loginAsDemo();
      navigate('/solutions');
    } catch (err: any) {
      alert(`Failed to start demo: ${err.message || err}`);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Navigation */}
      <header className={styles.navBar}>
        <div className={styles.logoGroup} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className={styles.logoIcon}>⚡</span>
          <div>
            <Text className={styles.brandTitle}>Power Platform &amp; Copilot QA</Text>
            <Badge appearance="tint" color="informative" size="small" style={{ marginLeft: '8px' }}>
              pp-qa
            </Badge>
          </div>
        </div>

        <div className={styles.navRight}>
          <Button
            appearance="subtle"
            icon={effectiveTheme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
          />

          <Button
            appearance="outline"
            icon={demoLoading ? <Spinner size="tiny" /> : <SparkleRegular />}
            disabled={demoLoading}
            onClick={handleDemoClick}
          >
            {demoLoading ? 'Starting Demo...' : 'Explore Demo'}
          </Button>

          <LoginButton
            appearance="primary"
            triggerButton={
              <Button appearance="primary" icon={<MicrosoftIcon />}>
                Get Started
              </Button>
            }
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <Badge appearance="filled" color="brand" className={styles.heroBadge} icon={<SparkleRegular />}>
          Automated Enterprise Verification
        </Badge>
        <h1 className={styles.heroTitle}>
          AI-Powered E2E Testing for <br />
          <span className={styles.heroHighlight}>Power Platform &amp; Copilot Studio</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Reverse-engineer unmanaged Dataverse packages into comprehensive specifications, synthesize strongly-typed
          Playwright test suites using Microsoft's official Page Object Model templates, and execute live runs with real-time SSE reporting.
        </p>

        <div className={styles.ctaRow}>
          <LoginButton
            triggerButton={
              <Button
                appearance="primary"
                size="large"
                className={styles.primaryCta}
                icon={<MicrosoftIcon size={20} />}
              >
                Sign In with Microsoft
              </Button>
            }
          />

          <Button
            appearance="secondary"
            size="large"
            className={styles.secondaryCta}
            icon={demoLoading ? <Spinner size="tiny" /> : <PlayRegular />}
            disabled={demoLoading}
            onClick={handleDemoClick}
          >
            {demoLoading ? 'Initializing Sandbox...' : 'Explore Live Demo'}
          </Button>
        </div>

        <div className={styles.trustRow}>
          <div className={styles.trustItem}>
            <CheckmarkCircleRegular style={{ color: '#107c10' }} />
            <span>Microsoft Entra ID Corporate SSO</span>
          </div>
          <div className={styles.trustItem}>
            <ShieldCheckmarkRegular style={{ color: '#0078d4' }} />
            <span>AES-256-GCM Encrypted Credential Vault</span>
          </div>
          <div className={styles.trustItem}>
            <CheckmarkCircleRegular style={{ color: '#107c10' }} />
            <span>Official Microsoft Playwright POM Patterns</span>
          </div>
          <div className={styles.trustItem}>
            <CheckmarkCircleRegular style={{ color: '#107c10' }} />
            <span>Zero-Dependency Database Fallback</span>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Built Specifically for Microsoft Business Applications</h2>
          <p className={styles.sectionDesc}>
            Everything required to ingest, analyze, generate, and execute production-grade tests across Model-Driven Apps, Canvas Apps, and Copilot bots.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Card 1 */}
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>
              <BoxRegular />
            </div>
            <div className={styles.cardTitle}>Solution Ingestion &amp; Extraction</div>
            <div className={styles.cardText}>
              Extract unmanaged Dataverse solutions directly via Web API or ZIP upload. Parses tables, columns, relationships, Cloud Flows, and Copilot Studio Bot topics into structured specs and ERDs.
            </div>
          </div>

          {/* Card 2 */}
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>
              <BotRegular />
            </div>
            <div className={styles.cardTitle}>Agentic Multi-Model AI (BYOK)</div>
            <div className={styles.cardText}>
              Bring your own OpenAI (gpt-4o, o3-mini) or Gemini (2.0 Flash) API keys. The streaming assistant uses specialized tools to query your metadata and draft high-coverage test scenario cards.
            </div>
          </div>

          {/* Card 3 */}
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>
              <CodeRegular />
            </div>
            <div className={styles.cardTitle}>Playwright POM Synthesizer</div>
            <div className={styles.cardText}>
              Compiles scenario cards into strongly-typed TypeScript Playwright test suites utilizing Microsoft's Page Object Model templates (ModelDrivenAppPage, GridComponent, FormComponent, CopilotChat).
            </div>
          </div>

          {/* Card 4 */}
          <div className={styles.featureCard}>
            <div className={styles.cardIcon}>
              <PlayRegular />
            </div>
            <div className={styles.cardTitle}>Headless Runner &amp; Live Reports</div>
            <div className={styles.cardText}>
              Dual-domain session manager handles make.powerapps.com and *.dynamics.com. Stream live logs via Server-Sent Events, inspect full Playwright HTML reports, failure screenshots, and trace recordings.
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section className={styles.section} style={{ backgroundColor: tokens.colorNeutralBackground2, borderRadius: '12px' }}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionDesc}>
            From solution export to verified quality in three straightforward steps.
          </p>
        </div>

        <div className={styles.stepsRow}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.cardTitle}>Connect or Upload Solution</div>
            <div className={styles.cardText}>
              Connect your Azure App Registration with Dataverse permissions, or upload an exported solution ZIP. The engine unpacks all entities and generates deep Markdown documentation.
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.cardTitle}>Author &amp; Review Scenarios</div>
            <div className={styles.cardText}>
              Chat with the AI assistant to inspect entity fields and automated workflows. Review and customize synthesized scenario cards with explicit preconditions, steps, and assertions.
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.cardTitle}>Execute &amp; Review Artifacts</div>
            <div className={styles.cardText}>
              Queue headless Playwright test suites. Watch real-time console execution logs, review test pass/fail metrics, download trace packages, and inspect failure screenshots.
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <div className={styles.ctaBanner}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
          Experience the Platform in Action
        </h2>
        <Text size={400} style={{ color: tokens.colorNeutralForeground2, maxWidth: '600px' }}>
          Launch the instant interactive demo sandbox to explore pre-loaded Dataverse solutions and test runs, or sign in to connect your team's Power Platform environment.
        </Text>
        <div className={styles.ctaRow} style={{ marginTop: '12px', marginBottom: 0 }}>
          <LoginButton
            triggerButton={
              <Button appearance="primary" size="large" className={styles.primaryCta}>
                Get Started Free
              </Button>
            }
          />
          <Button
            appearance="secondary"
            size="large"
            className={styles.secondaryCta}
            icon={demoLoading ? <Spinner size="tiny" /> : <SparkleRegular />}
            disabled={demoLoading}
            onClick={handleDemoClick}
          >
            {demoLoading ? 'Starting Demo...' : 'Explore Demo Sandbox'}
          </Button>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className={styles.footer}>
        <div>Power Platform &amp; Copilot QA Platform (`pp-qa`) • Enterprise Automated Verification</div>
        <div style={{ marginTop: '6px', opacity: 0.75 }}>
          Built with React 18, Microsoft Fluent UI v9, Node.js &amp; Playwright POM
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;

