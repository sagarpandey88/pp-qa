import React from 'react';
import {
  Dropdown,
  Option,
  Badge,
  Text,
  Button,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  FolderOpenRegular,
  TableRegular,
  ArrowSyncRegular,
  BotRegular,
  OpenRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '16px 20px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  selectorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: '280px',
  },
  dropdown: {
    minWidth: '320px',
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    paddingTop: '6px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  badgeGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

interface SuiteSolutionSelectorProps {
  solutions: any[];
  selectedSolutionId: string;
  onSelectSolution: (solutionId: string) => void;
  showAllOption?: boolean;
}

export const SuiteSolutionSelector: React.FC<SuiteSolutionSelectorProps> = ({
  solutions,
  selectedSolutionId,
  onSelectSolution,
  showAllOption = false,
}) => {
  const styles = useStyles();
  const navigate = useNavigate();

  const selectedSolution = solutions.find((s) => s.id === selectedSolutionId);

  const selectedText =
    selectedSolutionId === 'all'
      ? 'All Solutions'
      : selectedSolution
      ? `${selectedSolution.friendly_name || selectedSolution.unique_name} (${selectedSolution.version || 'v1.0'})`
      : 'Select a Solution...';

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.selectorGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpenRegular style={{ color: '#0078d4', fontSize: '20px' }} />
            <Text weight="semibold">Target Power Platform Solution:</Text>
          </div>

          <Dropdown
            className={styles.dropdown}
            value={selectedText}
            selectedOptions={[selectedSolutionId]}
            onOptionSelect={(_, data) => onSelectSolution(data.optionValue as string)}
            placeholder="Select a Dataverse solution..."
          >
            {showAllOption && (
              <Option value="all" text={`All Solutions (${solutions.length})`}>
                🌐 All Solutions ({solutions.length})
              </Option>
            )}
            {solutions.map((sol) => (
              <Option key={sol.id} value={sol.id} text={`${sol.friendly_name || sol.unique_name} (v${sol.version || '1.0'})`}>
                📦 {sol.friendly_name || sol.unique_name} (v{sol.version || '1.0'})
              </Option>
            ))}
          </Dropdown>
        </div>

        {selectedSolution && (
          <Button
            size="small"
            appearance="subtle"
            icon={<OpenRegular />}
            onClick={() => navigate('/solutions')}
          >
            View Architecture in Explorer
          </Button>
        )}
      </div>

      {selectedSolution ? (
        <div className={styles.detailsRow}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Solution Context:
          </Text>
          <div className={styles.badgeGroup}>
            <Badge appearance="filled" color="brand">
              {selectedSolution.unique_name}
            </Badge>
            <Badge appearance="outline">
              v{selectedSolution.version || '1.0.0.0'}
            </Badge>
            <Badge appearance="tint" color="informative">
              Publisher: {selectedSolution.publisher_name || 'Contoso'}
            </Badge>
            {selectedSolution.publisher_prefix && (
              <Badge appearance="tint" color="subtle">
                Prefix: {selectedSolution.publisher_prefix}
              </Badge>
            )}

            {/* Component Counts */}
            <Tooltip content="Extracted Dataverse Tables" relationship="label">
              <Badge appearance="tint" color="success" icon={<TableRegular />}>
                {selectedSolution.table_count ?? selectedSolution.tables_count ?? '0'} Tables
              </Badge>
            </Tooltip>
            <Tooltip content="Automated Cloud Flows" relationship="label">
              <Badge appearance="tint" color="warning" icon={<ArrowSyncRegular />}>
                {selectedSolution.flow_count ?? selectedSolution.flows_count ?? '0'} Cloud Flows
              </Badge>
            </Tooltip>
            <Tooltip content="Copilot Studio Conversational Agents" relationship="label">
              <Badge appearance="tint" color="informative" icon={<BotRegular />}>
                {selectedSolution.bot_count ?? selectedSolution.bots_count ?? '0'} Copilot Bots
              </Badge>
            </Tooltip>
          </div>
        </div>
      ) : selectedSolutionId === 'all' ? (
        <div className={styles.detailsRow}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Showing test suites across all <strong>{solutions.length} unmanaged solutions</strong> in your environment.
          </Text>
        </div>
      ) : (
        <div className={styles.detailsRow}>
          <Text size={200} style={{ color: '#d13438' }}>
            ⚠️ Please select a solution above so that test scenarios and Playwright Page Object Models are scoped to its real Dataverse components.
          </Text>
        </div>
      )}
    </div>
  );
};
