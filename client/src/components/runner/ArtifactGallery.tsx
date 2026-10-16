import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  Title3,
  Text,
  Badge,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  CameraRegular,
  VideoRegular,
  ArrowDownloadRegular,
  OpenRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mediaPreview: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
    borderRadius: '4px',
    backgroundColor: '#000000',
    cursor: 'pointer',
  },
  traceCard: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#f3f2f1',
    border: '1px dashed #8a8886',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

interface ArtifactGalleryProps {
  artifacts: any[];
}

export const ArtifactGallery: React.FC<ArtifactGalleryProps> = ({ artifacts }) => {
  const styles = useStyles();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (artifacts.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: `1px solid ${tokens.colorNeutralStroke2}` }}>
        <CheckmarkCircleRegular style={{ fontSize: '36px', color: '#107c10', marginBottom: '8px' }} />
        <div style={{ fontWeight: '600' }}>No Failure Artifacts Captured</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          Screenshots and trace recordings are only captured upon assertion failures to conserve storage.
        </div>
      </div>
    );
  }

  const screenshots = artifacts.filter(a => a.type === 'screenshot');
  const videos = artifacts.filter(a => a.type === 'video');
  const traces = artifacts.filter(a => a.type === 'trace');

  return (
    <div className={styles.container}>
      {screenshots.length > 0 && (
        <div>
          <Title3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Failure Screenshots ({screenshots.length})
          </Title3>
          <div className={styles.grid}>
            {screenshots.map((s, idx) => (
              <div key={idx} className={styles.card}>
                <img
                  src={s.url}
                  alt={s.name}
                  className={styles.mediaPreview}
                  onClick={() => setSelectedImage(s.url)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text size={200} weight="semibold" truncate style={{ maxWidth: '180px' }}>
                    {s.name}
                  </Text>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ArrowDownloadRegular />}
                    onClick={() => window.open(s.url, '_blank')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Title3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Recorded Test Execution Videos ({videos.length})
          </Title3>
          <div className={styles.grid}>
            {videos.map((v, idx) => (
              <div key={idx} className={styles.card}>
                <video src={v.url} controls className={styles.mediaPreview} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text size={200} weight="semibold" truncate style={{ maxWidth: '180px' }}>
                    {v.name}
                  </Text>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ArrowDownloadRegular />}
                    onClick={() => window.open(v.url, '_blank')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {traces.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Title3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Playwright Execution Traces
          </Title3>
          <div className={styles.grid}>
            {traces.map((t, idx) => (
              <div key={idx} className={styles.traceCard}>
                <strong>{t.name}</strong>
                <Text size={200} style={{ color: '#666' }}>
                  Complete DOM snapshot, network logs, and step timeline.
                </Text>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <Button
                    size="small"
                    appearance="primary"
                    icon={<ArrowDownloadRegular />}
                    onClick={() => window.open(t.url, '_blank')}
                  >
                    Download Trace (.zip)
                  </Button>
                  <Button
                    size="small"
                    appearance="secondary"
                    icon={<OpenRegular />}
                    onClick={() => window.open('https://trace.playwright.dev', '_blank')}
                  >
                    Open in Trace Viewer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogSurface style={{ maxWidth: '90vw', width: 'auto', padding: '16px' }}>
          <DialogBody>
            <DialogTitle>Screenshot Inspection</DialogTitle>
            <DialogContent style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Screenshot"
                  style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '6px' }}
                />
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

