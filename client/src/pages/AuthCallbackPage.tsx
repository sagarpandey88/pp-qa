import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Spinner,
  Text,
  makeStyles,
  tokens,
  Card,
  Button,
} from '@fluentui/react-components';
import { DismissCircleRegular, ArrowLeftRegular } from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';

const useStyles = makeStyles({
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    padding: '36px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '460px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
  errorBox: {
    color: '#a80000',
    backgroundColor: '#fde7e9',
    border: '1px solid #a80000',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
});

export const AuthCallbackPage: React.FC = () => {
  const styles = useStyles();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    const email = params.get('email');
    const displayName = params.get('name') || (email ? email.split('@')[0] : 'QA Engineer');
    const hasProfile = params.get('hasProfile') === 'true';
    const err = params.get('error');

    if (err) {
      setErrorMsg(decodeURIComponent(err));
      return;
    }

    if (token && email) {
      login({ email, displayName }, token);
      if (!hasProfile) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/solutions', { replace: true });
      }
    } else {
      setErrorMsg('No authentication token received from Microsoft login.');
    }
  }, [params, navigate, login]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {errorMsg ? (
          <>
            <div className={styles.errorBox}>
              <DismissCircleRegular style={{ fontSize: '24px' }} />
              <div>
                <Text weight="semibold">Sign-In Failed</Text>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>{errorMsg}</div>
              </div>
            </div>
            <Button
              appearance="primary"
              icon={<ArrowLeftRegular />}
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </>
        ) : (
          <>
            <Spinner size="large" label="Completing Microsoft sign-in..." />
            <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
              Verifying your Microsoft 365 / Entra ID corporate account and establishing your session...
            </Text>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;

