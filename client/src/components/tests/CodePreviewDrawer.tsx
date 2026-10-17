import React, { useState } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  DrawerFooter,
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  DismissRegular,
  CopyRegular,
  ArrowDownloadRegular,
  PlayRegular,
  CheckmarkRegular,
  CodeRegular,
  SparkleRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  drawer: {
    width: '680px',
    maxWidth: '90vw',
  },
  body: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  codeArea: {
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    padding: '16px',
    borderRadius: '8px',
    flex: 1,
    overflowY: 'auto',
    whiteSpace: 'pre',
    margin: 0,
    border: '1px solid #333',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
});

interface CodePreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  suiteTitle: string;
  code: string;
  onRunSuite?: () => void;
  isRunning?: boolean;
  onResynthesizeAi?: () => void;
  isSynthesizing?: boolean;
  onOpenStudio?: () => void;
}

export const CodePreviewDrawer: React.FC<CodePreviewDrawerProps> = ({
  open,
  onClose,
  suiteTitle,
  code,
  onRunSuite,
  isRunning,
  onResynthesizeAi,
  isSynthesizing,
  onOpenStudio,
}) => {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${suiteTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.spec.ts`;
    const blob = new Blob([code], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer
      type="overlay"
      position="end"
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
      className={styles.drawer}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={onClose}
            />
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CodeRegular style={{ color: '#0078d4', fontSize: '20px' }} />
            <span>Playwright TypeScript Code Preview</span>
          </div>
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody className={styles.body}>
        <div className={styles.toolbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge appearance="filled" color="brand">TypeScript</Badge>
            <Badge appearance="outline">@playwright/test</Badge>
          </div>

          <div className={styles.actions}>
            {onOpenStudio && (
              <Button
                size="small"
                appearance="primary"
                icon={<SparkleRegular />}
                onClick={() => {
                  onClose();
                  onOpenStudio();
                }}
              >
                Modify with AI Studio
              </Button>
            )}
            {onResynthesizeAi && (
              <Button
                size="small"
                appearance="subtle"
                icon={<SparkleRegular style={{ color: '#0078d4' }} />}
                onClick={onResynthesizeAi}
                disabled={isSynthesizing}
              >
                {isSynthesizing ? 'Re-synthesizing...' : 'Re-synthesize with AI'}
              </Button>
            )}
            <Button
              size="small"
              appearance="secondary"
              icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              size="small"
              appearance="secondary"
              icon={<ArrowDownloadRegular />}
              onClick={handleDownload}
            >
              Download .spec.ts
            </Button>
            {onRunSuite && (
              <Button
                size="small"
                appearance="primary"
                icon={<PlayRegular />}
                onClick={onRunSuite}
                disabled={isRunning}
              >
                {isRunning ? 'Running...' : 'Run Test Suite'}
              </Button>
            )}
          </div>
        </div>

        <pre className={styles.codeArea}>{code}</pre>
      </DrawerBody>
    </Drawer>
  );
};

