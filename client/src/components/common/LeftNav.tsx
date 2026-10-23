import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Tooltip,
  Text,
  Button,
} from '@fluentui/react-components';
import {
  FolderOpenRegular,
  TableRegular,
  DocumentTextRegular,
  DocumentBulletListRegular,
  PlayCircleRegular,
  SettingsRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  navContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    userSelect: 'none',
    flexShrink: 0,
    zIndex: 10,
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    height: '42px',
    padding: '0 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },
  activeNavItem: {
    backgroundColor: 'rgba(116, 39, 116, 0.1)',
    color: '#742774',
    fontWeight: '600',
    borderLeft: '4px solid #742774',
    paddingLeft: '8px',
    ':hover': {
      backgroundColor: 'rgba(116, 39, 116, 0.16)',
      color: '#742774',
    },
  },
  iconWrapper: {
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
  },
  label: {
    fontSize: '13.5px',
    letterSpacing: '-0.1px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footer: {
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  collapseBtn: {
    minWidth: '32px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
});

interface LeftNavProps {
  expanded: boolean;
  onToggle: () => void;
}

export const LeftNav: React.FC<LeftNavProps> = ({ expanded, onToggle }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      key: 'solutions',
      path: '/solutions',
      label: 'Solutions',
      icon: <FolderOpenRegular />,
      matcher: (p: string) => p === '/solutions' || p === '/',
    },
    {
      key: 'components',
      path: '/components',
      label: 'Components',
      icon: <TableRegular />,
      matcher: (p: string) => p.startsWith('/components'),
    },
    {
      key: 'markdown',
      path: '/markdown',
      label: 'Markdown Specs',
      icon: <DocumentTextRegular />,
      matcher: (p: string) => p.startsWith('/markdown'),
    },
    {
      key: 'test-suites',
      path: '/test-suites',
      label: 'Test Suites',
      icon: <DocumentBulletListRegular />,
      matcher: (p: string) => p.startsWith('/test-suites'),
    },
    {
      key: 'runs',
      path: '/runs',
      label: 'Live Runs & Reports',
      icon: <PlayCircleRegular />,
      matcher: (p: string) => p.startsWith('/runs'),
    },
    {
      key: 'settings',
      path: '/settings',
      label: 'Azure & AI Settings',
      icon: <SettingsRegular />,
      matcher: (p: string) => p.startsWith('/settings'),
    },
  ];

  return (
    <nav
      className={styles.navContainer}
      style={{ width: expanded ? '240px' : '56px' }}
      aria-label="Power Platform QA Navigation"
    >
      <div className={styles.menuList}>
        {navItems.map((item) => {
          const isActive = item.matcher(location.pathname);
          const buttonElement = (
            <button
              key={item.key}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.activeNavItem : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={styles.iconWrapper}>{item.icon}</span>
              {expanded && <span className={styles.label}>{item.label}</span>}
            </button>
          );

          if (!expanded) {
            return (
              <Tooltip
                key={item.key}
                content={item.label}
                relationship="label"
                positioning="after"
              >
                {buttonElement}
              </Tooltip>
            );
          }

          return buttonElement;
        })}
      </div>

      <div className={styles.footer}>
        <Tooltip
          content={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          relationship="label"
          positioning="after"
        >
          <Button
            appearance="subtle"
            size="small"
            className={styles.collapseBtn}
            icon={expanded ? <ChevronLeftRegular /> : <ChevronRightRegular />}
            onClick={onToggle}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          />
        </Tooltip>
      </div>
    </nav>
  );
};

