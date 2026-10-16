import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Badge,
} from '@fluentui/react-components';
import {
  SparkleRegular,
  PlugConnectedRegular,
  ArrowExitRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoginButton } from '../auth/LoginButton';

const useStyles = makeStyles({
  banner: {
    backgroundColor: '#fff4ce', // Soft warm yellow / warning notice
    color: '#3b3a39',
    borderBottom: '1px solid #fed9cc',
    padding: '8px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    zIndex: 100,
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-start',
    },
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badge: {
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionBtn: {
    fontSize: '12px',
    height: '28px',
  },
});

export const DemoBanner: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { isDemo, logout } = useAuth();

  if (!isDemo) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.leftGroup}>
        <Badge appearance="filled" color="warning" icon={<SparkleRegular />} className={styles.badge}>
          DEMO WORKSPACE
        </Badge>
        <Text weight="medium">
          You are exploring with simulated Dataverse solutions, AI scenario cards, and pre-recorded Playwright runs.
        </Text>
      </div>
      <div className={styles.rightGroup}>
        <Button
          size="small"
          appearance="primary"
          icon={<PlugConnectedRegular />}
          className={styles.actionBtn}
          onClick={() => navigate('/onboarding')}
        >
          Connect Your Dataverse
        </Button>
        <LoginButton
          appearance="outline"
          triggerButton={
            <Button size="small" appearance="outline" className={styles.actionBtn}>
              Sign In Live
            </Button>
          }
        />
        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowExitRegular />}
          className={styles.actionBtn}
          onClick={() => logout()}
        >
          Exit Demo
        </Button>
      </div>
    </div>
  );
};

