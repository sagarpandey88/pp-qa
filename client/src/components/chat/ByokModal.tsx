import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  Button,
  Badge,
  Text,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import {
  KeyRegular,
  DeleteRegular,
  SparkleRegular,
  CheckmarkRegular,
  DismissRegular,
  PlugConnectedRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '12px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  providerRow: {
    padding: '16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    '@media (max-width: 500px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

interface ByokModalProps {
  onKeysUpdated?: () => void;
  triggerButton?: React.ReactElement;
}

export const ByokModal: React.FC<ByokModalProps> = ({ onKeysUpdated, triggerButton }) => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<any[]>([]);

  // Azure OpenAI state
  const [azureKey, setAzureKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureDeployment, setAzureDeployment] = useState('gpt-4o');
  const [azureTesting, setAzureTesting] = useState(false);
  const [azureTestMsg, setAzureTestMsg] = useState<string | null>(null);

  // OpenAI state
  const [openaiKey, setOpenaiKey] = useState('');

  // Gemini state
  const [geminiKey, setGeminiKey] = useState('');

  const [savingProv, setSavingProv] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await apiClient.get('/byok');
      setKeys(res.data);
      const az = res.data.find((k: any) => k.provider === 'azure_openai');
      if (az) {
        if (az.endpoint && !azureEndpoint) setAzureEndpoint(az.endpoint);
        if (az.deployment && !azureDeployment) setAzureDeployment(az.deployment);
      }
    } catch (err) {
      console.error('Failed to load BYOK keys', err);
    }
  };

  useEffect(() => {
    if (open) fetchKeys();
  }, [open]);

  const handleSave = async (
    provider: 'openai' | 'azure_openai' | 'gemini',
    apiKey: string,
    extra?: any
  ) => {
    if (!apiKey) return;
    setSavingProv(provider);
    try {
      await apiClient.post('/byok', { provider, apiKey, ...extra });
      if (provider === 'openai') setOpenaiKey('');
      if (provider === 'azure_openai') setAzureKey('');
      if (provider === 'gemini') setGeminiKey('');
      await fetchKeys();
      if (onKeysUpdated) onKeysUpdated();
    } catch (err: any) {
      alert(`Failed to save key: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingProv(null);
    }
  };

  const handleTestAzure = async () => {
    if (!azureKey || !azureEndpoint) {
      alert('Please provide both Azure OpenAI API Key and Endpoint URL to test connection.');
      return;
    }
    setAzureTesting(true);
    setAzureTestMsg(null);
    try {
      const res = await apiClient.post('/byok/test', {
        provider: 'azure_openai',
        apiKey: azureKey,
        endpoint: azureEndpoint,
        deployment: azureDeployment || 'gpt-4o',
      });
      setAzureTestMsg(res.data.message);
    } catch (err: any) {
      setAzureTestMsg(`Test failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setAzureTesting(false);
    }
  };

  const handleDelete = async (provider: 'openai' | 'azure_openai' | 'gemini') => {
    try {
      await apiClient.delete(`/byok/${provider}`);
      await fetchKeys();
      if (onKeysUpdated) onKeysUpdated();
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const azureInfo = keys.find((k) => k.provider === 'azure_openai');
  const openaiInfo = keys.find((k) => k.provider === 'openai');
  const geminiInfo = keys.find((k) => k.provider === 'gemini');

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {triggerButton || (
          <Button appearance="secondary" icon={<KeyRegular />}>
            Manage BYOK Keys
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: '580px', width: '100%' }}>
        <DialogBody>
          <DialogTitle>Bring Your Own Key (BYOK) AI Vault</DialogTitle>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: '4px' }}>
            Enter your personal or enterprise AI keys. All keys are encrypted at rest with AES-256-GCM.
          </Text>

          <DialogContent className={styles.container}>
            {/* Azure OpenAI Section */}
            <div className={styles.providerRow} style={{ border: azureInfo?.isConfigured ? '1px solid #0078d4' : undefined }}>
              <div className={styles.headerRow}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SparkleRegular style={{ color: '#0078d4' }} />
                    <strong>Azure OpenAI Service</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                    Enterprise dedicated endpoint with private data governance
                  </div>
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
                  type="password"
                  placeholder="32-character Azure OpenAI Key"
                  value={azureKey}
                  onChange={(e, data) => setAzureKey(data.value)}
                />
              </Field>

              <div className={styles.gridTwo}>
                <Field label="Endpoint URL" required>
                  <Input
                    placeholder="https://<resource>.openai.azure.com/"
                    value={azureEndpoint}
                    onChange={(e, data) => setAzureEndpoint(data.value)}
                  />
                </Field>
                <Field label="Deployment Name">
                  <Input
                    placeholder="gpt-4o"
                    value={azureDeployment}
                    onChange={(e, data) => setAzureDeployment(data.value)}
                  />
                </Field>
              </div>

              {azureTestMsg && (
                <div style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '4px', backgroundColor: tokens.colorNeutralBackground3 }}>
                  {azureTestMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <Button
                  size="small"
                  appearance="secondary"
                  icon={azureTesting ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                  onClick={handleTestAzure}
                  disabled={azureTesting || !azureKey || !azureEndpoint}
                >
                  {azureTesting ? 'Testing...' : 'Test Connection'}
                </Button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {azureInfo?.isConfigured && (
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      onClick={() => handleDelete('azure_openai')}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    size="small"
                    appearance="primary"
                    onClick={() =>
                      handleSave('azure_openai', azureKey, {
                        endpoint: azureEndpoint,
                        deployment: azureDeployment,
                      })
                    }
                    disabled={!azureKey || savingProv === 'azure_openai'}
                  >
                    {savingProv === 'azure_openai' ? 'Saving...' : 'Save Azure Key'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Standard OpenAI Section */}
            <div className={styles.providerRow}>
              <div className={styles.headerRow}>
                <div>
                  <strong>OpenAI API Key</strong>
                  <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>Powers direct OpenAI API models</div>
                </div>
                <Badge
                  appearance="filled"
                  color={openaiInfo?.isConfigured ? 'success' : 'informative'}
                  icon={openaiInfo?.isConfigured ? <CheckmarkRegular /> : undefined}
                >
                  {openaiInfo?.isConfigured ? `Configured (${openaiInfo.keyHint})` : 'Not Configured'}
                </Badge>
              </div>

              <div className={styles.inputRow}>
                <Input
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e, data) => setOpenaiKey(data.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  appearance="primary"
                  onClick={() => handleSave('openai', openaiKey)}
                  disabled={!openaiKey || savingProv === 'openai'}
                >
                  {savingProv === 'openai' ? 'Saving...' : 'Save'}
                </Button>
                {openaiInfo?.isConfigured && (
                  <Button
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={() => handleDelete('openai')}
                  />
                )}
              </div>
            </div>

            {/* Gemini Section */}
            <div className={styles.providerRow}>
              <div className={styles.headerRow}>
                <div>
                  <strong>Google Gemini API Key</strong>
                  <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>Powers Gemini 2.0 Flash and 1.5 Pro</div>
                </div>
                <Badge
                  appearance="filled"
                  color={geminiInfo?.isConfigured ? 'success' : 'informative'}
                  icon={geminiInfo?.isConfigured ? <CheckmarkRegular /> : undefined}
                >
                  {geminiInfo?.isConfigured ? `Configured (${geminiInfo.keyHint})` : 'Not Configured'}
                </Badge>
              </div>

              <div className={styles.inputRow}>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e, data) => setGeminiKey(data.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  appearance="primary"
                  onClick={() => handleSave('gemini', geminiKey)}
                  disabled={!geminiKey || savingProv === 'gemini'}
                >
                  {savingProv === 'gemini' ? 'Saving...' : 'Save'}
                </Button>
                {geminiInfo?.isConfigured && (
                  <Button
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={() => handleDelete('gemini')}
                  />
                )}
              </div>
            </div>
          </DialogContent>

          <DialogActions style={{ marginTop: '16px' }}>
            <Button appearance="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
