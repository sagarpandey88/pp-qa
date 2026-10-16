import React, { useEffect, useState } from 'react';
import {
  Title3,
  Title2,
  Text,
  Card,
  CardHeader,
  Button,
  Badge,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Spinner,
  Input,
  Field,
  Avatar,
  TabList,
  Tab,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  DeleteRegular,
  CheckmarkRegular,
  KeyRegular,
  DatabaseRegular,
  SparkleRegular,
  EyeRegular,
  EyeOffRegular,
  DesktopRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  PersonRegular,
  ArrowExitRegular,
  ShieldCheckmarkRegular,
  AddRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
import { AzureAppWizardDialog } from '../components/auth/AzureAppWizardDialog';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LoginButton } from '../components/auth/LoginButton';
import { MfaSessionDialog } from '../components/runner/MfaSessionDialog';

const useStyles = makeStyles({
  container: {
    padding: '24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  pageHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionNav: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  card: {
    padding: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  gridTwoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '16px',
  },
  gridThreeColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  providerCard: {
    padding: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  providerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  themeCard: {
    padding: '16px',
    borderRadius: '8px',
    border: `2px solid transparent`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'all 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  themeCardActive: {
    border: `2px solid ${tokens.colorBrandBackground}`,
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  encryptionCallout: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
  },
  accountBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  accountInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
});

export const SettingsPage: React.FC = () => {
  const styles = useStyles();
  const { themeMode, effectiveTheme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();

  // Active filter tab
  const [activeSection, setActiveSection] = useState<'all' | 'azure' | 'ai' | 'theme' | 'account'>('all');

  // Azure App Profiles state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // BYOK AI state
  const [byokKeys, setByokKeys] = useState<any[]>([]);
  const [loadingByok, setLoadingByok] = useState(true);
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  // Azure OpenAI state
  const [azureKey, setAzureKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureDeployment, setAzureDeployment] = useState('gpt-4o');
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [azureTesting, setAzureTesting] = useState(false);
  const [azureTestResult, setAzureTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Custom / preferred model state
  const [defaultOpenAiModel, setDefaultOpenAiModel] = useState(() => {
    return localStorage.getItem('ppqa_default_model_openai') || 'gpt-4o';
  });
  const [defaultGeminiModel, setDefaultGeminiModel] = useState(() => {
    return localStorage.getItem('ppqa_default_model_gemini') || 'gemini-2.0-flash';
  });

  const handleDefaultOpenAiModelChange = (val: string) => {
    const trimmed = val.trim();
    setDefaultOpenAiModel(val);
    localStorage.setItem('ppqa_default_model_openai', trimmed);
    try {
      const activeRaw = localStorage.getItem('ppqa_active_model_config');
      const active = activeRaw ? JSON.parse(activeRaw) : { provider: 'openai' };
      if (active.provider === 'openai') {
        localStorage.setItem('ppqa_active_model_config', JSON.stringify({ provider: 'openai', model: trimmed }));
      }
    } catch {}
  };

  const handleDefaultGeminiModelChange = (val: string) => {
    const trimmed = val.trim();
    setDefaultGeminiModel(val);
    localStorage.setItem('ppqa_default_model_gemini', trimmed);
    try {
      const activeRaw = localStorage.getItem('ppqa_active_model_config');
      const active = activeRaw ? JSON.parse(activeRaw) : { provider: 'gemini' };
      if (active.provider === 'gemini') {
        localStorage.setItem('ppqa_active_model_config', JSON.stringify({ provider: 'gemini', model: trimmed }));
      }
    } catch {}
  };

  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const res = await apiClient.get('/azure-profiles');
      setProfiles(res.data);
    } catch (err) {
      console.error('Failed to load Azure profiles', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchByokKeys = async () => {
    try {
      setLoadingByok(true);
      const res = await apiClient.get('/byok');
      setByokKeys(res.data);
      const az = res.data.find((k: any) => k.provider === 'azure_openai');
      if (az) {
        if (az.endpoint && !azureEndpoint) setAzureEndpoint(az.endpoint);
        if (az.deployment && !azureDeployment) setAzureDeployment(az.deployment);
      }
    } catch (err) {
      console.error('Failed to load BYOK keys', err);
    } finally {
      setLoadingByok(false);
    }
  };

  // Runner Authentication state
  const [runnerEmail, setRunnerEmail] = useState('');
  const [runnerPassword, setRunnerPassword] = useState('');
  const [showRunnerPassword, setShowRunnerPassword] = useState(false);
  const [runnerEnvUrl, setRunnerEnvUrl] = useState('');
  const [runnerHasPassword, setRunnerHasPassword] = useState(false);
  const [savingRunnerAuth, setSavingRunnerAuth] = useState(false);
  const [runnerAuthSaved, setRunnerAuthSaved] = useState(false);

  const fetchRunnerCredentials = async () => {
    try {
      const res = await apiClient.get('/runs/auth/credentials');
      if (res.data) {
        setRunnerEmail(res.data.email || '');
        setRunnerHasPassword(!!res.data.hasPassword);
        setRunnerEnvUrl(res.data.environmentUrl || '');
      }
    } catch (e) {
      console.warn('Could not load runner auth credentials', e);
    }
  };

  const handleSaveRunnerCredentials = async () => {
    try {
      setSavingRunnerAuth(true);
      await apiClient.post('/runs/auth/credentials', {
        email: runnerEmail,
        password: runnerPassword || undefined,
        environmentUrl: runnerEnvUrl,
      });
      setRunnerAuthSaved(true);
      setRunnerPassword('');
      setRunnerHasPassword(true);
      setTimeout(() => setRunnerAuthSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save runner credentials: ${err.message}`);
    } finally {
      setSavingRunnerAuth(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchByokKeys();
    fetchRunnerCredentials();
  }, []);

  const handleActivateProfile = async (id: string) => {
    try {
      await apiClient.put(`/azure-profiles/${id}/activate`);
      fetchProfiles();
    } catch (err) {
      console.error('Failed to activate profile', err);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Azure App profile?')) return;
    try {
      await apiClient.delete(`/azure-profiles/${id}`);
      fetchProfiles();
    } catch (err) {
      console.error('Failed to delete profile', err);
    }
  };

  const handleSaveByok = async (
    provider: 'openai' | 'azure_openai' | 'gemini',
    apiKey: string,
    extra?: { endpoint?: string; deployment?: string; apiVersion?: string }
  ) => {
    if (!apiKey) return;
    setSavingProvider(provider);
    try {
      await apiClient.post('/byok', { provider, apiKey, ...extra });
      if (provider === 'openai') setOpenaiKey('');
      if (provider === 'azure_openai') setAzureKey('');
      if (provider === 'gemini') setGeminiKey('');
      await fetchByokKeys();
    } catch (err: any) {
      alert(`Failed to save ${provider} API key: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTestAzureByok = async () => {
    if (!azureKey || !azureEndpoint) {
      alert('Please enter both Azure OpenAI Key and Endpoint to test connection.');
      return;
    }
    setAzureTesting(true);
    setAzureTestResult(null);
    try {
      const res = await apiClient.post('/byok/test', {
        provider: 'azure_openai',
        apiKey: azureKey,
        endpoint: azureEndpoint,
        deployment: azureDeployment || 'gpt-4o',
      });
      setAzureTestResult(res.data);
    } catch (err: any) {
      setAzureTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Validation failed',
      });
    } finally {
      setAzureTesting(false);
    }
  };

  const handleDeleteByok = async (provider: 'openai' | 'azure_openai' | 'gemini') => {
    if (!window.confirm(`Are you sure you want to remove your ${provider.toUpperCase()} API key?`)) return;
    try {
      await apiClient.delete(`/byok/${provider}`);
      await fetchByokKeys();
    } catch (err) {
      console.error(`Failed to delete ${provider} key`, err);
    }
  };

  const azureInfo = byokKeys.find((k) => k.provider === 'azure_openai');
  const openaiInfo = byokKeys.find((k) => k.provider === 'openai');
  const geminiInfo = byokKeys.find((k) => k.provider === 'gemini');

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <Title2>Settings &amp; Configuration</Title2>
        <Text style={{ color: tokens.colorNeutralForeground3 }}>
          Configure connected Azure environments, AI model vault credentials, theme preferences, and your account session.
        </Text>
      </div>

      {/* Quick Filter Sub-Tabs */}
      <div className={styles.sectionNav}>
        <TabList
          selectedValue={activeSection}
          onTabSelect={(_, data) => setActiveSection(data.value as any)}
        >
          <Tab value="all">All Settings</Tab>
          <Tab value="azure" icon={<DatabaseRegular />}>Azure App &amp; Dataverse</Tab>
          <Tab value="ai" icon={<SparkleRegular />}>AI &amp; BYOK Keys</Tab>
          <Tab value="theme" icon={<WeatherMoonRegular />}>Appearance &amp; Theme</Tab>
          <Tab value="account" icon={<PersonRegular />}>Account &amp; Sign Out</Tab>
        </TabList>
      </div>

      {/* SECTION 1: Azure App & Dataverse Connection */}
      {(activeSection === 'all' || activeSection === 'azure') && (
        <section className={styles.section} id="section-azure">
          <div className={styles.sectionHeader}>
            <div>
              <Title3>Azure App &amp; Dataverse Connections</Title3>
              <Text style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                Manage Microsoft Entra ID registered app credentials and connected Dataverse environments.
              </Text>
            </div>
            <AzureAppWizardDialog onProfileSaved={fetchProfiles} />
          </div>

          <div className={styles.card}>
            {loadingProfiles ? (
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
                <Spinner label="Loading profiles..." />
              </div>
            ) : profiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <DatabaseRegular style={{ fontSize: '48px', color: '#0078d4', marginBottom: '12px' }} />
                <Title3 style={{ display: 'block', fontSize: '18px' }}>No Environments Connected Yet</Title3>
                <Text style={{ color: tokens.colorNeutralForeground3, display: 'block', margin: '8px 0 16px' }}>
                  Connect an Azure App Registration with Dataverse permissions to inspect solutions and execute tests.
                </Text>
                <AzureAppWizardDialog onProfileSaved={fetchProfiles} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Profile Name</TableHeaderCell>
                    <TableHeaderCell>Environment URL</TableHeaderCell>
                    <TableHeaderCell>Tenant ID</TableHeaderCell>
                    <TableHeaderCell>Client ID</TableHeaderCell>
                    <TableHeaderCell>Secret Hint</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <TableCellLayout media={<PlugConnectedRegular />}>
                          <strong>{p.profileName}</strong>
                        </TableCellLayout>
                      </TableCell>
                      <TableCell>{p.environmentUrl}</TableCell>
                      <TableCell><code>{p.tenantId}</code></TableCell>
                      <TableCell><code>{p.clientId}</code></TableCell>
                      <TableCell><code>{p.clientSecretHint}</code></TableCell>
                      <TableCell>
                        <Badge
                          appearance="filled"
                          color={p.isActive ? 'success' : 'subtle'}
                        >
                          {p.isActive ? 'Active' : 'Standby'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!p.isActive && (
                            <Button
                              size="small"
                              appearance="subtle"
                              icon={<CheckmarkRegular />}
                              onClick={() => handleActivateProfile(p.id)}
                            >
                              Activate
                            </Button>
                          )}
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<DeleteRegular />}
                            onClick={() => handleDeleteProfile(p.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Test Runner Authentication Card */}
          <div className={styles.card} style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <Title3 style={{ fontSize: '16px' }}>Playwright Test Runner Sign-In Credentials (Prestep)</Title3>
                <Text style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                  Provide test user credentials for automated Microsoft Entra ID sign-in before executing tests on Power Platform and Dynamics 365.
                </Text>
              </div>
              {runnerHasPassword && (
                <Badge appearance="filled" color="success">Credentials Active</Badge>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <Field label="Test User Email / Username (MS_AUTH_EMAIL)">
                <Input
                  value={runnerEmail}
                  onChange={(_, d) => setRunnerEmail(d.value)}
                  placeholder="qa-tester@contoso.onmicrosoft.com"
                />
              </Field>

              <Field label={runnerHasPassword ? "Password (Configured - enter new to change)" : "Test User Password (MS_USER_PASSWORD)"}>
                <Input
                  type={showRunnerPassword ? 'text' : 'password'}
                  value={runnerPassword}
                  onChange={(_, d) => setRunnerPassword(d.value)}
                  placeholder={runnerHasPassword ? "••••••••••••" : "Enter password"}
                  contentAfter={
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={showRunnerPassword ? <EyeOffRegular /> : <EyeRegular />}
                      onClick={() => setShowRunnerPassword(!showRunnerPassword)}
                    />
                  }
                />
              </Field>

              <Field label="Default App / CRM URL (Optional)">
                <Input
                  value={runnerEnvUrl}
                  onChange={(_, d) => setRunnerEnvUrl(d.value)}
                  placeholder="https://org.crm.dynamics.com"
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <MfaSessionDialog onSessionUpdated={fetchRunnerCredentials} />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {runnerAuthSaved && (
                  <Text style={{ color: '#107c10', fontWeight: 600 }}>✓ Runner credentials saved successfully</Text>
                )}
                <Button
                  appearance="primary"
                  disabled={savingRunnerAuth}
                  onClick={handleSaveRunnerCredentials}
                >
                  {savingRunnerAuth ? 'Saving...' : 'Save Runner Credentials'}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: AI Configuration & BYOK Setting */}
      {(activeSection === 'all' || activeSection === 'ai') && (
        <section className={styles.section} id="section-byok">
          <div className={styles.sectionHeader}>
            <div>
              <Title3>AI Models &amp; Bring Your Own Key (BYOK)</Title3>
              <Text style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                Configure personal or organizational API keys. All keys are encrypted at rest with hardware-grade AES-256-GCM.
              </Text>
            </div>
            <div className={styles.encryptionCallout}>
              <ShieldCheckmarkRegular style={{ color: '#0078d4', fontSize: '18px' }} />
              <span>AES-256-GCM Encrypted at rest in secure PostgreSQL vault</span>
            </div>
          </div>

          <div className={styles.gridTwoColumns}>
            {/* Azure OpenAI Service Configuration */}
            <div className={styles.providerCard} style={{ border: azureInfo?.isConfigured ? '1px solid #0078d4' : undefined }}>
              <div className={styles.providerHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SparkleRegular style={{ color: '#0078d4', fontSize: '20px' }} />
                    <Text weight="semibold" size={400}>Azure OpenAI Service</Text>
                  </div>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: '4px' }}>
                    Enterprise dedicated GPT-4o / o1 deployment within your Microsoft Azure tenant.
                  </Text>
                </div>
                <Badge
                  appearance="filled"
                  color={azureInfo?.isConfigured ? 'success' : 'informative'}
                  icon={azureInfo?.isConfigured ? <CheckmarkRegular /> : undefined}
                >
                  {azureInfo?.isConfigured ? `Configured (${azureInfo.keyHint})` : 'Not Configured'}
                </Badge>
              </div>

              <Field label="Azure OpenAI API Key" required>
                <Input
                  type={showAzureKey ? 'text' : 'password'}
                  placeholder="32-character Azure OpenAI API Key"
                  value={azureKey}
                  onChange={(_, data) => setAzureKey(data.value)}
                  contentAfter={
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={showAzureKey ? <EyeOffRegular /> : <EyeRegular />}
                      onClick={() => setShowAzureKey(!showAzureKey)}
                      aria-label="Toggle password visibility"
                    />
                  }
                />
              </Field>

              <Field label="Azure Resource Endpoint URL" hint="Format: https://<your-resource-name>.openai.azure.com/" required>
                <Input
                  placeholder="https://your-resource.openai.azure.com/"
                  value={azureEndpoint}
                  onChange={(_, data) => setAzureEndpoint(data.value)}
                />
              </Field>

              <Field label="Model Deployment Name" hint="The deployment name defined in Azure OpenAI Studio (e.g. gpt-4o)">
                <Input
                  placeholder="gpt-4o"
                  value={azureDeployment}
                  onChange={(_, data) => setAzureDeployment(data.value)}
                />
              </Field>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-8px' }}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>Quick Presets:</Text>
                {['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'o1'].map((preset) => (
                  <Badge
                    key={preset}
                    appearance={azureDeployment === preset ? 'filled' : 'outline'}
                    color={azureDeployment === preset ? 'brand' : 'informative'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setAzureDeployment(preset)}
                  >
                    {preset}
                  </Badge>
                ))}
              </div>

              {azureTestResult && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: azureTestResult.success ? '#dff6dd' : '#fde7e9',
                    color: azureTestResult.success ? '#107c10' : '#a80000',
                    border: `1px solid ${azureTestResult.success ? '#107c10' : '#a80000'}`,
                  }}
                >
                  {azureTestResult.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap', gap: '8px' }}>
                <Button
                  appearance="secondary"
                  icon={azureTesting ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                  onClick={handleTestAzureByok}
                  disabled={azureTesting || !azureKey || !azureEndpoint}
                >
                  {azureTesting ? 'Testing...' : 'Test Connection'}
                </Button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {azureInfo?.isConfigured && (
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      onClick={() => handleDeleteByok('azure_openai')}
                    >
                      Remove Key
                    </Button>
                  )}
                  <Button
                    appearance="primary"
                    onClick={() =>
                      handleSaveByok('azure_openai', azureKey, {
                        endpoint: azureEndpoint,
                        deployment: azureDeployment,
                      })
                    }
                    disabled={!azureKey || savingProvider === 'azure_openai'}
                  >
                    {savingProvider === 'azure_openai' ? 'Saving...' : 'Save Azure Key'}
                  </Button>
                </div>
              </div>
            </div>

            {/* OpenAI Configuration */}
            <div className={styles.providerCard}>
              <div className={styles.providerHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SparkleRegular style={{ color: '#0078d4', fontSize: '20px' }} />
                    <Text weight="semibold" size={400}>OpenAI API Key</Text>
                  </div>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: '4px' }}>
                    Powers GPT-4o autonomous test synthesis and o3-mini reasoning agents.
                  </Text>
                </div>
                <Badge
                  appearance="filled"
                  color={openaiInfo?.isConfigured ? 'success' : 'informative'}
                  icon={openaiInfo?.isConfigured ? <CheckmarkRegular /> : undefined}
                >
                  {openaiInfo?.isConfigured ? `Configured (${openaiInfo.keyHint})` : 'Not Configured'}
                </Badge>
              </div>

              <Field label="OpenAI API Key (sk-...)">
                <Input
                  type={showOpenaiKey ? 'text' : 'password'}
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(_, data) => setOpenaiKey(data.value)}
                  contentAfter={
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={showOpenaiKey ? <EyeOffRegular /> : <EyeRegular />}
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      aria-label="Toggle password visibility"
                    />
                  }
                />
              </Field>

              <Field label="Custom / Preferred Model Name (e.g. gpt-4o, gpt-4.5-preview, ft:...)">
                <Input
                  placeholder="gpt-4o"
                  value={defaultOpenAiModel}
                  onChange={(_, data) => handleDefaultOpenAiModelChange(data.value)}
                />
              </Field>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-8px' }}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>Quick Presets:</Text>
                {['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1'].map((preset) => (
                  <Badge
                    key={preset}
                    appearance={defaultOpenAiModel === preset ? 'filled' : 'outline'}
                    color={defaultOpenAiModel === preset ? 'brand' : 'informative'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleDefaultOpenAiModelChange(preset)}
                  >
                    {preset}
                  </Badge>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <Button
                  appearance="primary"
                  onClick={() => handleSaveByok('openai', openaiKey)}
                  disabled={!openaiKey || savingProvider === 'openai'}
                >
                  {savingProvider === 'openai' ? 'Saving...' : 'Save OpenAI Key'}
                </Button>
                {openaiInfo?.isConfigured && (
                  <Button
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={() => handleDeleteByok('openai')}
                  >
                    Remove Key
                  </Button>
                )}
              </div>
            </div>

            {/* Google Gemini Configuration */}
            <div className={styles.providerCard}>
              <div className={styles.providerHeader}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SparkleRegular style={{ color: '#0078d4', fontSize: '20px' }} />
                    <Text weight="semibold" size={400}>Google Gemini API Key</Text>
                  </div>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: '4px' }}>
                    Powers Gemini 2.0 Flash multimodal synthesis and 1.5 Pro deep solution analysis.
                  </Text>
                </div>
                <Badge
                  appearance="filled"
                  color={geminiInfo?.isConfigured ? 'success' : 'informative'}
                  icon={geminiInfo?.isConfigured ? <CheckmarkRegular /> : undefined}
                >
                  {geminiInfo?.isConfigured ? `Configured (${geminiInfo.keyHint})` : 'Not Configured'}
                </Badge>
              </div>

              <Field label="Gemini API Key (AIza...)">
                <Input
                  type={showGeminiKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(_, data) => setGeminiKey(data.value)}
                  contentAfter={
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={showGeminiKey ? <EyeOffRegular /> : <EyeRegular />}
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      aria-label="Toggle password visibility"
                    />
                  }
                />
              </Field>

              <Field label="Custom / Preferred Model Name (e.g. gemini-2.0-flash, gemini-2.5-pro, gemini-1.5-pro)">
                <Input
                  placeholder="gemini-2.0-flash"
                  value={defaultGeminiModel}
                  onChange={(_, data) => handleDefaultGeminiModelChange(data.value)}
                />
              </Field>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-8px' }}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>Quick Presets:</Text>
                {['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.5-pro'].map((preset) => (
                  <Badge
                    key={preset}
                    appearance={defaultGeminiModel === preset ? 'filled' : 'outline'}
                    color={defaultGeminiModel === preset ? 'brand' : 'informative'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleDefaultGeminiModelChange(preset)}
                  >
                    {preset}
                  </Badge>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <Button
                  appearance="primary"
                  onClick={() => handleSaveByok('gemini', geminiKey)}
                  disabled={!geminiKey || savingProvider === 'gemini'}
                >
                  {savingProvider === 'gemini' ? 'Saving...' : 'Save Gemini Key'}
                </Button>
                {geminiInfo?.isConfigured && (
                  <Button
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={() => handleDeleteByok('gemini')}
                  >
                    Remove Key
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: Appearance & Theme Settings */}
      {(activeSection === 'all' || activeSection === 'theme') && (
        <section className={styles.section} id="section-theme">
          <div className={styles.sectionHeader}>
            <div>
              <Title3>Appearance &amp; Theme</Title3>
              <Text style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                Choose your preferred interface theme. By default, the application automatically matches your operating system setting.
              </Text>
            </div>
            <Badge appearance="tint" color="brand">
              Current Mode: {themeMode === 'system' ? `System (${effectiveTheme})` : effectiveTheme}
            </Badge>
          </div>

          <div className={styles.gridThreeColumns}>
            {/* System Default Option */}
            <div
              className={`${styles.themeCard} ${themeMode === 'system' ? styles.themeCardActive : ''}`}
              onClick={() => setThemeMode('system')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DesktopRegular style={{ fontSize: '24px', color: '#0078d4' }} />
                  <Text weight="semibold">System Default</Text>
                </div>
                {themeMode === 'system' && (
                  <Badge appearance="filled" color="brand" icon={<CheckmarkRegular />}>Active</Badge>
                )}
              </div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Automatically matches your device operating system dark or light preference. (Default)
              </Text>
            </div>

            {/* Light Mode Option */}
            <div
              className={`${styles.themeCard} ${themeMode === 'light' ? styles.themeCardActive : ''}`}
              onClick={() => setThemeMode('light')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WeatherSunnyRegular style={{ fontSize: '24px', color: '#ffb900' }} />
                  <Text weight="semibold">Light Mode</Text>
                </div>
                {themeMode === 'light' && (
                  <Badge appearance="filled" color="brand" icon={<CheckmarkRegular />}>Active</Badge>
                )}
              </div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Classic clean Microsoft 365 light theme with standard contrast.
              </Text>
            </div>

            {/* Dark Mode Option */}
            <div
              className={`${styles.themeCard} ${themeMode === 'dark' ? styles.themeCardActive : ''}`}
              onClick={() => setThemeMode('dark')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WeatherMoonRegular style={{ fontSize: '24px', color: '#8888ff' }} />
                  <Text weight="semibold">Dark Mode</Text>
                </div>
                {themeMode === 'dark' && (
                  <Badge appearance="filled" color="brand" icon={<CheckmarkRegular />}>Active</Badge>
                )}
              </div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                High-contrast dark theme designed to reduce eye strain in low-light environments.
              </Text>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: User Account & Sign Out */}
      {(activeSection === 'all' || activeSection === 'account') && (
        <section className={styles.section} id="section-account">
          <div className={styles.sectionHeader}>
            <div>
              <Title3>User Account &amp; Authentication</Title3>
              <Text style={{ display: 'block', color: tokens.colorNeutralForeground3, marginTop: '2px' }}>
                Manage your Microsoft 365 / Entra ID corporate account session.
              </Text>
            </div>
            <Badge appearance="filled" color={user ? 'success' : 'warning'}>
              {user ? 'Authenticated Session' : 'Guest / Signed Out'}
            </Badge>
          </div>

          <div className={styles.card}>
            {user ? (
              <div className={styles.accountBox}>
                <div className={styles.accountInfo}>
                  <Avatar name={user.displayName} size={48} color="colorful" />
                  <div>
                    <Text weight="semibold" size={400} style={{ display: 'block' }}>
                      {user.displayName}
                    </Text>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                      {user.email}
                    </Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground4, display: 'block', marginTop: '2px' }}>
                      Microsoft Entra ID Corporate Account
                    </Text>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Button
                    appearance="secondary"
                    icon={<ArrowExitRegular />}
                    onClick={() => logout()}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <PersonRegular style={{ fontSize: '40px', color: '#0078d4', marginBottom: '10px' }} />
                <Title3 style={{ display: 'block', fontSize: '16px' }}>Not Signed In</Title3>
                <Text style={{ color: tokens.colorNeutralForeground3, display: 'block', margin: '6px 0 16px' }}>
                  Sign in with your Microsoft 365 or Entra ID corporate account to authenticate operations.
                </Text>
                <LoginButton
                  appearance="primary"
                  triggerButton={
                    <Button appearance="primary" icon={<PersonRegular />}>
                      Sign In with Microsoft
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;
