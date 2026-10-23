import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title3,
  Text,
  Button,
  makeStyles,
  tokens,
  Card,
  Badge,
} from '@fluentui/react-components';
import {
  DocumentTextRegular,
  TableRegular,
  DocumentBulletListRegular,
  ArrowRightRegular,
} from '@fluentui/react-icons';
import { SolutionCatalog } from '../components/solutions/SolutionCatalog';

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
  overviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px 24px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  overviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: '14px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '16px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      boxShadow: '0 4px 8px rgba(0,0,0,0.06)',
    },
  },
  cardIconHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardIcon: {
    fontSize: '24px',
    color: '#742774', // Power Platform purple
  },
});

export const SolutionsPage: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const [selectedSolution, setSelectedSolution] = useState<any | null>(null);

  const handleSelectSolution = (sol: any) => {
    setSelectedSolution(sol);
  };

  return (
    <div className={styles.page}>
      <div>
        <Title3>Power Platform Solution Ingestion &amp; Catalog</Title3>
        <Text style={{ display: 'block', color: '#666', marginTop: '4px' }}>
          Inspect unmanaged Model-Driven, Canvas, Cloud Flow, and Copilot Studio packages directly from Dataverse or zip files.
        </Text>
      </div>

      <SolutionCatalog
        onSelectSolution={handleSelectSolution}
        selectedSolutionId={selectedSolution?.id}
      />

      {selectedSolution && (
        <div className={styles.overviewSection}>
          <div className={styles.overviewHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Title3 style={{ fontSize: '18px', margin: 0 }}>
                  Active Solution: {selectedSolution.friendly_name || selectedSolution.unique_name}
                </Title3>
                <Badge appearance="filled" color="brand">
                  v{selectedSolution.version || '1.0.0.0'}
                </Badge>
              </div>
              <Text style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Unique Name: <code>{selectedSolution.unique_name}</code>
              </Text>
            </div>

            <Button
              appearance="primary"
              icon={<DocumentBulletListRegular />}
              onClick={() => navigate(`/test-suites?solutionId=${selectedSolution.id}`)}
            >
              Author Test Suites
            </Button>
          </div>

          <div className={styles.cardsGrid}>
            {/* Component Explorer Card */}
            <div className={styles.actionCard}>
              <div>
                <div className={styles.cardIconHeader}>
                  <TableRegular className={styles.cardIcon} />
                  <Text weight="semibold" style={{ fontSize: '15px' }}>
                    Components Explorer
                  </Text>
                </div>
                <Text style={{ fontSize: '13px', color: '#666', marginTop: '8px', display: 'block' }}>
                  Explore Dataverse Tables, schema attributes, Cloud Flows, and Copilot Studio Bot definitions extracted from this solution.
                </Text>
              </div>
              <Button
                appearance="outline"
                icon={<ArrowRightRegular />}
                iconPosition="after"
                onClick={() => navigate(`/components?solutionId=${selectedSolution.id}`)}
              >
                Inspect Components
              </Button>
            </div>

            {/* Markdown Doc Card */}
            <div className={styles.actionCard}>
              <div>
                <div className={styles.cardIconHeader}>
                  <DocumentTextRegular className={styles.cardIcon} />
                  <Text weight="semibold" style={{ fontSize: '15px' }}>
                    Architecture Specification
                  </Text>
                </div>
                <Text style={{ fontSize: '13px', color: '#666', marginTop: '8px', display: 'block' }}>
                  Read, copy, or download the synthesized architecture Markdown document detailing Dataverse models and testing contracts.
                </Text>
              </div>
              <Button
                appearance="outline"
                icon={<ArrowRightRegular />}
                iconPosition="after"
                onClick={() => navigate(`/markdown?solutionId=${selectedSolution.id}`)}
              >
                View Markdown Spec
              </Button>
            </div>

            {/* Test Suites Card */}
            <div className={styles.actionCard}>
              <div>
                <div className={styles.cardIconHeader}>
                  <DocumentBulletListRegular className={styles.cardIcon} />
                  <Text weight="semibold" style={{ fontSize: '15px' }}>
                    Test Suites &amp; Studio
                  </Text>
                </div>
                <Text style={{ fontSize: '13px', color: '#666', marginTop: '8px', display: 'block' }}>
                  Create or modify automated Playwright end-to-end test scenarios synthesized specifically for this solution.
                </Text>
              </div>
              <Button
                appearance="primary"
                icon={<ArrowRightRegular />}
                iconPosition="after"
                onClick={() => navigate(`/test-suites?solutionId=${selectedSolution.id}`)}
              >
                Open Test Studio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolutionsPage;
