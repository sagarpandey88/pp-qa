import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Field,
  Input,
  Badge,
  Spinner,
  Card,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  SparkleRegular,
  ArrowRightRegular,
  InfoRegular,
  OpenRegular,
  ShieldCheckmarkRegular,
  ChevronDownRegular,
  ChevronUpRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MicrosoftIcon } from '../components/auth/LoginButton';

const useStyles = makeStyles({
  container: {
    maxWidth: '860px',
    margin: '40px auto',
    padding: '0 24px 60px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerBox: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: tokens.colorNeutralForeground1,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '15px',
    color: tokens.colorNeutralForeground2,
    maxWidth: '680px',
    margin: '0 auto',
    lineHeight: '1.5',
  },
  primaryCard: {
    padding: '28px',
    borderRadius: '12px',
    border: `2px solid #0078d4`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorNeutralForeground1,
  },
  infoBanner: {
    padding: '14px 18px',
    borderRadius: '8px',
    backgroundColor: '#eff6fc',
    border: '1px solid #c7e0f4',
    color: '#004578',
    fontSize: '13px',
    lineHeight: '1.5',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  secondaryCard: {
    padding: '24px',
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
  },
  accordionToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
  },
  demoToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    marginBottom: '16px',
  },
  statusBox: {
    padding: '12px 16px',
    borderRadius: '6px',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
    gap: '12px',
  },
});

export const OnboardingPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Delegated flow state
  const [delegatedEnvUrl, setDelegatedEnvUrl] = useState('');
  const [connectingDelegated, setConnectingDelegated] = useState(false);

  // Manual / Service principal flow state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [profileName, setProfileName] = useState('Contoso Dev Environment');
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [manualEnvUrl, setManualEnvUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Attempt to pre-fill environment URL if configured on server
    apiClient
      .get('/auth/microsoft/status')
      .then((res) => {
        if (res.data?.environmentUrl) {
          setDelegatedEnvUrl(res.data.environmentUrl);
          setManualEnvUrl(res.data.environmentUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleDelegatedConnect = () => {
    const cleanUrl = delegatedEnvUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      alert('Please enter your Dataverse Environment URL (e.g., https://org.crm.dynamics.com).');
      return;
    }
    if (!cleanUrl.startsWith('https://')) {
      alert('Dataverse Environment URL must start with https://');
      return;
    }

    setConnectingDelegated(true);
    // Redirect to official Microsoft OAuth authorize endpoint with environment scope
    window.location.href = `/api/auth/microsoft/login?environmentUrl=${encodeURIComponent(cleanUrl)}`;
  };

  const fillDemoValues = () => {
    setProfileName('Demo Dataverse Sandbox');
    setTenantId('00000000-0000-0000-0000-000000000000');
    setClientId('11111111-2222-3333-4444-555555555555');
    setClientSecret('mock-secret-key-123');
    setManualEnvUrl('https://org-demo.crm.dynamics.com');
    setDelegatedEnvUrl('https://org-demo.crm.dynamics.com');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!tenantId || !clientId || !clientSecret || !manualEnvUrl) {
      setTestResult({
        success: false,
        message: 'Please provide Tenant ID, Client ID, Client Secret, and Environment URL.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/azure-profiles/test-connection', {
        tenantId,
        clientId,
        clientSecret,
        environmentUrl: manualEnvUrl,
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveManualProfile = async () => {
    if (!tenantId || !clientId || !clientSecret || !manualEnvUrl) {
      alert('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/azure-profiles', {
        profileName: profileName.trim() || 'Default Environment',
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        environmentUrl: manualEnvUrl.trim(),
        setActive: true,
      });

      navigate('/solutions');
    } catch (err: any) {
      alert(`Failed to save Azure profile: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBox}>
        <Badge appearance="filled" color="brand" style={{ marginBottom: '8px' }}>
          Step 1 of 1 • Workspace Setup
        </Badge>
        <h1 className={styles.title}>Connect Your Power Platform Environment</h1>
        <p className={styles.subtitle}>
          Welcome, <strong>{user?.displayName || 'QA Engineer'}</strong>. Connect your Dataverse environment to allow
          pp-qa to discover unmanaged solutions, parse tables &amp; cloud flows, and generate automated Playwright tests.
        </p>
      </div>

      {/* RECOMMENDED: Delegated User Access */}
      <div className={styles.primaryCard}>
        <div className={styles.cardHeaderRow}>
          <div>
            <div className={styles.cardTitle}>
              <ShieldCheckmarkRegular style={{ color: '#0078d4', fontSize: '24px' }} />
              Connect with Microsoft Account
            </div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2, marginTop: '4px', display: 'block' }}>
              Sign in with your user credentials. No Client Secrets or Application User registration required.
            </Text>
          </div>
          <Badge appearance="filled" color="brand">
            Recommended • Instant Setup
          </Badge>
        </div>

        <div className={styles.infoBanner}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <InfoRegular /> How Delegated Access works:
          </div>
          <div>
            pp-qa connects to Dataverse using your signed-in Microsoft Entra ID identity (<strong>{user?.email || 'Current Account'}</strong>).
            It uses your existing Power Platform permissions (System Administrator or System Customizer) to read solutions and metadata securely.
          </div>
        </div>

        <Field
          label="Dataverse Environment URL"
          hint="Format: https://<org-id>.crm.dynamics.com"
          required
        >
          <Input
            value={delegatedEnvUrl}
            onChange={(e, d) => setDelegatedEnvUrl(d.value)}
            placeholder="https://org368cdfbd.crm8.dynamics.com"
            size="large"
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
          <Button
            appearance="subtle"
            onClick={() => navigate('/solutions')}
          >
            Skip for now (Browse Offline)
          </Button>

          <Button
            appearance="primary"
            size="large"
            icon={connectingDelegated ? <Spinner size="tiny" /> : <MicrosoftIcon size={20} />}
            onClick={handleDelegatedConnect}
            disabled={connectingDelegated || !delegatedEnvUrl.trim()}
          >
            {connectingDelegated ? 'Redirecting to Microsoft...' : 'Connect with Microsoft Account'}
          </Button>
        </div>
      </div>

      {/* OPTIONAL / ADVANCED: Azure App Registration (Client Secret) */}
      <div className={styles.secondaryCard}>
        <div
          className={styles.accordionToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div>
            <Text weight="semibold" style={{ fontSize: '15px' }}>
              Advanced: Connect with Azure App Registration (Service Principal)
            </Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
              Use client credentials (Client ID &amp; Secret) for automated CI/CD service accounts.
            </Text>
          </div>
          <Button
            appearance="subtle"
            icon={showAdvanced ? <ChevronUpRegular /> : <ChevronDownRegular />}
            onClick={(e) => {
              e.stopPropagation();
              setShowAdvanced(!showAdvanced);
            }}
          >
            {showAdvanced ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showAdvanced && (
          <div style={{ marginTop: '20px' }}>
            <div className={styles.demoToolbar}>
              <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>
                Testing offline or don't have credentials yet?
              </Text>
              <Button
                size="small"
                appearance="subtle"
                icon={<SparkleRegular />}
                onClick={fillDemoValues}
              >
                Fill Simulated Sandbox Credentials
              </Button>
            </div>

            <div className={styles.formGrid}>
              <Field label="Environment Profile Name" required>
                <Input
                  value={profileName}
                  onChange={(e, d) => setProfileName(d.value)}
                  placeholder="e.g. Contoso QA Sandbox"
                />
              </Field>

              <Field label="Entra ID Directory (Tenant) ID" required>
                <Input
                  value={tenantId}
                  onChange={(e, d) => setTenantId(d.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                />
              </Field>

              <Field label="Application (Client) ID" required>
                <Input
                  value={clientId}
                  onChange={(e, d) => setClientId(d.value)}
                  placeholder="e.g. 11111111-2222-3333-4444-555555555555"
                />
              </Field>

              <Field
                label="Client Secret"
                hint="Stored securely using AES-256-GCM encryption in the database vault."
                required
              >
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e, d) => setClientSecret(d.value)}
                  placeholder="Enter client secret value"
                />
              </Field>

              <Field
                label="Dataverse Environment URL"
                hint="Format: https://<org-id>.crm.dynamics.com"
                required
              >
                <Input
                  value={manualEnvUrl}
                  onChange={(e, d) => setManualEnvUrl(d.value)}
                  placeholder="https://yourorg.crm.dynamics.com"
                />
              </Field>
            </div>

            {testResult && (
              <div
                className={styles.statusBox}
                style={{
                  backgroundColor: testResult.success ? '#dff6dd' : '#fde7e9',
                  color: testResult.success ? '#107c10' : '#a80000',
                  border: `1px solid ${testResult.success ? '#107c10' : '#a80000'}`,
                }}
              >
                {testResult.success ? (
                  <CheckmarkCircleRegular style={{ fontSize: '20px' }} />
                ) : (
                  <DismissCircleRegular style={{ fontSize: '20px' }} />
                )}
                <div>
                  <Text weight="semibold">{testResult.success ? 'Connection Successful!' : 'Connection Error'}</Text>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>{testResult.message}</div>
                </div>
              </div>
            )}

            <div className={styles.actionsRow}>
              <Button
                appearance="secondary"
                icon={testing ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                onClick={handleTestConnection}
                disabled={testing || saving}
              >
                {testing ? 'Testing OAuth...' : 'Test Connection'}
              </Button>

              <Button
                appearance="primary"
                icon={saving ? <Spinner size="tiny" /> : <ArrowRightRegular />}
                onClick={handleSaveManualProfile}
                disabled={saving || testing}
              >
                {saving ? 'Encrypting & Saving...' : 'Save & Launch Platform'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
