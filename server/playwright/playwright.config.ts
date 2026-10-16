import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './generated-tests',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  outputDir: './artifacts',
  reporter: [
    ['html', { outputFolder: './report', open: 'never' }],
    ['json', { outputFile: './artifacts/results.json' }],
    ['list'],
  ],
  use: {
    actionTimeout: 15000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on',
    headless: true,
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

