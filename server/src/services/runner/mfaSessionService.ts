import { chromium, Browser } from 'playwright';
import path from 'path';
import fs from 'fs';
import { config } from '../../config/env';

export interface SessionStatus {
  hasActiveSession: boolean;
  sessionFile: string | null;
  lastCapturedAt: string | null;
  isCapturing: boolean;
  captureStatus: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
  captureMessage: string | null;
}

export class MfaSessionService {
  private static authDir = path.resolve(__dirname, '../../../playwright/.playwright-ms-auth');
  private static rootAuthDir = path.resolve(__dirname, '../../../../playwright/.playwright-ms-auth');
  private static activeBrowser: Browser | null = null;
  private static isCapturing = false;
  private static captureStatus: 'idle' | 'running' | 'success' | 'error' | 'cancelled' = 'idle';
  private static captureMessage: string | null = null;
  private static lastCapturedAt: string | null = null;

  private static ensureDir(): void {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    if (!fs.existsSync(this.rootAuthDir)) {
      try {
        fs.mkdirSync(this.rootAuthDir, { recursive: true });
      } catch (e) {}
    }
  }

  static getStatus(email?: string): SessionStatus {
    this.ensureDir();
    const targetEmail = (email || config.MS_AUTH_EMAIL || 'default').replace(/[^a-zA-Z0-9]/g, '_');
    const specificFile = path.join(this.authDir, `state-mda-${targetEmail}.json`);
    const defaultFile = path.join(this.authDir, 'state-mda-default.json');
    const rootDefaultFile = path.join(this.rootAuthDir, 'state-mda-default.json');
    const rootSpecificFile = path.join(this.rootAuthDir, `state-mda-${targetEmail}.json`);

    // Sync from root if missing in server dir
    if (!fs.existsSync(defaultFile) && fs.existsSync(rootDefaultFile)) {
      try { fs.copyFileSync(rootDefaultFile, defaultFile); } catch (e) {}
    }
    if (!fs.existsSync(specificFile) && fs.existsSync(rootSpecificFile)) {
      try { fs.copyFileSync(rootSpecificFile, specificFile); } catch (e) {}
    }

    const hasSpecific = fs.existsSync(specificFile);
    const hasDefault = fs.existsSync(defaultFile);
    const activeFile = hasSpecific ? specificFile : (hasDefault ? defaultFile : null);

    let lastModified: string | null = this.lastCapturedAt;
    if (activeFile && !lastModified) {
      try {
        const stats = fs.statSync(activeFile);
        lastModified = stats.mtime.toISOString();
      } catch (e) {}
    }

    return {
      hasActiveSession: !!activeFile,
      sessionFile: activeFile ? path.basename(activeFile) : null,
      lastCapturedAt: lastModified,
      isCapturing: this.isCapturing,
      captureStatus: this.captureStatus,
      captureMessage: this.captureMessage,
    };
  }

  static async launchInteractiveCapture(
    options?: { environmentUrl?: string; email?: string }
  ): Promise<{ success: boolean; message: string }> {
    if (this.isCapturing) {
      return { success: false, message: 'A session capture is already in progress.' };
    }

    this.ensureDir();
    const envUrl = (options?.environmentUrl || config.MS_ENVIRONMENT_URL || 'https://org368cdfbd.crm8.dynamics.com').trim();
    const email = (options?.email || config.MS_AUTH_EMAIL || 'user@contoso.onmicrosoft.com').trim();
    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');

    const mdaSessionFile = path.join(this.authDir, `state-mda-${cleanEmail}.json`);
    const defaultSessionFile = path.join(this.authDir, 'state-mda-default.json');

    this.isCapturing = true;
    this.captureStatus = 'running';
    this.captureMessage = 'Browser window opened. Please complete your login and approve the MFA challenge.';

    // Run asynchronously without blocking the Express response
    (async () => {
      try {
        console.log(`[MFA SESSION] Launching interactive browser for ${envUrl}...`);
        const browser = await chromium.launch({
          headless: false,
          args: ['--start-maximized'],
        });
        this.activeBrowser = browser;

        const context = await browser.newContext({ viewport: null });
        const page = await context.newPage();

        await page.goto(envUrl, { waitUntil: 'domcontentloaded' });

        // Wait up to 5 minutes for login + MFA completion
        await page.waitForURL(
          (url) => !url.hostname.includes('login.microsoftonline.com') && !url.hostname.includes('login.live.com'),
          { timeout: 300000 }
        );

        // Wait for session cookies to settle
        await page.waitForTimeout(4000);

        // Save session state
        await context.storageState({ path: mdaSessionFile });
        fs.copyFileSync(mdaSessionFile, defaultSessionFile);

        // Also ensure spadmin file is overwritten so test runs default to the authenticated session
        const spadminFile = path.join(this.authDir, 'state-mda-spadmin_contoso_onmicrosoft_com.json');
        try { fs.copyFileSync(mdaSessionFile, spadminFile); } catch (e) {}

        // Mirror to root auth directory
        try {
          if (!fs.existsSync(this.rootAuthDir)) fs.mkdirSync(this.rootAuthDir, { recursive: true });
          fs.copyFileSync(mdaSessionFile, path.join(this.rootAuthDir, path.basename(mdaSessionFile)));
          fs.copyFileSync(mdaSessionFile, path.join(this.rootAuthDir, 'state-mda-default.json'));
          fs.copyFileSync(mdaSessionFile, path.join(this.rootAuthDir, 'state-mda-spadmin_contoso_onmicrosoft_com.json'));
        } catch (e) {}

        this.lastCapturedAt = new Date().toISOString();
        this.captureStatus = 'success';
        this.captureMessage = 'Authenticated MFA session captured successfully!';
        console.log(`[MFA SESSION] Successfully captured and saved to ${mdaSessionFile}`);

        await browser.close();
      } catch (err: any) {
        console.error('[MFA SESSION] Session capture error:', err.message);
        this.captureStatus = err.message?.includes('Target page, context or browser has been closed')
          ? 'cancelled'
          : 'error';
        this.captureMessage = err.message;
      } finally {
        this.isCapturing = false;
        this.activeBrowser = null;
      }
    })();

    return {
      success: true,
      message: 'Browser window launched. Complete your sign-in and MFA in the opened browser.',
    };
  }

  static async cancelCapture(): Promise<void> {
    if (this.activeBrowser) {
      await this.activeBrowser.close().catch(() => {});
      this.activeBrowser = null;
    }
    this.isCapturing = false;
    this.captureStatus = 'cancelled';
    this.captureMessage = 'Session capture was cancelled.';
  }

  static importSession(sessionData: any, email?: string): boolean {
    this.ensureDir();
    const cleanEmail = (email || config.MS_AUTH_EMAIL || 'default').replace(/[^a-zA-Z0-9]/g, '_');
    const mdaSessionFile = path.join(this.authDir, `state-mda-${cleanEmail}.json`);
    const defaultSessionFile = path.join(this.authDir, 'state-mda-default.json');

    const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    if (!parsed || (!parsed.cookies && !parsed.origins)) {
      throw new Error('Invalid storageState JSON: missing cookies or origins array.');
    }

    fs.writeFileSync(mdaSessionFile, JSON.stringify(parsed, null, 2), 'utf8');
    fs.writeFileSync(defaultSessionFile, JSON.stringify(parsed, null, 2), 'utf8');

    const spadminFile = path.join(this.authDir, 'state-mda-spadmin_contoso_onmicrosoft_com.json');
    try { fs.writeFileSync(spadminFile, JSON.stringify(parsed, null, 2), 'utf8'); } catch (e) {}

    try {
      if (!fs.existsSync(this.rootAuthDir)) fs.mkdirSync(this.rootAuthDir, { recursive: true });
      fs.writeFileSync(path.join(this.rootAuthDir, path.basename(mdaSessionFile)), JSON.stringify(parsed, null, 2), 'utf8');
      fs.writeFileSync(path.join(this.rootAuthDir, 'state-mda-default.json'), JSON.stringify(parsed, null, 2), 'utf8');
      fs.writeFileSync(path.join(this.rootAuthDir, 'state-mda-spadmin_contoso_onmicrosoft_com.json'), JSON.stringify(parsed, null, 2), 'utf8');
    } catch (e) {}

    this.lastCapturedAt = new Date().toISOString();
    this.captureStatus = 'success';
    this.captureMessage = 'Session state imported successfully.';
    return true;
  }
}

