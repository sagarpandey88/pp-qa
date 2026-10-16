import React from 'react';
import {
  TabList,
  Tab,
  makeStyles,
  tokens,
  SelectTabData,
  SelectTabEvent,
} from '@fluentui/react-components';
import {
  FolderOpenRegular,
  DocumentBulletListRegular,
  PlayCircleRegular,
  SettingsRegular,
} from '@fluentui/react-icons';
import { useNavigate, useLocation } from 'react-router-dom';

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '0 20px',
  },
  tabList: {
    minHeight: '44px',
  },
});

export const Navigation: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedValue = () => {
    const path = location.pathname;
    if (path.startsWith('/test-suites')) return 'test-suites';
    if (path.startsWith('/runs')) return 'runs';
    if (path.startsWith('/settings')) return 'settings';
    return 'solutions';
  };

  const handleTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    switch (data.value) {
      case 'solutions':
        navigate('/solutions');
        break;
      case 'test-suites':
        navigate('/test-suites');
        break;
      case 'runs':
        navigate('/runs');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/solutions');
    }
  };

  return (
    <div className={styles.container}>
      <TabList
        selectedValue={getSelectedValue()}
        onTabSelect={handleTabSelect}
        className={styles.tabList}
      >
        <Tab value="solutions" icon={<FolderOpenRegular />}>
          Solutions &amp; Metadata
        </Tab>
        <Tab value="test-suites" icon={<DocumentBulletListRegular />}>
          Test Suites &amp; Authoring
        </Tab>
        <Tab value="runs" icon={<PlayCircleRegular />}>
          Live Runs &amp; Reports
        </Tab>
        <Tab value="settings" icon={<SettingsRegular />}>
          Azure &amp; AI Settings
        </Tab>
      </TabList>
    </div>
  );
};

