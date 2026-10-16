import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

async function main() {
  const envUrl = process.env.MS_ENVIRONMENT_URL || 'https://org368cdfbd.crm8.dynamics.com';
  const email = process.env.MS_AUTH_EMAIL || 'user@contoso.onmicrosoft.com';
  const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
  const authDir = path.resolve(__dirname, '../../../playwright/.playwright-ms-auth');

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const mdaSessionFile = path.join(authDir, `state-mda-${cleanEmail}.json`);
  const defaultSessionFile = path.join(authDir, 'state-mda-default.json');

  console.log('\n============================================================');
  console.log('  Power Platform & Dynamics 365 MFA Session Capture Utility');
  console.log('============================================================');
  console.log(` Target Environment : ${envUrl}`);
  console.log(` Target Test Email  : ${email}`);
  console.log(` Destination Path   : ${mdaSessionFile}`);
  console.log('------------------------------------------------------------');
  console.log(' Launching headed browser...');
  console.log(' Instructions:');
  console.log(' 1. Enter your email and password.');
  console.log(' 2. Approve your MFA prompt (Authenticator App, SMS, etc.).');
  console.log(' 3. Select "Yes" to "Stay signed in?".');
  console.log(' 4. Once the Dynamics / Power Apps page loads, this tool');
  console.log('    will automatically capture the authenticated cookies');
  console.log('    and close the browser.');
  console.log('============================================================\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  try {
    await page.goto(envUrl, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for user login and MFA approval (timeout: 5 minutes)...');

    // Wait until URL leaves Microsoft sign-in pages
    await page.waitForURL(
      (url) => !url.hostname.includes('login.microsoftonline.com') && !url.hostname.includes('login.live.com'),
      { timeout: 300000 }
    );

    // Give browser a moment to persist all Dataverse session cookies
    await page.waitForTimeout(4000);

    // Save storageState
    await context.storageState({ path: mdaSessionFile });
    fs.copyFileSync(mdaSessionFile, defaultSessionFile);

    console.log('\n============================================================');
    console.log(' [SUCCESS] Authenticated session successfully captured!');
    console.log(` [SESSION] Saved to: ${mdaSessionFile}`);
    console.log(' [SESSION] Saved to: ${defaultSessionFile}');
    console.log(' All subsequent headless Playwright runs will reuse this');
    console.log(' session without prompting for login or MFA.');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n[ERROR] Session capture was cancelled or timed out:', err.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

