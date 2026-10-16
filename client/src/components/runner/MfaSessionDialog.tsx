import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Badge,
  Text,
  Spinner,
  Textarea,
  Field,
  makeStyles,
  tokens,
  TabList,
  Tab,
} from '@fluentui/react-components';
import {
  ShieldKeyholeRegular,
  CheckmarkCircleRegular,
  OpenRegular,
  DismissRegular,
  ArrowUploadRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../../api/client';

const useStyles = makeStyles({
  statusBox: {
    padding: '14px 16px',
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  callout: {
    padding: '12px 14px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderLeft: `4px solid ${tokens.colorBrandBackground}`,
    fontSize: '13px',
    lineHeight: '1.4',
  },
  activeNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#107c10',
    fontWeight: 600,
  },
});

interface MfaSessionDialogProps {
  triggerButton?: React.ReactElement;
  onSessionUpdated?: () => void;
}

export const MfaSessionDialog: React.FC<MfaSessionDialogProps> = ({
  triggerButton,
  onSessionUpdated,
}) => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'interactive' | 'import'>('interactive');

  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/runs/auth/session-status');
      setSessionStatus(res.data);
      setCapturing(res.data.isCapturing);
      if (res.data.captureMessage) {
        setStatusMessage(res.data.captureMessage);
      }
    } catch (e) {
      console.warn('Could not check session status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatus();
    }
  }, [open]);

  // Polling during active capture
  useEffect(() => {
    let interval: any;
    if (open && capturing) {
      interval = setInterval(async () => {
        try {
          const res = await apiClient.get('/runs/auth/session-status');
          setSessionStatus(res.data);
          if (res.data.captureMessage) {
            setStatusMessage(res.data.captureMessage);
          }
          if (!res.data.isCapturing) {
            setCapturing(false);
            if (res.data.captureStatus === 'success') {
              onSessionUpdated?.();
            }
          }
        } catch (e) {}
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [open, capturing]);

  const handleLaunchCapture = async () => {
    try {
      setCapturing(true);
      setStatusMessage('Opening browser window on screen. Please sign in and approve MFA...');
      const res = await apiClient.post('/runs/auth/launch-session-capture', {});
      if (res.data?.message) {
        setStatusMessage(res.data.message);
      }
    } catch (err: any) {
      setCapturing(false);
      alert(`Failed to launch browser: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleCancelCapture = async () => {
    try {
      await apiClient.post('/runs/auth/cancel-session-capture', {});
      setCapturing(false);
      fetchStatus();
    } catch (err) {}
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      alert('Please paste a valid storageState JSON object.');
      return;
    }
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      await apiClient.post('/runs/auth/import-session', { sessionData: parsed });
      alert('Session state imported successfully!');
      setImportJson('');
      fetchStatus();
      onSessionUpdated?.();
    } catch (err: any) {
      alert(`Import failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {triggerButton || (
          <Button
            appearance="outline"
            icon={<ShieldKeyholeRegular />}
          >
            {sessionStatus?.hasActiveSession ? 'MFA Session Active' : 'Authenticate Session (MFA)'}
          </Button>
        )}
      </DialogTrigger>

      <DialogSurface style={{ maxWidth: '580px', width: '100%' }}>
        <DialogBody>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldKeyholeRegular style={{ fontSize: '20px', color: '#0078d4' }} />
            Microsoft Entra ID &amp; MFA Session Manager
          </DialogTitle>

          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            {/* Status Overview */}
            <div className={styles.statusBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold">Current Session State:</Text>
                {sessionStatus?.hasActiveSession ? (
                  <Badge appearance="filled" color="success">
                    Active &amp; Ready
                  </Badge>
                ) : (
                  <Badge appearance="filled" color="warning">
                    No Session Stored
                  </Badge>
                )}
              </div>

              {sessionStatus?.hasActiveSession ? (
                <div style={{ fontSize: '13px', color: '#107c10', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckmarkCircleRegular />
                  <span>Authenticated storageState ready ({sessionStatus.sessionFile})</span>
                </div>
              ) : (
                <Text style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                  Headless runs require an authenticated session when Microsoft Entra ID enforces Multi-Factor Authentication (MFA).
                </Text>
              )}

              {sessionStatus?.lastCapturedAt && (
                <Text style={{ fontSize: '11px', color: tokens.colorNeutralForeground4 }}>
                  Last Captured: {new Date(sessionStatus.lastCapturedAt).toLocaleString()}
                </Text>
              )}
            </div>

            <TabList
              selectedValue={activeTab}
              onTabSelect={(_, d) => setActiveTab(d.value as any)}
            >
              <Tab value="interactive" icon={<OpenRegular />}>
                Interactive Sign-In (Recommended)
              </Tab>
              <Tab value="import" icon={<ArrowUploadRegular />}>
                Import StorageState JSON
              </Tab>
            </TabList>

            {activeTab === 'interactive' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className={styles.callout}>
                  <Text weight="semibold">How Interactive MFA Capture Works:</Text>
                  <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    <li>Click <strong>Launch Microsoft Sign-In</strong> below.</li>
                    <li>A browser window will open displaying your Microsoft Entra ID sign-in screen.</li>
                    <li>Enter your credentials, approve your MFA challenge, and click <strong>Yes</strong> to "Stay signed in?".</li>
                    <li>Once Power Apps / Dynamics loads, this dialog captures your session cookies and closes the browser automatically.</li>
                  </ol>
                </div>

                {capturing ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f3f9fd', borderRadius: '8px', border: '1px solid #c7e0f4' }}>
                    <Spinner size="medium" label="Interactive sign-in window is open..." />
                    <Text style={{ display: 'block', marginTop: '10px', fontSize: '13px', color: '#004578' }}>
                      {statusMessage}
                    </Text>
                    <div style={{ marginTop: '16px' }}>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<DismissRegular />}
                        onClick={handleCancelCapture}
                      >
                        Cancel Sign-In
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sessionStatus?.captureStatus === 'success' && (
                      <div className={styles.activeNotice}>
                        <CheckmarkCircleRegular style={{ fontSize: '18px' }} />
                        <span>MFA session captured successfully! You can now run headless test suites.</span>
                      </div>
                    )}

                    <Button
                      appearance="primary"
                      icon={<OpenRegular />}
                      onClick={handleLaunchCapture}
                    >
                      {sessionStatus?.hasActiveSession ? 'Re-Authenticate & Refresh MFA Session' : 'Launch Microsoft Sign-In Window'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', color: tokens.colorNeutralForeground2, display: 'flex', gap: '6px' }}>
                  <InfoRegular style={{ color: '#0078d4', flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    If you already exported a Playwright <code>storageState.json</code> or are testing on a remote server, paste the JSON content below:
                  </span>
                </div>

                <Field label="Storage State JSON">
                  <Textarea
                    rows={6}
                    value={importJson}
                    onChange={(_, d) => setImportJson(d.value)}
                    placeholder='{"cookies": [...], "origins": [...]}'
                  />
                </Field>

                <Button
                  appearance="primary"
                  disabled={importing || !importJson.trim()}
                  onClick={handleImport}
                >
                  {importing ? 'Importing...' : 'Save Storage State'}
                </Button>
              </div>
            )}
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

