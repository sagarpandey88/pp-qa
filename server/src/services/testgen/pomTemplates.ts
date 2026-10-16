import fs from 'fs';
import path from 'path';

/**
 * Power Platform & Copilot Studio Page Object Model (POM) Templates
 * Modeled after patterns from `microsoft/power-platform-playwright-samples`
 */

function loadPomSourceCode(): string {
  const candidates = [
    path.resolve(__dirname, '../../playwright/templates/pom.ts'),
    path.resolve(__dirname, '../../../playwright/templates/pom.ts'),
    path.resolve(process.cwd(), 'server/playwright/templates/pom.ts'),
    path.resolve(process.cwd(), 'playwright/templates/pom.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf8');
    }
  }

  return '';
}

export const POM_SOURCE_CODE: string = loadPomSourceCode();

export function getPomSourceCode(): string {
  return loadPomSourceCode();
}
