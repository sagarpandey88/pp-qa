import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Badge,
  Button,
  Title3,
  Text,
  Checkbox,
  makeStyles,
  tokens,
  Spinner,
  Tooltip,
} from '@fluentui/react-components';
import {
  PlayCircleRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  DeleteRegular,
  EyeRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  kpiCard: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tableCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  batchBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    flexWrap: 'wrap',
    gap: '8px',
  },
  actionGroup: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
});

interface TestRunDashboardProps {
  runs: any[];
  selectedRunId?: string;
  onSelectRun: (run: any) => void;
  loading?: boolean;
  onDeleteRuns?: (runIds: string[]) => Promise<void>;
}

export const TestRunDashboard: React.FC<TestRunDashboardProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  loading = false,
  onDeleteRuns,
}) => {
  const styles = useStyles();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.status === 'passed').length;
  const failedRuns = runs.filter((r) => r.status === 'failed' || r.status === 'error').length;
  const runningRuns = runs.filter((r) => r.status === 'running' || r.status === 'queued').length;

  const allSelected = runs.length > 0 && selectedIds.size === runs.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < runs.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(runs.map((r) => r.id)));
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || !onDeleteRuns) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to delete ${count} selected test run(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteRuns(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(`Failed to delete runs: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteRuns) return;
    if (!window.confirm('Are you sure you want to delete this test run?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteRuns([id]);
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    } catch (err: any) {
      alert(`Failed to delete run: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: '#666' }}>
            Total Runs
          </Text>
          <Title3 style={{ margin: 0 }}>{totalRuns}</Title3>
        </div>
        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: '#107c10' }}>
            Passed Suites
          </Text>
          <Title3 style={{ margin: 0, color: '#107c10' }}>{passedRuns}</Title3>
        </div>
        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: '#d13438' }}>
            Failed Suites
          </Text>
          <Title3 style={{ margin: 0, color: '#d13438' }}>{failedRuns}</Title3>
        </div>
        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: '#0078d4' }}>
            In Progress
          </Text>
          <Title3 style={{ margin: 0, color: '#0078d4' }}>{runningRuns}</Title3>
        </div>
      </div>

      {/* Runs Table Card */}
      <div className={styles.tableCard}>
        {/* Batch Actions Bar when runs are selected */}
        {selectedIds.size > 0 && (
          <div className={styles.batchBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge appearance="filled" color="brand">
                {selectedIds.size} of {runs.length} selected
              </Badge>
              <Text weight="semibold">Batch Execution Management</Text>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                size="small"
                appearance="subtle"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                size="small"
                appearance="primary"
                style={{ backgroundColor: '#d13438', borderColor: '#d13438' }}
                icon={isDeleting ? <Spinner size="tiny" /> : <DeleteRegular />}
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Spinner label="Loading execution history..." />
          </div>
        ) : runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
            <PlayCircleRegular style={{ fontSize: '40px', color: '#0078d4', marginBottom: '8px' }} />
            <div>No test runs executed yet.</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Launch a test suite from the "Test Suites &amp; Authoring" page.
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: '40px' }}>
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'mixed' : false}
                    onChange={handleToggleAll}
                    aria-label="Select all runs"
                  />
                </TableHeaderCell>
                <TableHeaderCell>Suite Title</TableHeaderCell>
                <TableHeaderCell>Target App</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Duration</TableHeaderCell>
                <TableHeaderCell>Executed At</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => {
                const isSelected = r.id === selectedRunId;
                const isChecked = selectedIds.has(r.id);
                const isRunning = r.status === 'running' || r.status === 'queued';
                const isPassed = r.status === 'passed';

                return (
                  <TableRow
                    key={r.id}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? tokens.colorNeutralBackground3 : undefined,
                    }}
                    onClick={() => onSelectRun(r)}
                  >
                    <TableCell style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => handleToggleRow(r.id, e)}
                        aria-label={`Select run ${r.suite_title || r.id}`}
                      />
                    </TableCell>

                    <TableCell>
                      <TableCellLayout media={<PlayCircleRegular style={{ color: '#0078d4' }} />}>
                        <strong>{r.suite_title || 'Playwright Test Suite'}</strong>
                      </TableCellLayout>
                    </TableCell>

                    <TableCell>
                      <Badge appearance="outline">{r.target_app_type || 'model_driven'}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        appearance="filled"
                        color={isRunning ? 'warning' : isPassed ? 'success' : 'danger'}
                        icon={
                          isRunning ? (
                            <Spinner size="tiny" />
                          ) : isPassed ? (
                            <CheckmarkCircleRegular />
                          ) : (
                            <DismissCircleRegular />
                          )
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>

                    <TableCell>{r.duration_ms ? `${r.duration_ms}ms` : 'In progress'}</TableCell>
                    <TableCell>
                      {r.started_at ? new Date(r.started_at).toLocaleTimeString() : '-'}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className={styles.actionGroup}>
                        <Button
                          size="small"
                          appearance={isSelected ? 'primary' : 'subtle'}
                          icon={<EyeRegular />}
                          onClick={() => onSelectRun(r)}
                        >
                          {isSelected ? 'Viewing' : 'View Run'}
                        </Button>

                        <Tooltip content="Delete this test run" relationship="label">
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<DeleteRegular />}
                            onClick={(e) => handleDeleteSingle(r.id, e)}
                          />
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
