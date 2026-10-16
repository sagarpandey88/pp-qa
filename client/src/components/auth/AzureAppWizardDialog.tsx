import React, { useState } from 'react';
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
  Spinner,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  SparkleRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';

const useStyles = makeStyles({
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '12px',
  },
  statusBox: {
    padding: '10px 14px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  demoBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '4px',
  },
});

interface AzureAppWizardDialogProps {
  onProfileSaved?: () => void;
  triggerButton?: React.ReactElement;
}

export const AzureAppWizardDialog: React.FC<AzureAppWizardDialogProps> = ({
  onProfileSaved,
  triggerButton,
}) => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState('Contoso Dev Environment');
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [environmentUrl, setEnvironmentUrl] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fillDemoValues = () => {
    setProfileName('Demo Dataverse Sandbox');
    setTenantId('00000000-0000-0000-0000-000000000000');
    setClientId('11111111-2222-3333-4444-555555555555');
    setClientSecret('mock-secret');
    setEnvironmentUrl('https://org-demo.crm.dynamics.com');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!tenantId || !clientId || !clientSecret || !environmentUrl) {
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
        environmentUrl,
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId || !clientId || !clientSecret || !environmentUrl) {
      alert('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/azure-profiles', {
        profileName,
        tenantId,
        clientId,
        clientSecret,
        environmentUrl,
        setActive: true,
      });
      setOpen(false);
      if (onProfileSaved) {
        onProfileSaved();
      }
    } catch (err: any) {
      alert(`Failed to save Azure profile: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {triggerButton || (
          <Button appearance="primary" icon={<PlugConnectedRegular />}>
            Connect Azure App
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface style={{ maxWidth: '560px', width: '100%' }}>
        <DialogBody>
          <DialogTitle>Azure App &amp; Dataverse Onboarding Wizard</DialogTitle>
          <div className={styles.demoBar}>
            <Button
              appearance="subtle"
              size="small"
              icon={<SparkleRegular />}
              onClick={fillDemoValues}
            >
              Fill Demo Credentials
            </Button>
          </div>
          <DialogContent className={styles.dialogContent}>
            <Text size={200} style={{ color: '#666' }}>
              Connect your Microsoft Entra ID Registered App to enable automated unmanaged solution export and Dataverse metadata inspection.
            </Text>

            <Field label="Environment Profile Name" required>
              <Input
                value={profileName}
                onChange={(e, data) => setProfileName(data.value)}
                placeholder="e.g. Sales Dev Sandbox"
              />
            </Field>

            <Field label="Directory (Tenant) ID" required>
              <Input
                value={tenantId}
                onChange={(e, data) => setTenantId(data.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </Field>

            <Field label="Application (Client) ID" required>
              <Input
                value={clientId}
                onChange={(e, data) => setClientId(data.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </Field>

            <Field label="Client Secret" required>
              <Input
                type="password"
                value={clientSecret}
                onChange={(e, data) => setClientSecret(data.value)}
                placeholder="Azure App Client Secret Value"
              />
            </Field>

            <Field label="Dataverse Environment URL" required>
              <Input
                value={environmentUrl}
                onChange={(e, data) => setEnvironmentUrl(data.value)}
                placeholder="https://org.crm.dynamics.com"
              />
            </Field>

            {testResult && (
              <div className={styles.statusBox}>
                {testResult.success ? (
                  <CheckmarkCircleRegular style={{ color: tokens.colorPaletteGreenForeground1, fontSize: '20px' }} />
                ) : (
                  <DismissCircleRegular style={{ color: tokens.colorPaletteRedForeground1, fontSize: '20px' }} />
                )}
                <Text size={200} weight={testResult.success ? 'semibold' : 'regular'}>
                  {testResult.message}
                </Text>
              </div>
            )}
          </DialogContent>

          <DialogActions style={{ marginTop: '16px' }}>
            <Button
              appearance="secondary"
              onClick={handleTestConnection}
              disabled={testing || saving}
              icon={testing ? <Spinner size="tiny" /> : undefined}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button appearance="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={saving || testing}
            >
              {saving ? 'Saving...' : 'Save & Activate'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
