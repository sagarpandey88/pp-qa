import React, { useEffect, useRef, useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Badge,
  Button,
} from '@fluentui/react-components';
import {
  CopyRegular,
  DeleteRegular,
  CheckmarkRegular,
  CircleFilled,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#121212',
    color: '#00ff66',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    overflow: 'hidden',
    height: '420px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#1f1f1f',
    borderBottom: '1px solid #333',
    color: '#ffffff',
  },
  terminal: {
    flex: 1,
    padding: '12px 16px',
    fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '6px',
  },
});

interface LiveLogConsoleProps {
  runId: string;
  initialLogs?: string;
  isLive?: boolean;
}

export const LiveLogConsole: React.FC<LiveLogConsoleProps> = ({
  runId,
  initialLogs = '',
  isLive = false,
}) => {
  const styles = useStyles();
  const [logs, setLogs] = useState<string[]>(initialLogs ? initialLogs.split('\n') : []);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs.split('\n'));
    }
  }, [initialLogs]);

  useEffect(() => {
    if (!runId || !isLive) return;

    const eventSource = new EventSource(`/api/runs/${runId}/logs`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.line) {
          setLogs(prev => [...prev, data.line]);
        }
        if (data.done) {
          eventSource.close();
        }
      } catch (e) {
        console.error('Failed to parse SSE log', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId, isLive]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CircleFilled
            style={{
              fontSize: '10px',
              color: isLive ? '#00e676' : '#888888',
            }}
          />
          <Text size={200} weight="semibold" style={{ color: '#fff' }}>
            Live Playwright Console Log Terminal {isLive && '(Streaming)'}
          </Text>
        </div>

        <div className={styles.actions}>
          <Button
            size="small"
            appearance="subtle"
            style={{ color: '#ccc' }}
            icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            size="small"
            appearance="subtle"
            style={{ color: '#ccc' }}
            icon={<DeleteRegular />}
            onClick={handleClear}
          />
        </div>
      </div>

      <pre className={styles.terminal}>
        {logs.length === 0 ? (
          <span style={{ color: '#666' }}>Waiting for runner execution stream output...</span>
        ) : (
          logs.map((line, idx) => {
            let color = '#d4d4d4';
            if (line.includes('[SYSTEM]')) color = '#00b0ff';
            if (line.includes('[AUTH]')) color = '#b388ff';
            if (line.includes('[PLAYWRIGHT]')) color = '#69f0ae';
            if (line.includes('[REPORTER]')) color = '#ffd740';
            if (line.includes('[STDERR]') || line.includes('[FATAL]') || line.includes('failed')) color = '#ff5252';

            return (
              <div key={idx} style={{ color }}>
                {line}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </pre>
    </div>
  );
};

