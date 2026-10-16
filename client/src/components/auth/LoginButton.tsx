import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  Text,
  Badge,
} from '@fluentui/react-components';
import { PersonRegular, InfoRegular, ArrowRightRegular } from '@fluentui/react-icons';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const MicrosoftIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 21 21" style={{ marginRight: '6px', flexShrink: 0 }}>
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

interface LoginButtonProps {
  onLoginSuccess?: (user: any) => void;
  triggerButton?: React.ReactElement;
  appearance?: 'subtle' | 'primary' | 'secondary' | 'outline';
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  onLoginSuccess,
  triggerButton,
  appearance = 'subtle',
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('spadmin@contoso.onmicrosoft.com');
  const [displayName, setDisplayName] = useState('Dev QA Engineer');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { login } = useAuth();

  const handleTriggerClick = async () => {
    setCheckingStatus(true);
    try {
      const res = await apiClient.get('/auth/microsoft/status');
      if (res.data?.isConfigured) {
        // Directly redirect to official Microsoft Login Screen!
        window.location.href = '/api/auth/microsoft/login';
        return;
      }
    } catch (e) {
      // Fallback to dialog on error
    } finally {
      setCheckingStatus(false);
    }
    // If not configured in .env, open dialog with guidance & dev account option
    setOpen(true);
  };

  const handleDevLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      alert('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', {
        email: trimmedEmail,
        displayName: displayName.trim() || trimmedEmail.split('@')[0],
      });
      login(res.data.user, res.data.token);

      // Check whether user has configured an Azure App Profile
      const statusRes = await apiClient
        .get('/azure-profiles/status', {
          headers: { Authorization: `Bearer ${res.data.token}` },
        })
        .catch(() => ({ data: { hasConfiguredProfile: false } }));

      const hasProfile = !!statusRes.data?.hasConfiguredProfile;

      if (onLoginSuccess) {
        onLoginSuccess(res.data.user);
      }
      setOpen(false);

      if (!hasProfile) {
        navigate('/onboarding');
      } else {
        navigate('/solutions');
      }
    } catch (err: any) {
      alert(`Login failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span onClick={handleTriggerClick}>
        {triggerButton || (
          <Button appearance={appearance} icon={<MicrosoftIcon />}>
            Sign in with Microsoft
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MicrosoftIcon size={20} />
              Microsoft Entra ID Sign-In
            </DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#f3f2f1',
                  fontSize: '13px',
                  lineHeight: '1.45',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <InfoRegular style={{ color: '#0078d4', fontSize: '18px', flexShrink: 0 }} />
                <div>
                  <Text weight="semibold">Official Microsoft Login Screen Integration</Text>
                  <div style={{ marginTop: '4px', opacity: 0.9 }}>
                    To redirect to Microsoft's live login screen (<code>login.microsoftonline.com</code>), set{' '}
                    <code>MS_CLIENT_ID</code> and <code>MS_CLIENT_SECRET</code> in your <code>server/.env</code> file.
                  </div>
                </div>
              </div>

              <Text>
                You can also test with a simulated Microsoft 365 work account below for local development:
              </Text>

              <Field label="Microsoft Work or School Email" required>
                <Input
                  value={email}
                  onChange={(e, data) => setEmail(data.value)}
                  placeholder="user@yourdomain.onmicrosoft.com"
                />
              </Field>
              <Field label="Display Name">
                <Input
                  value={displayName}
                  onChange={(e, data) => setDisplayName(data.value)}
                  placeholder="First Last"
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleDevLogin}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In with Dev Account'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default LoginButton;
