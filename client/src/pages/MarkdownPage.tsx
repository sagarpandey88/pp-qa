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
  Tooltip,
} from '@fluentui/react-components';
import {
  DocumentTextRegular,
  TableRegular,
  DocumentBulletListRegular,
  CopyRegular,
  ArrowDownloadRegular,
  CheckmarkRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import { apiClient } from '../api/client';
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

export const MarkdownPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [solutions, setSolutions] = useState<any[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadSolutions = async () => {
    try {
      setLoading(true);
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
      }
    } catch (err) {
      console.error('Failed to load solutions', err);
    } finally {
      setLoading(false);
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
    }
  };

  const handleCopy = () => {
    if (!selectedSolution?.markdown_content) return;
    navigator.clipboard.writeText(selectedSolution.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedSolution) return;
    const content = selectedSolution.markdown_content || '# No specification content generated yet.';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const name = (selectedSolution.unique_name || 'solution').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.download = `${name}-specification.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const markdownContent =
    selectedSolution?.markdown_content ||
    `# Specification for ${selectedSolution?.friendly_name || selectedSolution?.unique_name || 'Solution'}

No architecture specification has been synthesized for this package yet. Ingest this solution with AI synthesis enabled to view the architectural document.`;

  return (
    <div className={styles.page}>
      <div>
        <Title3>Generated Markdown Architecture Specification</Title3>
        <Text style={{ display: 'block', color: '#666', marginTop: '4px' }}>
          Standardized Markdown (.md) specification describing Dataverse entities, relationships, Flow triggers, and QA test assertions.
        </Text>
      </div>

      <div className={styles.headerBar}>
        <div className={styles.selectorSection}>
          <Text weight="semibold">Selected Solution:</Text>
          {loading ? (
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
        </div>

        <div className={styles.actionsGroup}>
          {selectedSolution && (
            <>
              <Tooltip content={copied ? 'Copied!' : 'Copy raw markdown'} relationship="label">
                <Button
                  appearance="subtle"
                  icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Tooltip>
              <Tooltip content="Download as .md file" relationship="label">
                <Button
                  appearance="subtle"
                  icon={<ArrowDownloadRegular />}
                  onClick={handleDownload}
                >
                  Download .md
                </Button>
              </Tooltip>
              <Button
                appearance="secondary"
                icon={<TableRegular />}
                onClick={() => navigate(`/components?solutionId=${selectedSolution.id}`)}
              >
                Inspect Components
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

      {loading ? (
        <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
          <Spinner label="Loading specification..." />
        </div>
      ) : solutions.length === 0 ? (
        <div className={styles.emptyState}>
          <FolderOpenRegular style={{ fontSize: '40px', color: '#999' }} />
          <Title3 style={{ fontSize: '16px' }}>No Solutions Available</Title3>
          <Text style={{ maxWidth: '480px', color: '#666' }}>
            No Power Platform solutions have been imported yet. Visit the Solutions catalog to ingest a package.
          </Text>
          <Button appearance="primary" onClick={() => navigate('/solutions')}>
            Go to Solutions Catalog
          </Button>
        </div>
      ) : (
        <MarkdownDocViewer
          markdown={markdownContent}
          solutionName={selectedSolution.friendly_name || selectedSolution.unique_name}
        />
      )}
    </div>
  );
};

export default MarkdownPage;

