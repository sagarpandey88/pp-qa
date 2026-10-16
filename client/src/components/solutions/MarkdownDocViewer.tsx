import React, { useState } from 'react';
import {
  Button,
  Card,
  Title3,
  Text,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  CopyRegular,
  ArrowDownloadRegular,
  CheckmarkRegular,
  DocumentTextRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  markdownArea: {
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '20px',
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    maxHeight: '650px',
    overflowY: 'auto',
    color: tokens.colorNeutralForeground1,
  },
});

interface MarkdownDocViewerProps {
  markdown: string;
  solutionName: string;
}

export const MarkdownDocViewer: React.FC<MarkdownDocViewerProps> = ({ markdown, solutionName }) => {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${solutionName}-specification.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DocumentTextRegular style={{ fontSize: '20px', color: '#0078d4' }} />
          <Title3 style={{ fontSize: '16px', margin: 0 }}>
            Generated Solution Specification: {solutionName}
          </Title3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            appearance="secondary"
            size="small"
            icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Markdown'}
          </Button>
          <Button
            appearance="primary"
            size="small"
            icon={<ArrowDownloadRegular />}
            onClick={handleDownload}
          >
            Download .md
          </Button>
        </div>
      </div>

      <pre className={styles.markdownArea}>{markdown}</pre>
    </div>
  );
};

