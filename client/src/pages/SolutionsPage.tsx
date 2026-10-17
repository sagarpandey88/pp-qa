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
  Spinner,
} from '@fluentui/react-components';
import {
  FolderOpenRegular,
  DocumentTextRegular,
  TableRegular,
  DocumentBulletListRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
import { SolutionCatalog } from '../components/solutions/SolutionCatalog';
import { MetadataViewer } from '../components/solutions/MetadataViewer';
import { MarkdownDocViewer } from '../components/solutions/MarkdownDocViewer';

const useStyles = makeStyles({
  page: {
    padding: '24px 32px',
    maxWidth: '1440px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subTabList: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export const SolutionsPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'metadata' | 'markdown'>('metadata');

  const fetchSolutionDetails = async (solutionId: string) => {
    setLoadingDetails(true);
    try {
      const [tblRes, flwRes, botRes] = await Promise.all([
        apiClient.get(`/solutions/${solutionId}/tables`).catch(() => ({ data: [] })),
        apiClient.get(`/solutions/${solutionId}/flows`).catch(() => ({ data: [] })),
        apiClient.get(`/solutions/${solutionId}/bots`).catch(() => ({ data: [] })),
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

  const handleSelectSolution = (sol: any) => {
    setSelectedSolution(sol);
    fetchSolutionDetails(sol.id);
  };

  return (
    <div className={styles.page}>
      <div>
        <Title3>Power Platform Solution Ingestion &amp; Metadata Explorer</Title3>
        <Text style={{ display: 'block', color: '#666', marginTop: '4px' }}>
          Inspect unmanaged Model-Driven, Canvas, Cloud Flow, and Copilot Studio packages directly from Dataverse.
        </Text>
      </div>

      <SolutionCatalog
        onSelectSolution={handleSelectSolution}
        selectedSolutionId={selectedSolution?.id}
      />

      {selectedSolution && (
        <div className={styles.detailSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title3 style={{ fontSize: '18px' }}>
              Extracted Architecture: {selectedSolution.friendly_name || selectedSolution.unique_name}
            </Title3>
            <Button
              appearance="primary"
              icon={<DocumentBulletListRegular />}
              onClick={() => navigate(`/test-suites?solutionId=${selectedSolution.id}`)}
            >
              Author Test Suites for this Solution
            </Button>
          </div>

          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as any)}
            className={styles.subTabList}
          >
            <Tab value="metadata" icon={<TableRegular />}>
              Component Explorer (Tables, Flows, Bots)
            </Tab>
            <Tab value="markdown" icon={<DocumentTextRegular />}>
              Generated Markdown Specification (.md)
            </Tab>
          </TabList>

          {loadingDetails ? (
            <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
              <Spinner label="Loading extracted component details..." />
            </div>
          ) : activeTab === 'metadata' ? (
            <MetadataViewer tables={tables} flows={flows} bots={bots} />
          ) : (
            <MarkdownDocViewer
              markdown={selectedSolution.markdown_content || '# No specification content generated yet.'}
              solutionName={selectedSolution.friendly_name || selectedSolution.unique_name}
            />
          )}
        </div>
      )}
    </div>
  );
};

