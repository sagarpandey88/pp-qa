import React from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  Title3,
  Text,
  Badge,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  EditRegular,
  DeleteRegular,
  ArrowUpRegular,
  ArrowDownRegular,
  CheckmarkCircleRegular,
  DocumentBulletListRegular,
} from '@fluentui/react-icons';
import { ScenarioEditorDialog } from './ScenarioEditorDialog';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    padding: '16px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    fontSize: '13px',
    marginTop: '6px',
  },
  listBox: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '10px 12px',
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

interface ScenarioCardListProps {
  scenarios: any[];
  onUpdateScenarios: (updated: any[]) => void;
}

export const ScenarioCardList: React.FC<ScenarioCardListProps> = ({
  scenarios,
  onUpdateScenarios,
}) => {
  const styles = useStyles();

  const handleEdit = (index: number, updatedScenario: any) => {
    const list = [...scenarios];
    list[index] = updatedScenario;
    onUpdateScenarios(list);
  };

  const handleDelete = (index: number) => {
    const list = scenarios.filter((_, i) => i !== index);
    onUpdateScenarios(list);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenarios.length) return;

    const list = [...scenarios];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    onUpdateScenarios(list);
  };

  if (scenarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: tokens.colorNeutralBackground1, borderRadius: '8px', border: `1px solid ${tokens.colorNeutralStroke2}` }}>
        <DocumentBulletListRegular style={{ fontSize: '48px', color: '#0078d4', marginBottom: '8px' }} />
        <Title3 style={{ fontSize: '18px', display: 'block' }}>No Test Scenarios Added</Title3>
        <Text style={{ color: tokens.colorNeutralForeground3, display: 'block', margin: '8px 0 16px' }}>
          Generate test scenarios from the AI Chat Assistant or add your own scenario cards manually.
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {scenarios.map((sc, idx) => (
        <div key={sc.id || idx} className={styles.card}>
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <Badge appearance="filled" color="brand" shape="circular">
                #{idx + 1}
              </Badge>
              <strong>{sc.title}</strong>
              <Badge
                appearance="filled"
                color={
                  sc.targetAppType === 'copilot'
                    ? 'informative'
                    : sc.targetAppType === 'canvas'
                    ? 'warning'
                    : 'success'
                }
              >
                {sc.targetAppType === 'copilot'
                  ? 'Copilot Studio'
                  : sc.targetAppType === 'canvas'
                  ? 'Canvas App'
                  : 'Model-Driven App'}
              </Badge>
            </div>

            <div className={styles.actions}>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowUpRegular />}
                disabled={idx === 0}
                onClick={() => handleMove(idx, 'up')}
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowDownRegular />}
                disabled={idx === scenarios.length - 1}
                onClick={() => handleMove(idx, 'down')}
              />
              <ScenarioEditorDialog
                scenario={sc}
                onSave={(updated) => handleEdit(idx, updated)}
                triggerButton={
                  <Button size="small" appearance="subtle" icon={<EditRegular />} />
                }
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<DeleteRegular />}
                onClick={() => handleDelete(idx)}
              />
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.listBox}>
              <Text weight="semibold" size={200}>Execution Steps:</Text>
              <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {sc.steps?.map((step: string, sidx: number) => (
                  <li key={sidx} style={{ marginBottom: '2px' }}>{step}</li>
                ))}
              </ol>
            </div>

            <div className={styles.listBox}>
              <Text weight="semibold" size={200}>Expected Verifications:</Text>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {sc.expectedAssertions?.map((assert: string, aidx: number) => (
                  <li key={aidx} style={{ marginBottom: '2px' }}>{assert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

