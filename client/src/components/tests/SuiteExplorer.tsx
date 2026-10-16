import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Button,
  Badge,
  Input,
  Dropdown,
  Option,
  Text,
  Title3,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  DocumentBulletListRegular,
  CodeRegular,
  PlayRegular,
  DeleteRegular,
  EditRegular,
  AddRegular,
  SearchRegular,
  FolderOpenRegular,
  CheckmarkCircleRegular,
  SparkleRegular,
  ClockRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  kpiCard: {
    padding: '14px 18px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  filterControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    flex: 1,
  },
  tableCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
  actionGroup: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
});

interface SuiteExplorerProps {
  suites: any[];
  solutions: any[];
  selectedSolutionId: string;
  onSelectSolution: (solId: string) => void;
  onOpenSuite: (suite: any) => void;
  onNewSuite: () => void;
  onViewCode: (suite: any) => void;
  onRunSuite: (suiteId: string) => void;
  onDeleteSuite: (suiteId: string) => void;
}

export const SuiteExplorer: React.FC<SuiteExplorerProps> = ({
  suites,
  solutions,
  selectedSolutionId,
  onSelectSolution,
  onOpenSuite,
  onNewSuite,
  onViewCode,
  onRunSuite,
  onDeleteSuite,
}) => {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filter suites by solution, search term, and app type
  const filteredSuites = suites.filter((s) => {
    const matchesSolution =
      selectedSolutionId === 'all' ||
      !selectedSolutionId ||
      s.solution_id === selectedSolutionId ||
      s.solutionId === selectedSolutionId;

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      s.title?.toLowerCase().includes(term) ||
      s.target_app_name?.toLowerCase().includes(term) ||
      s.targetAppName?.toLowerCase().includes(term) ||
      s.solution_name?.toLowerCase().includes(term) ||
      s.solutionName?.toLowerCase().includes(term);

    const appType = s.target_app_type || s.targetAppType;
    const matchesType = typeFilter === 'all' || appType === typeFilter;

    return matchesSolution && matchesSearch && matchesType;
  });

  // Calculate KPIs
  const totalScenarios = suites.reduce(
    (acc, s) => acc + (s.scenarios ? s.scenarios.length : 0),
    0
  );
  const synthesizedCount = suites.filter(
    (s) => !!(s.generated_code || s.generatedCode)
  ).length;

  return (
    <div className={styles.container}>
      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Total Test Suites
          </Text>
          <Text size={700} weight="bold" style={{ color: '#0078d4' }}>
            {suites.length}
          </Text>
        </div>

        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Interactive Scenario Cards
          </Text>
          <Text size={700} weight="bold" style={{ color: '#107c41' }}>
            {totalScenarios}
          </Text>
        </div>

        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Playwright Specs Synthesized
          </Text>
          <Text size={700} weight="bold" style={{ color: '#5c2d91' }}>
            {synthesizedCount} / {suites.length}
          </Text>
        </div>

        <div className={styles.kpiCard}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Solutions In Scope
          </Text>
          <Text size={700} weight="bold" style={{ color: '#d83b01' }}>
            {solutions.length}
          </Text>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterControls}>
          <Input
            style={{ minWidth: '220px' }}
            contentBefore={<SearchRegular />}
            placeholder="Search test suites..."
            value={searchTerm}
            onChange={(e, data) => setSearchTerm(data.value)}
          />

          <Dropdown
            style={{ minWidth: '220px' }}
            value={
              selectedSolutionId === 'all'
                ? 'All Solutions'
                : solutions.find((s) => s.id === selectedSolutionId)?.friendly_name ||
                  solutions.find((s) => s.id === selectedSolutionId)?.unique_name ||
                  'Filter by Solution...'
            }
            selectedOptions={[selectedSolutionId || 'all']}
            onOptionSelect={(_, data) => onSelectSolution(data.optionValue as string)}
          >
            <Option value="all" text={`All Solutions (${solutions.length})`}>🌐 All Solutions ({solutions.length})</Option>
            {solutions.map((sol) => (
              <Option key={sol.id} value={sol.id} text={sol.friendly_name || sol.unique_name}>
                📦 {sol.friendly_name || sol.unique_name}
              </Option>
            ))}
          </Dropdown>

          <Dropdown
            style={{ minWidth: '180px' }}
            value={
              typeFilter === 'all'
                ? 'All Platform Types'
                : typeFilter === 'model_driven'
                ? 'Model-Driven'
                : typeFilter === 'canvas'
                ? 'Canvas'
                : 'Copilot'
            }
            selectedOptions={[typeFilter]}
            onOptionSelect={(_, data) => setTypeFilter(data.optionValue as string)}
          >
            <Option value="all">All Platform Types</Option>
            <Option value="model_driven">Model-Driven App</Option>
            <Option value="canvas">Canvas App</Option>
            <Option value="copilot">Copilot Studio</Option>
          </Dropdown>
        </div>

        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={onNewSuite}
        >
          Create New Suite
        </Button>
      </div>

      {/* Test Suites Table */}
      <div className={styles.tableCard}>
        {filteredSuites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <DocumentBulletListRegular style={{ fontSize: '48px', color: '#0078d4', marginBottom: '8px' }} />
            <Title3 style={{ fontSize: '18px', display: 'block' }}>No Test Suites Found</Title3>
            <Text style={{ color: tokens.colorNeutralForeground3, display: 'block', margin: '8px 0 16px' }}>
              {suites.length === 0
                ? 'No test suites have been created yet. Click below to create your first suite for an unmanaged solution.'
                : 'No test suites match the selected filter criteria. Try clearing search filters.'}
            </Text>
            <Button appearance="primary" icon={<AddRegular />} onClick={onNewSuite}>
              Create New Test Suite
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Suite Title</TableHeaderCell>
                <TableHeaderCell>Associated Solution</TableHeaderCell>
                <TableHeaderCell>Target Platform &amp; App</TableHeaderCell>
                <TableHeaderCell>Scenarios</TableHeaderCell>
                <TableHeaderCell>Playwright Spec</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuites.map((s) => {
                const appType = s.target_app_type || s.targetAppType;
                const appName = s.target_app_name || s.targetAppName;
                const scenarioCount = (s.scenarios || []).length;
                const hasCode = !!(s.generated_code || s.generatedCode);
                const solName =
                  s.solution_name ||
                  s.solutionName ||
                  solutions.find((sol) => sol.id === (s.solution_id || s.solutionId))?.friendly_name ||
                  solutions.find((sol) => sol.id === (s.solution_id || s.solutionId))?.unique_name ||
                  'Default Solution';

                return (
                  <TableRow key={s.id} style={{ cursor: 'pointer' }} onClick={() => onOpenSuite(s)}>
                    <TableCell>
                      <TableCellLayout media={<DocumentBulletListRegular style={{ color: '#0078d4' }} />}>
                        <strong>{s.title}</strong>
                        {s.description && (
                          <Text size={200} style={{ color: '#666', display: 'block' }}>
                            {s.description}
                          </Text>
                        )}
                      </TableCellLayout>
                    </TableCell>

                    <TableCell>
                      <Badge appearance="tint" color="brand" icon={<FolderOpenRegular />}>
                        {solName}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <Badge
                          size="small"
                          appearance="filled"
                          color={
                            appType === 'copilot'
                              ? 'informative'
                              : appType === 'canvas'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {appType === 'copilot'
                            ? 'Copilot Studio'
                            : appType === 'canvas'
                            ? 'Canvas App'
                            : 'Model-Driven'}
                        </Badge>
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                          {appName || 'Customer Service Hub'}
                        </Text>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge appearance="outline">
                        {scenarioCount} {scenarioCount === 1 ? 'scenario' : 'scenarios'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {hasCode ? (
                        <Badge appearance="filled" color="success" icon={<CheckmarkCircleRegular />}>
                          Synthesized
                        </Badge>
                      ) : (
                        <Badge appearance="tint" color="subtle">
                          Draft (Pending Code)
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className={styles.actionGroup} onClick={(e) => e.stopPropagation()}>
                        <Tooltip content="Open Suite in Studio" relationship="label">
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<EditRegular />}
                            onClick={() => onOpenSuite(s)}
                          >
                            Studio
                          </Button>
                        </Tooltip>

                        {hasCode && (
                          <Tooltip content="View Playwright TypeScript Code" relationship="label">
                            <Button
                              size="small"
                              appearance="subtle"
                              icon={<CodeRegular />}
                              onClick={() => onViewCode(s)}
                            />
                          </Tooltip>
                        )}

                        <Tooltip content="Queue Headless Playwright Test Run" relationship="label">
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<PlayRegular />}
                            onClick={() => onRunSuite(s.id)}
                          />
                        </Tooltip>

                        <Tooltip content="Delete Test Suite" relationship="label">
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<DeleteRegular />}
                            onClick={() => onDeleteSuite(s.id)}
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
