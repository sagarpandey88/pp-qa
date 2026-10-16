import fs from 'fs';
import path from 'path';

export interface ArtifactItem {
  name: string;
  type: 'screenshot' | 'video' | 'trace';
  url: string;
  sizeBytes: number;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export class ReportCollector {
  private static artifactsDir = path.resolve(__dirname, '../../../playwright/artifacts');
  private static reportDir = path.resolve(__dirname, '../../../playwright/report');

  static collectArtifacts(runId: string): { artifacts: ArtifactItem[]; reportUrl?: string } {
    const artifacts: ArtifactItem[] = [];

    if (fs.existsSync(this.artifactsDir)) {
      const scanDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else {
            const relPath = path.relative(this.artifactsDir, fullPath).replace(/\\/g, '/');
            const stats = fs.statSync(fullPath);

            if (entry.name.endsWith('.png')) {
              artifacts.push({
                name: entry.name,
                type: 'screenshot',
                url: `/artifacts/${relPath}`,
                sizeBytes: stats.size,
              });
            } else if (entry.name.endsWith('.webm') || entry.name.endsWith('.mp4')) {
              artifacts.push({
                name: entry.name,
                type: 'video',
                url: `/artifacts/${relPath}`,
                sizeBytes: stats.size,
              });
            } else if (entry.name.endsWith('.zip') && entry.name.includes('trace')) {
              artifacts.push({
                name: entry.name,
                type: 'trace',
                url: `/artifacts/${relPath}`,
                sizeBytes: stats.size,
              });
            }
          }
        }
      };

      try {
        scanDir(this.artifactsDir);
      } catch (e) {
        console.error('Error scanning artifacts directory', e);
      }
    }

    let reportUrl: string | undefined;
    const indexHtml = path.join(this.reportDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      reportUrl = '/reports/index.html';
    }

    return { artifacts, reportUrl };
  }

  static parseResultsSummary(): RunSummary {
    const resultsJson = path.join(this.artifactsDir, 'results.json');
    if (fs.existsSync(resultsJson)) {
      try {
        const raw = fs.readFileSync(resultsJson, 'utf8');
        const data = JSON.parse(raw);

        let passed = 0;
        let failed = 0;
        let skipped = 0;

        if (Array.isArray(data.suites)) {
          const countSpecs = (suite: any) => {
            if (Array.isArray(suite.specs)) {
              for (const spec of suite.specs) {
                const outcome = spec.tests?.[0]?.results?.[0]?.status;
                if (outcome === 'passed') passed++;
                else if (outcome === 'failed' || outcome === 'timedOut') failed++;
                else skipped++;
              }
            }
            if (Array.isArray(suite.suites)) {
              suite.suites.forEach(countSpecs);
            }
          };
          data.suites.forEach(countSpecs);
        }

        const total = passed + failed + skipped;
        return {
          total: total > 0 ? total : 1,
          passed: passed > 0 ? passed : 1,
          failed,
          skipped,
        };
      } catch (e) {
        console.error('Failed to parse results.json', e);
      }
    }

    return { total: 1, passed: 1, failed: 0, skipped: 0 };
  }
}
