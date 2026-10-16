import React, { useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Badge,
  Button,
  Avatar,
  Tooltip,
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
  MenuDivider,
} from '@fluentui/react-components';
import {
  BotRegular,
  DatabaseCheckmarkRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  DesktopRegular,
  ArrowExitRegular,
  SettingsRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LoginButton } from '../auth/LoginButton';

const useStyles = makeStyles({
  header: {
    height: '56px',
    backgroundColor: '#0078d4', // Microsoft 365 Blue
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.14)',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoIcon: {
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '17px',
    fontWeight: '600',
    letterSpacing: '-0.2px',
  },
  subtitle: {
    fontSize: '12px',
    opacity: 0.85,
    marginLeft: '6px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badge: {
    fontSize: '11px',
    textTransform: 'uppercase',
  },
  headerButton: {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
    ':hover:active': {
      backgroundColor: 'rgba(255, 255, 255, 0.35)',
      color: '#ffffff',
    },
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 10px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff',
    },
  },
  userMenuHeader: {
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '200px',
  },
});

interface HeaderProps {
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleChat, isChatOpen }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { themeMode, effectiveTheme, setThemeMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [dbMode, setDbMode] = useState<string>('connecting...');

  useEffect(() => {
    // Check health & DB mode
    apiClient
      .get('/health')
      .then((res) => {
        setDbMode(res.data.databaseMode === 'postgresql-live' ? 'PostgreSQL' : 'In-Memory Fallback');
      })
      .catch(() => setDbMode('Offline'));
  }, []);

  const themeLabel =
    themeMode === 'system'
      ? `System (${effectiveTheme === 'dark' ? 'Dark' : 'Light'})`
      : effectiveTheme === 'dark'
      ? 'Dark'
      : 'Light';

  return (
    <header className={styles.header}>
      <div className={styles.leftSection} onClick={() => navigate('/solutions')}>
        <div className={styles.logoIcon}>⚡</div>
        <Text className={styles.title}>Power Platform &amp; Copilot QA</Text>
        <span className={styles.subtitle}>(pp-qa)</span>
      </div>

      <div className={styles.rightSection}>
        <Tooltip content={`Database: ${dbMode}`} relationship="label">
          <Badge
            appearance="filled"
            color={dbMode.includes('PostgreSQL') ? 'success' : 'informative'}
            icon={<DatabaseCheckmarkRegular />}
            className={styles.badge}
          >
            {dbMode}
          </Badge>
        </Tooltip>

        {/* AI Assistant Drawer Toggle */}
        <Button
          appearance="subtle"
          className={styles.headerButton}
          icon={<BotRegular />}
          onClick={onToggleChat}
        >
          {isChatOpen ? 'Close AI' : 'AI Assistant'}
        </Button>

        {/* Dark Mode Toggle Button with System Theme Default & Menu */}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip
              content={`Theme: ${themeLabel}. Click to toggle, or open menu for options.`}
              relationship="label"
            >
              <Button
                appearance="subtle"
                className={styles.headerButton}
                icon={effectiveTheme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
                aria-label={`Toggle theme, current is ${themeLabel}`}
              >
                {effectiveTheme === 'dark' ? 'Light' : 'Dark'}
              </Button>
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem
                icon={<DesktopRegular />}
                onClick={() => setThemeMode('system')}
              >
                System Default {themeMode === 'system' ? '✓' : ''}
              </MenuItem>
              <MenuItem
                icon={<WeatherSunnyRegular />}
                onClick={() => setThemeMode('light')}
              >
                Light Mode {themeMode === 'light' ? '✓' : ''}
              </MenuItem>
              <MenuItem
                icon={<WeatherMoonRegular />}
                onClick={() => setThemeMode('dark')}
              >
                Dark Mode {themeMode === 'dark' ? '✓' : ''}
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={effectiveTheme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
                onClick={toggleTheme}
              >
                Quick Toggle ({effectiveTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark'})
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>

        {/* User Account / Sign Out / Sign In */}
        {user ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                className={styles.userButton}
                icon={<Avatar name={user.displayName} size={24} color="colorful" />}
              >
                <Text weight="semibold" style={{ color: '#ffffff' }}>
                  {user.displayName}
                </Text>
                {user.isDemo && (
                  <Badge size="small" appearance="filled" color="warning" style={{ marginLeft: '6px' }}>
                    DEMO
                  </Badge>
                )}
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <div className={styles.userMenuHeader}>
                  <Text weight="semibold">{user.displayName}</Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {user.email}
                  </Text>
                  {user.isDemo && (
                    <Badge size="small" appearance="tint" color="warning" style={{ marginTop: '4px' }}>
                      Interactive Sandbox Mode
                    </Badge>
                  )}
                </div>
                <MenuDivider />
                {user.isDemo && (
                  <MenuItem
                    icon={<SettingsRegular />}
                    onClick={() => navigate('/onboarding')}
                  >
                    Connect Live Environment
                  </MenuItem>
                )}
                <MenuItem
                  icon={<SettingsRegular />}
                  onClick={() => navigate('/settings')}
                >
                  Settings &amp; Vault
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<ArrowExitRegular />}
                  onClick={() => logout()}
                >
                  {user.isDemo ? 'Exit Demo' : 'Sign Out'}
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : (
          <LoginButton
            appearance="subtle"
            triggerButton={
              <Button
                appearance="subtle"
                className={styles.headerButton}
                icon={<PersonRegular />}
              >
                Sign In
              </Button>
            }
          />
        )}
      </div>
    </header>
  );
};

export default Header;
