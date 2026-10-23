import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title3,
  Text,
  TabList,
  Tab,
  Button,
  makeStyles,
  tokens,
  Badge,
  Dropdown,
  Option,
  Spinner,
  Tooltip,
} from '@fluentui/react-components';
import {
  PlayCircleRegular,
  PlayRegular,
  DocumentBulletListRegular,
  CameraRegular,
  DocumentTableRegular,
  ArrowClockwiseRegular,
  SparkleRegular,
  EditRegular,
  FilterRegular,
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
    maxWidth: '1440px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  suiteBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '12px 18px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  suiteLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  suiteDropdown: {
    minWidth: '320px',
  },
  suiteActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [runs, setRuns] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('all');
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSuites, setLoadingSuites] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'artifacts' | 'report'>('console');

  // Load test suites
  const fetchSuites = async () => {
    try {
      setLoadingSuites(true);
      const res = await apiClient.get('/test-suites');
      const loaded = res.data || [];
      setSuites(loaded);

      // Check query param
      const qSuiteId = searchParams.get('suiteId');
      if (qSuiteId && loaded.some((s: any) => s.id === qSuiteId)) {
        setSelectedSuiteId(qSuiteId);
      }
    } catch (err) {
      console.error('Failed to load test suites', err);
    } finally {
      setLoadingSuites(false);
    }
  };

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/runs');
      const loadedRuns: any[] = res.data || [];
      setRuns(loadedRuns);

      // Determine selected run
      if (loadedRuns.length > 0 && !selectedRun) {
        setSelectedRun(loadedRuns[0]);
      } else if (selectedRun) {
        const updated = loadedRuns.find((r) => r.id === selectedRun.id);
        if (updated) {
          setSelectedRun(updated);
        } else {
          setSelectedRun(loadedRuns.length > 0 ? loadedRuns[0] : null);
        }
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuites();
    fetchRuns();

    // Poll every 5s if a run is running
    const interval = setInterval(() => {
      const isAnyRunning = runs.some((r) => r.status === 'running' || r.status === 'queued');
      if (isAnyRunning) {
        fetchRuns();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRun = (run: any) => {
    setSelectedRun(run);
  };

  const handleSuiteSelect = (_e: any, data: any) => {
    const val = data.optionValue as string;
    setSelectedSuiteId(val);
    if (val === 'all') {
      searchParams.delete('suiteId');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ suiteId: val }, { replace: true });
    }

    // Auto update selected run to one that matches the suite
    if (val !== 'all') {
      const match = runs.find((r) => (r.test_suite_id || r.testSuiteId) === val);
      if (match) setSelectedRun(match);
    }
  };

  const handleRunSuiteNow = async () => {
    if (selectedSuiteId === 'all') return;
    try {
      setIsExecuting(true);
      const res = await apiClient.post('/runs', { testSuiteId: selectedSuiteId });
      await fetchRuns();
      if (res.data?.id) {
        const newRun = runs.find((r) => r.id === res.data.id) || res.data;
        setSelectedRun(newRun);
      }
      setActiveTab('console');
    } catch (err: any) {
      alert(`Failed to trigger suite execution: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteRuns = async (runIds: string[]) => {
    try {
      await apiClient.post('/runs/delete-batch', { runIds });
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

  // Filter runs by selected suite if not 'all'
  const filteredRuns =
    selectedSuiteId === 'all'
      ? runs
      : runs.filter((r) => (r.test_suite_id || r.testSuiteId) === selectedSuiteId);

  const selectedSuiteObj = suites.find((s) => s.id === selectedSuiteId);
  const isSelectedRunning =
    selectedRun && (selectedRun.status === 'running' || selectedRun.status === 'queued');

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
            onClick={() => {
              fetchSuites();
              fetchRuns();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Suite Selector & Direct Execution Bar */}
      <div className={styles.suiteBar}>
        <div className={styles.suiteLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FilterRegular style={{ color: '#742774' }} />
            <Text weight="semibold">Selected Suite:</Text>
          </div>

          <Dropdown
            className={styles.suiteDropdown}
            placeholder="Select a Test Suite..."
            value={
              selectedSuiteId === 'all'
                ? 'All Test Suites'
                : selectedSuiteObj?.title || 'Unknown Suite'
            }
            selectedOptions={[selectedSuiteId]}
            onOptionSelect={handleSuiteSelect}
          >
            <Option value="all" text="All Test Suites">
              🌐 All Test Suites ({runs.length} total runs)
            </Option>
            {suites.map((s) => (
              <Option key={s.id} value={s.id} text={s.title}>
                📄 {s.title} ({s.scenarios?.length || 0} scenarios)
              </Option>
            ))}
          </Dropdown>

          <Badge appearance="outline" color={selectedSuiteId === 'all' ? 'informative' : 'brand'}>
            {filteredRuns.length} runs shown
          </Badge>
        </div>

        <div className={styles.suiteActions}>
          {selectedSuiteId !== 'all' && (
            <Button
              appearance="subtle"
              icon={<EditRegular />}
              onClick={() => navigate(`/test-suites?suiteId=${selectedSuiteId}`)}
            >
              Edit Suite in Studio
            </Button>
          )}

          <Button
            appearance="primary"
            icon={isExecuting ? <Spinner size="tiny" /> : <PlayRegular />}
            onClick={handleRunSuiteNow}
            disabled={selectedSuiteId === 'all' || isExecuting}
          >
            {isExecuting ? 'Starting Run...' : '▶ Run Selected Suite'}
          </Button>
        </div>
      </div>

      <TestRunDashboard
        runs={filteredRuns}
        selectedRunId={selectedRun?.id}
        onSelectRun={handleSelectRun}
        onDeleteRuns={handleDeleteRuns}
        loading={loading}
      />

      {selectedRun && (
        <div className={styles.detailSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                  icon={<SparkleRegular style={{ color: selectedRun.status === 'failed' ? '#ffffff' : '#742774' }} />}
                  onClick={() => {
                    const suiteId = selectedRun.test_suite_id || selectedRun.testSuiteId;
                    const errorSnippet = (selectedRun.logs || '')
                      .split('\n')
                      .filter((l: string) =>
                        l.toLowerCase().includes('error') ||
                        l.toLowerCase().includes('timeout') ||
                        l.toLowerCase().includes('failed') ||
                        l.toLowerCase().includes('waiting for')
                      )
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

export default LiveRunsPage;
