import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title3,
  Text,
  TabList,
  Tab,
  Button,
  makeStyles,
  tokens,
  Badge,
} from '@fluentui/react-components';
import {
  PlayCircleRegular,
  DocumentBulletListRegular,
  CameraRegular,
  DocumentTableRegular,
  ArrowClockwiseRegular,
  SparkleRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
import { TestRunDashboard } from '../components/runner/TestRunDashboard';
import { LiveLogConsole } from '../components/runner/LiveLogConsole';
import { ArtifactGallery } from '../components/runner/ArtifactGallery';
import { HtmlReportViewer } from '../components/runner/HtmlReportViewer';
import { MfaSessionDialog } from '../components/runner/MfaSessionDialog';

const useStyles = makeStyles({
  page: {
    padding: '24px 32px',
    maxWidth: '1400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '12px',
  },
  subTabList: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export const LiveRunsPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'console' | 'artifacts' | 'report'>('console');

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/runs');
      setRuns(res.data);
      if (res.data.length > 0 && !selectedRun) {
        setSelectedRun(res.data[0]);
      } else if (selectedRun) {
        // Refresh selected run details
        const updated = res.data.find((r: any) => r.id === selectedRun.id);
        if (updated) {
          setSelectedRun(updated);
        } else {
          setSelectedRun(res.data.length > 0 ? res.data[0] : null);
        }
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    // Poll every 5s if a run is running
    const interval = setInterval(() => {
      const isAnyRunning = runs.some(r => r.status === 'running' || r.status === 'queued');
      if (isAnyRunning) {
        fetchRuns();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRun = (run: any) => {
    setSelectedRun(run);
  };

  const handleDeleteRuns = async (runIds: string[]) => {
    try {
      await apiClient.post('/runs/delete-batch', { runIds });
      // If currently selected run is deleted, clear or pick next
      if (selectedRun && runIds.includes(selectedRun.id)) {
        const remaining = runs.filter((r) => !runIds.includes(r.id));
        setSelectedRun(remaining.length > 0 ? remaining[0] : null);
      }
      await fetchRuns();
    } catch (err) {
      console.error('Failed to delete runs', err);
      throw err;
    }
  };

  const isSelectedRunning = selectedRun && (selectedRun.status === 'running' || selectedRun.status === 'queued');

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <Title3>Headless Playwright Execution &amp; Live Reports</Title3>
          <Text style={{ display: 'block', color: '#666', marginTop: '2px' }}>
            Real-time SSE terminal streaming, dual storageState authentication, failure traces, and HTML reports.
          </Text>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <MfaSessionDialog onSessionUpdated={fetchRuns} />
          <Button
            appearance="subtle"
            icon={<ArrowClockwiseRegular />}
            onClick={fetchRuns}
          >
            Refresh
          </Button>
        </div>
      </div>

      <TestRunDashboard
        runs={runs}
        selectedRunId={selectedRun?.id}
        onSelectRun={handleSelectRun}
        onDeleteRuns={handleDeleteRuns}
        loading={loading}
      />

      {selectedRun && (
        <div className={styles.detailSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Title3 style={{ fontSize: '18px', margin: 0 }}>
                Run Details: {selectedRun.suite_title || 'Playwright Test Suite'}
              </Title3>
              <Badge
                appearance="filled"
                color={isSelectedRunning ? 'warning' : selectedRun.status === 'passed' ? 'success' : 'danger'}
              >
                {selectedRun.status}
              </Badge>
              {selectedRun.duration_ms > 0 && (
                <Badge appearance="outline">{selectedRun.duration_ms}ms</Badge>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(selectedRun.test_suite_id || selectedRun.testSuiteId) && (
                <Button
                  appearance={selectedRun.status === 'failed' ? 'primary' : 'secondary'}
                  icon={<SparkleRegular style={{ color: selectedRun.status === 'failed' ? '#ffffff' : '#0078d4' }} />}
                  onClick={() => {
                    const suiteId = selectedRun.test_suite_id || selectedRun.testSuiteId;
                    const errorSnippet = (selectedRun.logs || '')
                      .split('\n')
                      .filter((l: string) => l.toLowerCase().includes('error') || l.toLowerCase().includes('timeout') || l.toLowerCase().includes('failed') || l.toLowerCase().includes('waiting for'))
                      .slice(0, 15)
                      .join('\n');
                    const encodedErr = errorSnippet ? `&errorLog=${encodeURIComponent(errorSnippet)}` : '';
                    navigate(`/test-suites?suiteId=${suiteId}&tab=code${encodedErr}`);
                  }}
                >
                  {selectedRun.status === 'failed' ? '🛠️ Fix Script with AI Assistant' : '✏️ Modify Playwright Script'}
                </Button>
              )}
            </div>
          </div>

          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as any)}
            className={styles.subTabList}
          >
            <Tab value="console" icon={<PlayCircleRegular />}>
              Live Streaming Console Log
            </Tab>
            <Tab value="artifacts" icon={<CameraRegular />}>
              Failure Screenshots, Traces &amp; Videos ({(selectedRun.artifacts || []).length})
            </Tab>
            <Tab value="report" icon={<DocumentTableRegular />}>
              Playwright HTML Report
            </Tab>
          </TabList>

          {activeTab === 'console' && (
            <LiveLogConsole
              runId={selectedRun.id}
              initialLogs={selectedRun.logs}
              isLive={isSelectedRunning}
            />
          )}

          {activeTab === 'artifacts' && (
            <ArtifactGallery artifacts={selectedRun.artifacts || []} />
          )}

          {activeTab === 'report' && (
            <HtmlReportViewer
              reportUrl={selectedRun.report_url || '/reports/index.html'}
              runStatus={selectedRun.status}
            />
          )}
        </div>
      )}
    </div>
  );
};

