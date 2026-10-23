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
  BotRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';
import { useAiModel } from '../../context/AiModelContext';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '12px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  activeModelBanner: {
    padding: '10px 14px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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

export interface ByokModalProps {
  onKeysUpdated?: () => void;
  triggerButton?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ByokModal: React.FC<ByokModalProps> = ({
  onKeysUpdated,
  triggerButton,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const styles = useStyles();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (newVal: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(newVal);
    setInternalOpen(newVal);
  };

  const { modelConfig, setProvider, refreshByokKeys: syncGlobalKeys, getShortModelLabel } = useAiModel();
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
    if (isOpen) fetchKeys();
  }, [isOpen]);

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
      await syncGlobalKeys();
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
      await syncGlobalKeys();
      if (onKeysUpdated) onKeysUpdated();
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const azureInfo = keys.find((k) => k.provider === 'azure_openai');
  const openaiInfo = keys.find((k) => k.provider === 'openai');
  const geminiInfo = keys.find((k) => k.provider === 'gemini');

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => setIsOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {triggerButton || (
          <Button appearance="secondary" icon={<KeyRegular />}>
            Manage BYOK Keys
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: '620px', width: '100%' }}>
        <DialogBody>
          <DialogTitle>Bring Your Own Key (BYOK) AI Vault</DialogTitle>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: '4px' }}>
            Enter your personal or enterprise AI keys. All keys are encrypted at rest with AES-256-GCM.
          </Text>

          {/* Unified active model status */}
          <div className={styles.activeModelBanner} style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BotRegular style={{ color: tokens.colorBrandForeground1 }} />
              <div>
                <Text weight="semibold" size={200}>Active AI Model (All Screens):</Text>{' '}
                <Text size={200}>{getShortModelLabel()}</Text>
              </div>
            </div>
            <Badge appearance="tint" color="brand">Unified Engine</Badge>
          </div>

          <DialogContent className={styles.container}>
            {/* Azure OpenAI Section */}
            <div className={styles.providerRow} style={{ border: azureInfo?.isConfigured ? '1px solid #0078d4' : undefined }}>
              <div className={styles.headerRow}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SparkleRegular style={{ color: '#0078d4' }} />
                    <strong>Azure OpenAI Service</strong>
                    {modelConfig.provider === 'azure_openai' && (
                      <Badge size="small" appearance="filled" color="brand">Active Engine</Badge>
                    )}
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
                <Field label="Deployment Name" required>
                  <Input
                    placeholder="e.g. gpt-4o, gpt-4"
                    value={azureDeployment}
                    onChange={(e, data) => setAzureDeployment(data.value)}
                  />
                </Field>
              </div>

              {azureTestMsg && (
                <div style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '4px', backgroundColor: azureTestMsg.includes('success') ? '#dff6dd' : '#fde7e9', color: azureTestMsg.includes('success') ? '#107c41' : '#a80000' }}>
                  {azureTestMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<PlugConnectedRegular />}
                  onClick={handleTestAzure}
                  disabled={azureTesting || !azureKey || !azureEndpoint}
                >
                  {azureTesting ? 'Testing...' : 'Test Connection'}
                </Button>
                {azureInfo?.isConfigured && modelConfig.provider !== 'azure_openai' && (
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={() => setProvider('azure_openai')}
                  >
                    Set Active
                  </Button>
                )}
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
                  disabled={savingProv === 'azure_openai' || !azureKey || !azureEndpoint || !azureDeployment}
                >
                  {savingProv === 'azure_openai' ? <Spinner size="tiny" /> : 'Save Azure Key'}
                </Button>
              </div>
            </div>

            {/* OpenAI Section */}
            <div className={styles.providerRow}>
              <div className={styles.headerRow}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SparkleRegular style={{ color: '#10a37f' }} />
                    <strong>OpenAI Direct API</strong>
                    {modelConfig.provider === 'openai' && (
                      <Badge size="small" appearance="filled" color="brand">Active Engine</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                    Direct access to GPT-4o, GPT-4o-mini, o3-mini, and o1
                  </div>
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
                    disabled={savingProv === 'openai' || !openaiKey}
                  >
                    {savingProv === 'openai' ? <Spinner size="tiny" /> : 'Save'}
                  </Button>
                </div>
              </Field>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {openaiInfo?.isConfigured && modelConfig.provider !== 'openai' && (
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={() => setProvider('openai')}
                  >
                    Set Active
                  </Button>
                )}
                {openaiInfo?.isConfigured && (
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={() => handleDelete('openai')}
                  >
                    Remove Key
                  </Button>
                )}
              </div>
            </div>

            {/* Google Gemini Section */}
            <div className={styles.providerRow}>
              <div className={styles.headerRow}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SparkleRegular style={{ color: '#1a73e8' }} />
                    <strong>Google Gemini API</strong>
                    {modelConfig.provider === 'gemini' && (
                      <Badge size="small" appearance="filled" color="brand">Active Engine</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                    Direct access to Gemini 2.0 Flash, Gemini 1.5 Pro, and Gemini 2.5 Pro
                  </div>
                </div>
                <Badge
                  appearance="filled"
                  color={geminiInfo?.isConfigured ? 'success' : 'informative'}
                  icon={geminiInfo?.isConfigured ? <CheckmarkRegular /> : undefined}
                >
                  {geminiInfo?.isConfigured ? `Configured (${geminiInfo.keyHint})` : 'Not Configured'}
                </Badge>
              </div>

              <Field label="Gemini API Key (AIzaSy...)">
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
                    disabled={savingProv === 'gemini' || !geminiKey}
                  >
                    {savingProv === 'gemini' ? <Spinner size="tiny" /> : 'Save'}
                  </Button>
                </div>
              </Field>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {geminiInfo?.isConfigured && modelConfig.provider !== 'gemini' && (
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={() => setProvider('gemini')}
                  >
                    Set Active
                  </Button>
                )}
                {geminiInfo?.isConfigured && (
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<DeleteRegular />}
                    onClick={() => handleDelete('gemini')}
                  >
                    Remove Key
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
