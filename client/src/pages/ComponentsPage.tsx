import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title3,
  Text,
  Dropdown,
  Option,
  Button,
  Spinner,
  makeStyles,
  tokens,
  Badge,
} from '@fluentui/react-components';
import {
  TableRegular,
  DocumentBulletListRegular,
  DocumentTextRegular,
  ArrowClockwiseRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
import { MetadataViewer } from '../components/solutions/MetadataViewer';

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
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  selectorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  dropdown: {
    minWidth: '280px',
  },
  actionsGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
});

export const ComponentsPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [solutions, setSolutions] = useState<any[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [loadingSolutions, setLoadingSolutions] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load solutions list
  const loadSolutions = async () => {
    try {
      setLoadingSolutions(true);
      const res = await apiClient.get('/solutions');
      const loaded: any[] = res.data || [];
      setSolutions(loaded);

      const qSolId = searchParams.get('solutionId');
      let targetSol = loaded.find((s) => s.id === qSolId);
      if (!targetSol && loaded.length > 0) {
        targetSol = loaded[0];
      }

      if (targetSol) {
        setSelectedSolution(targetSol);
        setSearchParams({ solutionId: targetSol.id }, { replace: true });
        fetchComponents(targetSol.id);
      }
    } catch (err) {
      console.error('Failed to load solutions', err);
    } finally {
      setLoadingSolutions(false);
    }
  };

  const fetchComponents = async (solId: string) => {
    setLoadingDetails(true);
    try {
      const [tblRes, flwRes, botRes] = await Promise.all([
        apiClient.get(`/solutions/${solId}/tables`).catch(() => ({ data: [] })),
        apiClient.get(`/solutions/${solId}/flows`).catch(() => ({ data: [] })),
        apiClient.get(`/solutions/${solId}/bots`).catch(() => ({ data: [] })),
      ]);
      setTables(tblRes.data);
      setFlows(flwRes.data);
      setBots(botRes.data);
    } catch (err) {
      console.error('Failed to load solution components', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadSolutions();
  }, []);

  const handleSolutionSelect = (_e: any, data: any) => {
    const solId = data.optionValue;
    const chosen = solutions.find((s) => s.id === solId);
    if (chosen) {
      setSelectedSolution(chosen);
      setSearchParams({ solutionId: chosen.id }, { replace: true });
      fetchComponents(chosen.id);
    }
  };

  return (
    <div className={styles.page}>
      <div>
        <Title3>Power Platform Component Explorer</Title3>
        <Text style={{ display: 'block', color: '#666', marginTop: '4px' }}>
          Inspect Dataverse Tables, Attributes, Cloud Flows, and Copilot Studio Bots extracted from package metadata.
        </Text>
      </div>

      <div className={styles.headerBar}>
        <div className={styles.selectorSection}>
          <Text weight="semibold">Selected Solution:</Text>
          {loadingSolutions ? (
            <Spinner size="tiny" label="Loading solutions..." />
          ) : (
            <Dropdown
              className={styles.dropdown}
              placeholder="Select a Solution"
              value={selectedSolution ? (selectedSolution.friendly_name || selectedSolution.unique_name) : ''}
              selectedOptions={selectedSolution ? [selectedSolution.id] : []}
              onOptionSelect={handleSolutionSelect}
              disabled={solutions.length === 0}
            >
              {solutions.map((sol) => (
                <Option key={sol.id} value={sol.id} text={sol.friendly_name || sol.unique_name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                    <span>{sol.friendly_name || sol.unique_name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.65 }}>v{sol.version || '1.0'}</span>
                  </div>
                </Option>
              ))}
            </Dropdown>
          )}

          {selectedSolution && (
            <Badge appearance="outline" color="informative">
              {tables.length} Tables · {flows.length} Flows · {bots.length} Bots
            </Badge>
          )}
        </div>

        <div className={styles.actionsGroup}>
          <Button
            appearance="subtle"
            icon={<ArrowClockwiseRegular />}
            onClick={() => selectedSolution && fetchComponents(selectedSolution.id)}
            disabled={!selectedSolution || loadingDetails}
          >
            Refresh Components
          </Button>

          {selectedSolution && (
            <>
              <Button
                appearance="secondary"
                icon={<DocumentTextRegular />}
                onClick={() => navigate(`/markdown?solutionId=${selectedSolution.id}`)}
              >
                Markdown Spec
              </Button>
              <Button
                appearance="primary"
                icon={<DocumentBulletListRegular />}
                onClick={() => navigate(`/test-suites?solutionId=${selectedSolution.id}`)}
              >
                Author Test Suites
              </Button>
            </>
          )}
        </div>
      </div>

      {loadingDetails ? (
        <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
          <Spinner label="Loading extracted component details..." />
        </div>
      ) : solutions.length === 0 && !loadingSolutions ? (
        <div className={styles.emptyState}>
          <FolderOpenRegular style={{ fontSize: '40px', color: '#999' }} />
          <Title3 style={{ fontSize: '16px' }}>No Solutions Available</Title3>
          <Text style={{ maxWidth: '480px', color: '#666' }}>
            No Power Platform solutions have been imported yet. Visit the Solutions page to ingest a Dataverse or zip package.
          </Text>
          <Button appearance="primary" onClick={() => navigate('/solutions')}>
            Go to Solutions Catalog
          </Button>
        </div>
      ) : (
        <MetadataViewer tables={tables} flows={flows} bots={bots} />
      )}
    </div>
  );
};

export default ComponentsPage;

