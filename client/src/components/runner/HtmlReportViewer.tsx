import React, { useState } from 'react';
import {
  Button,
  Title3,
  Text,
  Badge,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  OpenRegular,
  DocumentTableRegular,
  ArrowClockwiseRegular,
  InfoRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    height: '700px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iframe: {
    width: '100%',
    flex: 1,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    borderRadius: '6px',
    backgroundColor: '#ffffff',
  },
  stateBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    gap: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

interface HtmlReportViewerProps {
  reportUrl?: string;
  runStatus?: string;
}

export const HtmlReportViewer: React.FC<HtmlReportViewerProps> = ({
  reportUrl = '/reports/index.html',
  runStatus,
}) => {
  const styles = useStyles();
  const [reloadKey, setReloadKey] = useState(0);

  const isRunning = runStatus === 'running' || runStatus === 'queued';
  const hasReport = !isRunning && !!reportUrl;

  const handleOpenNewWindow = () => {
    window.open(reportUrl, '_blank');
  };

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DocumentTableRegular style={{ fontSize: '20px', color: '#0078d4' }} />
          <Title3 style={{ fontSize: '16px', margin: 0 }}>Playwright HTML Test Report</Title3>
          {hasReport && (
            <Badge size="small" appearance="filled" color="success">
              Report Ready
            </Badge>
          )}
          {isRunning && (
            <Badge size="small" appearance="filled" color="warning">
              Generating...
            </Badge>
          )}
        </div>

        <div className={styles.actions}>
          {hasReport && (
            <>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowClockwiseRegular />}
                onClick={handleRefresh}
              >
                Reload Report
              </Button>

              <Button
                size="small"
                appearance="secondary"
                icon={<OpenRegular />}
                onClick={handleOpenNewWindow}
              >
                Open in New Window
              </Button>
            </>
          )}
        </div>
      </div>

      {isRunning ? (
        <div className={styles.stateBox}>
          <Spinner size="large" label="Test execution is currently running in headless Chromium..." />
          <Text style={{ color: tokens.colorNeutralForeground3, maxWidth: '500px', marginTop: '8px' }}>
            The official Playwright HTML report containing test steps, assertions, network traces, and timing metrics will automatically load once this run completes.
          </Text>
        </div>
      ) : hasReport ? (
        <iframe
          key={reloadKey}
          src={reportUrl}
          title="Playwright HTML Report"
          className={styles.iframe}
        />
      ) : (
        <div className={styles.stateBox}>
          <InfoRegular style={{ fontSize: '40px', color: '#0078d4' }} />
          <Title3 style={{ fontSize: '16px', margin: 0 }}>No Report Available</Title3>
          <Text style={{ color: tokens.colorNeutralForeground3, maxWidth: '450px' }}>
            No Playwright HTML report was generated for this test run. Please inspect the Live Streaming Console Log tab for error messages and stack traces.
          </Text>
        </div>
      )}
    </div>
  );
};
