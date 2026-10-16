import React, { useState, useEffect } from 'react';
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
  Spinner,
  Text,
  Title3,
  makeStyles,
  tokens,
  Card,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  FolderOpenRegular,
  ArrowUploadRegular,
  EyeRegular,
  DeleteRegular,
  CheckmarkCircleRegular,
  DocumentBulletListRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    padding: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  hiddenInput: {
    display: 'none',
  },
});

interface SolutionCatalogProps {
  onSelectSolution: (solution: any) => void;
  selectedSolutionId?: string;
}

export const SolutionCatalog: React.FC<SolutionCatalogProps> = ({
  onSelectSolution,
  selectedSolutionId,
}) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [dataverseSolutions, setDataverseSolutions] = useState<any[]>([]);
  const [importedSolutions, setImportedSolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [extractingName, setExtractingName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dvError, setDvError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dvRes, impRes] = await Promise.all([
        apiClient
          .get('/dataverse/solutions')
          .then((res) => {
            setDvError(null);
            return res.data;
          })
          .catch((err) => {
            const msg = err.response?.data?.error || err.message;
            setDvError(msg);
            return [];
          }),
        apiClient.get('/solutions').catch(() => ({ data: [] })),
      ]);
      setDataverseSolutions(dvRes);
      setImportedSolutions(impRes.data || []);

      // Auto-select first imported solution if none selected
      if (!selectedSolutionId && impRes.data && impRes.data.length > 0) {
        onSelectSolution(impRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch solutions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExtract = async (uniqueName: string) => {
    setExtractingName(uniqueName);
    try {
      const res = await apiClient.post(`/dataverse/solutions/${uniqueName}/export`);
      await fetchData();
      if (res.data?.solution) {
        onSelectSolution(res.data.solution);
      }
    } catch (err: any) {
      alert(`Export and extraction failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setExtractingName(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('solutionZip', file);

    setUploading(true);
    try {
      const res = await apiClient.post('/solutions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchData();
      if (res.data?.solution) {
        onSelectSolution(res.data.solution);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this extracted solution and its parsed metadata?')) return;
    try {
      await apiClient.delete(`/solutions/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete solution', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Title3 style={{ fontSize: '18px' }}>Discovered Unmanaged Solutions</Title3>
          <Text size={200} style={{ color: '#666', display: 'block', marginTop: '2px' }}>
            Solutions available in your Dataverse environment ready for extraction &amp; QA analysis.
          </Text>
        </div>
        <div className={styles.actionGroup}>
          <input
            id="solution-zip-upload"
            type="file"
            accept=".zip"
            className={styles.hiddenInput}
            onChange={handleFileUpload}
          />
          <Button
            appearance="secondary"
            icon={<ArrowUploadRegular />}
            disabled={uploading}
            onClick={() => document.getElementById('solution-zip-upload')?.click()}
          >
            {uploading ? 'Uploading ZIP...' : 'Upload Solution ZIP'}
          </Button>
        </div>
      </div>

      {dvError && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#fde7e9',
            border: '1px solid #a80000',
            borderRadius: '8px',
            color: '#323130',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a80000', fontWeight: '600' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <span>Dataverse Connection Error</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="small"
                appearance="primary"
                onClick={() => {
                  window.location.href = '/api/auth/microsoft/login';
                }}
              >
                Connect with Microsoft Account
              </Button>
              <Button size="small" appearance="outline" onClick={fetchData}>
                Retry Connection
              </Button>
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#a80000', fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {dvError}
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', lineHeight: '1.5' }}>
            <strong>Recommended Resolution:</strong> Click <b>Connect with Microsoft Account</b> above to authenticate directly with your signed-in user credentials (delegated access). This uses your existing Power Platform security roles without requiring client secrets or application user provisioning.
            <div style={{ marginTop: '8px' }}>
              <strong>Alternative (Service Principal):</strong> Open{' '}
              <a
                href="https://admin.powerplatform.microsoft.com/"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#0078d4', fontWeight: 600 }}
              >
                Power Platform Admin Center ↗
              </a>{' '}
              &gt; Environments &gt; Settings &gt; Application users &gt; + New app user, add your Azure App Registration and assign the System Customizer or System Administrator role.
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <Spinner label="Scanning Dataverse environment for unmanaged solutions..." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Solution Name</TableHeaderCell>
                <TableHeaderCell>Unique Name</TableHeaderCell>
                <TableHeaderCell>Version</TableHeaderCell>
                <TableHeaderCell>Publisher</TableHeaderCell>
                <TableHeaderCell>Extraction Status</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataverseSolutions.map((sol) => {
                const isExtracted = importedSolutions.some(
                  (imp) => imp.unique_name === sol.uniquename
                );
                const matchedImport = importedSolutions.find(
                  (imp) => imp.unique_name === sol.uniquename
                );
                const isSelected = matchedImport && matchedImport.id === selectedSolutionId;
                const isExtracting = extractingName === sol.uniquename;

                return (
                  <TableRow
                    key={sol.solutionid || sol.uniquename}
                    style={{
                      cursor: isExtracted ? 'pointer' : 'default',
                      backgroundColor: isSelected ? tokens.colorNeutralBackground3 : undefined,
                    }}
                    onClick={() => {
                      if (matchedImport) onSelectSolution(matchedImport);
                    }}
                  >
                    <TableCell>
                      <TableCellLayout media={<FolderOpenRegular style={{ color: '#0078d4' }} />}>
                        <strong>{sol.friendlyname}</strong>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell><code>{sol.uniquename}</code></TableCell>
                    <TableCell><Badge size="small" appearance="outline">{sol.version}</Badge></TableCell>
                    <TableCell>{sol.publisher || 'Contoso'}</TableCell>
                    <TableCell>
                      {isExtracted ? (
                        <Badge appearance="filled" color="success" icon={<CheckmarkCircleRegular />}>
                          Extracted &amp; Ready
                        </Badge>
                      ) : (
                        <Badge appearance="tint" color="subtle">Pending Extraction</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={styles.actionGroup}>
                        <Button
                          size="small"
                          appearance={isExtracted ? 'subtle' : 'primary'}
                          icon={isExtracting ? <Spinner size="tiny" /> : isExtracted ? <EyeRegular /> : <ArrowDownloadRegular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isExtracted && matchedImport) {
                              onSelectSolution(matchedImport);
                            } else {
                              handleExtract(sol.uniquename);
                            }
                          }}
                          disabled={isExtracting}
                        >
                          {isExtracting ? 'Extracting...' : isExtracted ? 'View Details' : 'Extract & Inspect'}
                        </Button>
                        {isExtracted && matchedImport && (
                          <>
                            <Button
                              size="small"
                              appearance="secondary"
                              icon={<DocumentBulletListRegular />}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/test-suites?solutionId=${matchedImport.id}`);
                              }}
                            >
                              Test Suites
                            </Button>
                            <Button
                              size="small"
                              appearance="subtle"
                              icon={<DeleteRegular />}
                              onClick={(e) => handleDelete(matchedImport.id, e)}
                            />
                          </>
                        )}
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
