import { Page, Locator, expect } from '@playwright/test';
import crypto from 'crypto';

/**
 * Computes standard 6-digit TOTP (RFC 6238) for 2FA verification.
 */
export function generateTOTP(secretBase32: string): string {
  const cleanSecret = secretBase32.replace(/[\s-]/g, '').toUpperCase();
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < cleanSecret.length; i++) {
    const val = base32chars.indexOf(cleanSecret.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const time = Buffer.alloc(8);
  time.writeBigInt64BE(BigInt(Math.floor(epoch / 30)));
  const hmac = crypto.createHmac('sha1', key).update(time).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

/**
 * LoginPage: Automates Microsoft Entra ID / Dynamics 365 sign-in flows.
 */
export class LoginPage {
  constructor(private page: Page) {}

  /**
   * Checks whether the current page is on a Microsoft / Entra ID sign-in screen or OAuth redirection.
   */
  async isLoginPage(): Promise<boolean> {
    const url = this.page.url();
    if (
      url.includes('login.microsoftonline.com') ||
      url.includes('login.live.com') ||
      url.includes('login.windows.net') ||
      url.includes('msft.sts.microsoft.com') ||
      url.includes('/oauth2') ||
      url.includes('/signin')
    ) {
      return true;
    }

    try {
      const emailField = this.page.locator('input[type="email"], input[name="loginfmt"], #i0116').first();
      return await emailField.isVisible({ timeout: 1500 });
    } catch {
      return false;
    }
  }

  /**
   * Performs the automated login prestep.
   */
  async login(email?: string, password?: string): Promise<boolean> {
    const targetEmail = (email || process.env.PP_USER_EMAIL || process.env.MS_AUTH_EMAIL || '').trim();
    const targetPassword = (password || process.env.PP_USER_PASSWORD || process.env.MS_USER_PASSWORD || '').trim();

    console.log(`[AUTH PRESTEP] Checking Microsoft sign-in state on: ${this.page.url()}`);

    // Check for "Pick an account" tile
    try {
      const accountTile = this.page.locator(
        targetEmail
          ? `div[data-test-id*="accountTile"]:has-text("${targetEmail}"), div[role="button"]:has-text("${targetEmail}"), .table-cell:has-text("${targetEmail}")`
          : 'div[data-test-id*="accountTile"], .table-cell[data-test-id]'
      ).first();

      if (await accountTile.isVisible({ timeout: 2000 })) {
        console.log('[AUTH PRESTEP] Selecting remembered Microsoft account tile');
        await accountTile.click();
        await this.page.waitForTimeout(1000);
      }
    } catch (e) {}

    // 1. Enter email/username
    try {
      const emailInput = this.page.locator('input[type="email"], input[name="loginfmt"], #i0116').first();
      if (await emailInput.isVisible({ timeout: 3500 })) {
        if (!targetEmail) {
          throw new Error(
            `Microsoft Entra ID sign-in required at "${this.page.url()}", but no username/email was configured. ` +
            `Please set MS_AUTH_EMAIL and MS_USER_PASSWORD in Settings or .env.`
          );
        }
        console.log(`[AUTH PRESTEP] Submitting username: ${targetEmail}`);
        await emailInput.fill(targetEmail);

        const nextBtn = this.page.locator('input[type="submit"], button[type="submit"], #idSIButton9, input[value="Next"]').first();
        await nextBtn.click();
        await this.page.waitForTimeout(1500);
      }
    } catch (err: any) {
      if (err.message?.includes('Microsoft Entra ID sign-in required')) throw err;
    }

    // 2. Enter password
    try {
      const passwordInput = this.page.locator('input[type="password"], input[name="passwd"], #i0118').first();
      if (await passwordInput.isVisible({ timeout: 10000 })) {
        if (!targetPassword) {
          throw new Error(
            `Microsoft Entra ID password required for "${targetEmail || 'user'}", but no password was configured. ` +
            `Please set MS_USER_PASSWORD in Settings or .env.`
          );
        }
        console.log('[AUTH PRESTEP] Submitting password credentials...');
        await passwordInput.fill(targetPassword);

        const signInBtn = this.page.locator('input[type="submit"], button[type="submit"], #idSIButton9, input[value="Sign in"]').first();
        await signInBtn.click();
        await this.page.waitForTimeout(2000);
      }
    } catch (err: any) {
      if (err.message?.includes('Microsoft Entra ID password required')) throw err;
    }

    // 2.5. Handle MFA verification (TOTP / Authenticator / Number Matching)
    try {
      const totpSecret = (process.env.PP_TOTP_SECRET || process.env.MS_TOTP_SECRET || '').trim();
      const totpInput = this.page.locator('#idTxtBx_SAOTCC_OTC, input[name="otc"], input[type="tel"]').first();

      if (await totpInput.isVisible({ timeout: 4000 })) {
        if (totpSecret) {
          console.log('[AUTH PRESTEP] Generating and submitting TOTP 6-digit MFA code...');
          const code = generateTOTP(totpSecret);
          await totpInput.fill(code);
          const verifyBtn = this.page.locator('#idSubmit_SAOTCC_Continue, input[type="submit"], button[type="submit"]').first();
          await verifyBtn.click();
          await this.page.waitForTimeout(2000);
        } else {
          throw new Error(
            `Multi-Factor Authentication (MFA) required at "${this.page.url()}". ` +
            `To resolve: run "npm run auth:capture" to save a persistent session, or set MS_TOTP_SECRET in Settings or .env.`
          );
        }
      }

      // Check for Microsoft Authenticator number matching challenge
      const numberMatch = this.page.locator('#idRichContext_DisplaySign').first();
      if (await numberMatch.isVisible({ timeout: 2000 })) {
        const num = await numberMatch.textContent();
        console.log(`[AUTH PRESTEP MFA] Microsoft Authenticator Number Matching Challenge: ${num?.trim()}`);
      }
    } catch (err: any) {
      if (err.message?.includes('Multi-Factor Authentication (MFA) required')) throw err;
    }

    // 3. Confirm KMSI ("Stay signed in?") prompt
    try {
      const kmsiBtn = this.page.locator('#idSIButton9, input[value="Yes"], button:has-text("Yes")').first();
      if (await kmsiBtn.isVisible({ timeout: 5000 })) {
        console.log('[AUTH PRESTEP] Confirming "Stay signed in" prompt...');
        await kmsiBtn.click();
        await this.page.waitForTimeout(1500);
      }
    } catch (e) {}

    // 4. Accept OAuth consent if presented
    try {
      const acceptBtn = this.page.locator('input[value="Accept"], button:has-text("Accept"), button:has-text("Continue")').first();
      if (await acceptBtn.isVisible({ timeout: 2500 })) {
        console.log('[AUTH PRESTEP] Accepting application permissions consent...');
        await acceptBtn.click();
        await this.page.waitForTimeout(1500);
      }
    } catch (e) {}

    // 5. Wait for navigation away from login.microsoftonline.com
    try {
      await this.page.waitForURL(
        (url) => !url.hostname.includes('login.microsoftonline.com') && !url.hostname.includes('login.live.com'),
        { timeout: 30000 }
      );
      console.log(`[AUTH PRESTEP] Redirection completed. Current page: ${this.page.url()}`);
    } catch (e) {
      if (await this.isLoginPage()) {
        throw new Error(
          `Login flow did not redirect away from Microsoft Sign-in (${this.page.url()}). ` +
          `Please verify credentials or multi-factor authentication (MFA) requirements.`
        );
      }
    }

    // 6. Save authenticated storageState for subsequent tests
    const storagePath = process.env.PLAYWRIGHT_STORAGE_STATE;
    if (storagePath) {
      try {
        await this.page.context().storageState({ path: storagePath });
        console.log(`[AUTH PRESTEP] Saved authenticated session to storageState: ${storagePath}`);
      } catch (e) {}
    }

    return true;
  }
}

/**
 * AppProvider: Manages app launching, environment navigation, and global ready states.
 */
export class AppProvider {
  constructor(private page: Page) {}

  async navigateToApp(appUrl: string, options?: { skipLogin?: boolean; targetAppName?: string }): Promise<void> {
    await this.page.goto(appUrl, { waitUntil: 'domcontentloaded' });

    // Login prestep: check if redirected to Microsoft sign-in
    if (!options?.skipLogin) {
      const loginPage = new LoginPage(this.page);
      if (await loginPage.isLoginPage()) {
        await loginPage.login();
      }
    }

    // If landed on the Power Apps / Dynamics apps catalog dashboard, select target app
    await this.selectAppIfOnAppsDashboard(options?.targetAppName);

    await this.waitForAppReady();
  }

  async selectAppIfOnAppsDashboard(targetAppName?: string): Promise<void> {
    const url = this.page.url();
    if (url.includes('pagetype=apps') || url.includes('/apps')) {
      console.log(`[APP PROVIDER] Detected Power Apps app catalog dashboard (${url}). Searching for app tile...`);
      await this.page.waitForTimeout(3000);
      const appLandingFrame = this.page.frame({ name: 'AppLandingPage' });
      const contextToSearch = appLandingFrame || this.page;

      if (targetAppName) {
        const namedTile = contextToSearch.locator(`text="${targetAppName}"`).first();
        if (await namedTile.isVisible({ timeout: 4000 }).catch(() => false)) {
          console.log(`[APP PROVIDER] Opening target app: "${targetAppName}"`);
          await namedTile.click();
          await this.page.waitForTimeout(4000);
          return;
        }
      }

      // Check for available model-driven apps on tenant
      const candidateLocators = [
        contextToSearch.locator('text=Employee Management').first(),
        contextToSearch.locator('text=Customer Service Hub').first(),
        contextToSearch.locator('div[role="button"]:has(.ms-Tile), a[role="button"]').first(),
      ];

      for (const loc of candidateLocators) {
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          const text = await loc.textContent().catch(() => '');
          console.log(`[APP PROVIDER] Opening available model-driven app: "${text?.trim()}"`);
          await loc.click();
          await this.page.waitForTimeout(4000);
          return;
        }
      }
    }
  }

  async waitForAppReady(timeoutMs = 30000): Promise<void> {
    // Check if still halted on login screen
    const loginPage = new LoginPage(this.page);
    if (await loginPage.isLoginPage()) {
      throw new Error(
        `Navigation halted at Microsoft Sign-in page (${this.page.url()}). ` +
        `Unable to reach target app. Please set MS_AUTH_EMAIL and MS_USER_PASSWORD in Settings or .env.`
      );
    }

    // Wait for Dataverse root container or app shell
    await this.page.waitForSelector(
      '[data-id="main-container"], [role="main"], [data-id="app-container"], #mainContent, [data-control-name="App"]',
      { timeout: timeoutMs }
    ).catch(async () => {
      // Fallback: If custom container, ensure at least document body is ready
      await this.page.waitForSelector('body', { timeout: 5000 });
    });

    // Wait for Microsoft Dataverse client-side loading spinners (ms-spinner) to detach
    try {
      await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
        state: 'detached',
        timeout: 10000,
      });
    } catch (e) {
      // Spinner may already be gone
    }
  }

  async waitForNetworkIdle(idleMs = 500): Promise<void> {
    try {
      if (this.page.isClosed()) return;

      // In Power Platform / Dataverse, networkidle should never block test execution
      // due to continuous background telemetry, keep-alives, and SignalR polling.
      // Wait for DOM readiness and ensure client-side loading spinners are detached.
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
        state: 'detached',
        timeout: 5000,
      }).catch(() => {});

      if (!this.page.isClosed() && idleMs > 0) {
        await this.page.waitForTimeout(idleMs).catch(() => {});
      }
    } catch (e) {
      // Safe fallback if page/context is closed during test execution or teardown
    }
  }
}

/**
 * ModelDrivenAppPage: Handles command bar buttons, form headers, dialogs, and navigation tabs.
 * Modeled after patterns from `microsoft/power-platform-playwright-samples`.
 */
export class ModelDrivenAppPage {
  constructor(private page: Page) {}

  async clickCommandButton(label: string, options?: { timeout?: number; optional?: boolean }): Promise<void> {
    const isResults = label.toLowerCase() === 'results';
    const isEdit = label.toLowerCase() === 'edit';

    // 1. Search in Entity Command Bar first (exclude Global commands menubar)
    const entityCommandSelector = isResults
      ? `[role="menubar"]:not([aria-label*="Global" i]) button[aria-label*="Results" i], [role="menubar"]:not([aria-label*="Global" i]) button[aria-label*="Apply" i], [role="menubar"]:not([aria-label*="Global" i]) [role="menuitem"]:has-text("Apply")`
      : `[role="menubar"]:not([aria-label*="Global" i]) button[aria-label*="${label}" i], [role="menubar"]:not([aria-label*="Global" i]) [role="menuitem"][aria-label*="${label}" i], [role="menubar"]:not([aria-label*="Global" i]) button:has-text("${label}"), [role="menubar"]:not([aria-label*="Global" i]) [role="menuitem"]:has-text("${label}"), [role="menubar"]:not([aria-label*="Global" i]) [data-id*="${label}" i]`;

    // 2. Global fallback selector
    const fallbackSelector = isResults
      ? `button[aria-label*="Results" i], button[aria-label*="Apply" i], button:has-text("Results"), button:has-text("Apply"), [data-id*="Results" i], [data-id*="Apply" i], button:has-text("Continue")`
      : `button[aria-label*="${label}" i], [role="menuitem"][aria-label*="${label}" i], button:has-text("${label}"), [role="menuitem"]:has-text("${label}"), [data-id*="${label}" i]`;

    const waitTimeout = options?.timeout ?? (options?.optional || isEdit ? 3000 : 15000);

    let button = this.page.locator(entityCommandSelector).first();
    if (await button.isVisible({ timeout: 2500 }).catch(() => false)) {
      await button.click();
    } else {
      button = this.page.locator(fallbackSelector).first();
      try {
        await button.waitFor({ state: 'visible', timeout: waitTimeout });
        await button.click();
      } catch (err: any) {
        if (options?.optional) {
          return;
        }
        if (isEdit) {
          const hasInputs = await this.page.locator('input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])').first().isVisible().catch(() => false);
          if (hasInputs) {
            return;
          }
        }
        throw err;
      }
    }

    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(600).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 6000,
        });
      } catch (e) {}
    }
  }

  /**
   * Clicks a command bar button if visible, otherwise ignores without throwing.
   */
  async clickCommandButtonIfVisible(label: string, timeoutMs = 3000): Promise<boolean> {
    try {
      await this.clickCommandButton(label, { timeout: timeoutMs, optional: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handles modern Advanced Find: if the "Select a table to search" dialog is open,
   * searches for and selects the target table, then clicks "Continue".
   */
  async selectAdvancedFindTable(tableName: string): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Select a table to search' }).first();
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      const searchBox = dialog.locator('input[type="search"], [role="searchbox"], input').first();
      if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchBox.fill(tableName);
        await this.page.waitForTimeout(500);
      }
      const radioOrCell = dialog.locator(`[role="radio"]:has-text("${tableName}"), [role="gridcell"]:has-text("${tableName}"), text="${tableName}"`).first();
      if (await radioOrCell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await radioOrCell.click();
        await this.page.waitForTimeout(400);
      }

      const continueBtn = dialog.locator('button:has-text("Continue"), button[aria-label*="Continue" i]').first();
      if (await continueBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await continueBtn.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Closes any open modal dialog if present.
   */
  async closeDialog(): Promise<void> {
    const closeBtn = this.page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[aria-label*="Close" i]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Alias matching microsoft/power-platform-playwright-samples API
   */
  async clickCommandBarButton(label: string): Promise<void> {
    await this.clickCommandButton(label);
  }

  async saveAndClose(): Promise<void> {
    const saveAndCloseBtn = this.page.locator(
      `[role="menubar"]:not([aria-label*="Global" i]) button[aria-label*="Save & Close" i], [role="menubar"]:not([aria-label*="Global" i]) [role="menuitem"][aria-label*="Save & Close" i], button[aria-label*="Save & Close" i], [role="menuitem"][aria-label*="Save & Close" i], [data-id*="SaveAndClose" i]`
    ).first();

    if (await saveAndCloseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveAndCloseBtn.click();
    } else {
      try {
        await this.page.evaluate(() => {
          const xrm = (window as any).Xrm;
          if (xrm?.Page?.data?.entity?.save) {
            return xrm.Page.data.entity.save('saveandclose');
          }
        }).catch(() => {});
      } catch (e) {}
    }

    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(1000).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 8000,
        });
      } catch (e) {}
    }
  }

  async save(): Promise<void> {
    const saveBtn = this.page.locator(
      `[role="menubar"]:not([aria-label*="Global" i]) button[aria-label*="Save" i]:not([aria-label*="Close" i]), [role="menubar"]:not([aria-label*="Global" i]) [role="menuitem"][aria-label*="Save" i]:not([aria-label*="Close" i]), button[aria-label*="Save" i]:not([aria-label*="Close" i]), [role="menuitem"][aria-label*="Save" i]:not([aria-label*="Close" i]), [data-id*="SaveButton" i]`
    ).first();

    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
    } else {
      try {
        await this.page.evaluate(() => {
          const xrm = (window as any).Xrm;
          if (xrm?.Page?.data?.entity?.save) {
            return xrm.Page.data.entity.save();
          }
        }).catch(() => {});
      } catch (e) {}
    }

    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(1000).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 8000,
        });
      } catch (e) {}
    }
  }

  async confirmDialog(buttonText?: string): Promise<void> {
    const selector = buttonText
      ? `[role="dialog"] button:has-text("${buttonText}"), [role="dialog"] button[aria-label*="${buttonText}" i], [role="dialog"] button:has-text("Deactivate"), [role="dialog"] button:has-text("Activate"), [role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("OK"), [data-id="confirmButton"]:has-text("${buttonText}"), button[data-id="ok_id"]`
      : '[role="dialog"] button:has-text("Deactivate"), [role="dialog"] button:has-text("Activate"), [role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("OK"), button[data-id="ok_id"], button[data-id="confirmButton"]';

    const dialogBtn = this.page.locator(selector).first();
    if (await dialogBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogBtn.click();
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(1000).catch(() => {});
      }
    }
  }

  async switchTab(tabLabel: string): Promise<void> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabLabel}")`).first();
    await tab.waitFor({ state: 'visible', timeout: 10000 });
    await tab.click();
    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(400).catch(() => {});
    }
  }

  /**
   * Navigates to a sitemap entity sub-area (e.g. "Employees", "Accounts", "Cases")
   */
  async navigateToSubArea(subAreaName: string): Promise<void> {
    const item = this.page.locator(
      `[data-id="sitemap-node-${subAreaName}" i], [role="treeitem"]:has-text("${subAreaName}"), [data-text="${subAreaName}"], [aria-label*="${subAreaName}" i], nav a:has-text("${subAreaName}")`
    ).first();
    await item.waitFor({ state: 'visible', timeout: 15000 });
    await item.click();

    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(600).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 8000,
        });
      } catch (e) {}
    }
  }
}

/**
 * GridComponent: Handles Dataverse entity view grids, Quick Find searches, view switching, and row selection.
 */
export class GridComponent {
  constructor(private page: Page) {}

  async search(queryText: string): Promise<void> {
    const searchBox = this.page.locator(
      'input[data-id*="quickFind_text" i], [data-id*="quickFind" i] input, input[data-id*="quickFind" i], input[role="searchbox"], input[placeholder*="Filter" i], input[aria-label*="Filter by keyword" i], input[aria-label*="Search" i], input[type="search"]'
    ).first();
    await searchBox.waitFor({ state: 'visible', timeout: 15000 });
    await searchBox.click();
    await searchBox.fill(queryText);
    await searchBox.press('Enter');

    // Also click search icon if present
    const searchBtn = this.page.locator('button[aria-label*="Start search" i], button[data-id*="quickFind_button" i]').first();
    if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBtn.click().catch(() => {});
    }

    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(800).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 8000,
        });
      } catch (e) {}
    }
  }

  /**
   * Clears the current Quick Find search filter from the grid.
   */
  async clearSearch(): Promise<void> {
    const clearBtn = this.page.locator('button[aria-label*="Clear search" i], [data-id*="quickFind_clear" i]').first();
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.click();
    } else {
      const searchBox = this.page.locator(
        'input[data-id*="quickFind_text" i], [data-id*="quickFind" i] input, input[placeholder*="Filter" i], input[type="search"]'
      ).first();
      if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchBox.fill('');
        await searchBox.press('Enter');
      }
    }
    await this.page.waitForTimeout(600).catch(() => {});
  }

  /**
   * Opens the modern Dataverse 'Edit filters' pane on the grid header.
   */
  async openEditFilters(): Promise<void> {
    const editFiltersBtn = this.page.locator(
      'button[aria-label*="Edit filters" i], button:has-text("Edit filters"), [data-id*="editFilter" i]'
    ).first();
    if (await editFiltersBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editFiltersBtn.click();
      await this.page.waitForTimeout(600).catch(() => {});
    }
  }

  /**
   * Applies filters from the modern filter side pane.
   */
  async applyFilters(): Promise<void> {
    const applyBtn = this.page.locator(
      'button[aria-label*="Apply" i], button:has-text("Apply"), [data-id*="applyFilter" i]'
    ).first();
    if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyBtn.click();
      await this.page.waitForTimeout(1000).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 8000,
        });
      } catch (e) {}
    }
  }

  async assertRowContains(text: string): Promise<void> {
    const row = this.page.locator('[role="row"]').filter({ hasText: text }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
  }

  async openRow(rowIndex = 0): Promise<void> {
    const dataRows = this.page.locator('[role="row"]:has([role="gridcell"]), [role="row"][row-index], [role="row"][data-rowindex]');
    const targetRow = dataRows.nth(rowIndex);
    await targetRow.waitFor({ state: 'visible', timeout: 15000 });
    const link = targetRow.locator('a, [role="link"]').first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
    } else {
      await targetRow.dblclick();
    }

    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(1000).catch(() => {});
      try {
        await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
          state: 'detached',
          timeout: 8000,
        });
      } catch (e) {}
    }
  }

  /**
   * Searches for a record and opens the first matching result row.
   */
  async openRecord(recordName: string): Promise<void> {
    const directLink = this.page.locator('[role="row"]').filter({ hasText: recordName }).locator('a, [role="link"]').first();
    if (await directLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await directLink.click();
    } else {
      await this.search(recordName);
      await this.openRow(0);
    }
  }

  /**
   * Selects a row by index or matching text via checkbox.
   */
  async selectRow(rowIndexOrText: number | string = 0): Promise<void> {
    if (typeof rowIndexOrText === 'number') {
      const dataRows = this.page.locator('[role="row"]:has([role="gridcell"]), [role="row"][row-index], [role="row"][data-rowindex]');
      const row = dataRows.nth(rowIndexOrText);
      await row.waitFor({ state: 'visible', timeout: 15000 });
      const checkbox = row.locator('.ms-Checkbox, label.ms-Checkbox-label, [role="checkbox"], input[type="checkbox"]').first();
      await checkbox.click({ force: true });
    } else {
      const row = this.page.locator('[role="row"]').filter({ hasText: String(rowIndexOrText) }).first();
      const checkbox = row.locator('.ms-Checkbox, label.ms-Checkbox-label, [role="checkbox"], input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkbox.click({ force: true });
      } else {
        await row.click();
      }
    }
  }

  /**
   * Switches the active entity grid view (e.g. 'Active Employees', 'Inactive Employees')
   */
  async switchView(viewName: string): Promise<void> {
    const viewSelector = this.page.locator(
      'button[aria-label*="Select a view" i], [data-id*="ViewSelector" i], [aria-label*="Open popup to change view" i], h1 button'
    ).first();

    const currentTitle = (await viewSelector.getAttribute('title').catch(() => '')) ||
                         (await viewSelector.textContent().catch(() => '')) || '';
    if (currentTitle.toLowerCase().replace(/[*]/g, '').trim() === viewName.toLowerCase().trim()) {
      return; // Already on the target view
    }

    if (await viewSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewSelector.click();
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(600).catch(() => {});
      }
      const targetOption = this.page.locator(
        `[role="menu"] [role="menuitem"]:has-text("${viewName}"), [role="menu"] [role="menuitemcheckbox"]:has-text("${viewName}"), [role="listbox"] [role="option"]:has-text("${viewName}"), .ms-ContextualMenu [role="menuitem"]:has-text("${viewName}"), .ms-Callout [role="menuitem"]:has-text("${viewName}"), .ms-ContextualMenu button:has-text("${viewName}"), [role="menu"] button:has-text("${viewName}")`
      ).first();
      await targetOption.waitFor({ state: 'visible', timeout: 5000 });
      await targetOption.click();
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(1000).catch(() => {});
        try {
          await this.page.waitForSelector('.ms-spinner, [data-id="ms-spinner"], .loading-spinner', {
            state: 'detached',
            timeout: 8000,
          });
        } catch (e) {}
      }
    }
  }
}

/**
 * FormComponent: Handles typed Dataverse fields, lookups, option sets, Xrm model syncing, and validations.
 * Modeled after patterns from `microsoft/power-platform-playwright-samples`.
 */
export class FormComponent {
  constructor(private page: Page) {}

  async setTextInput(fieldSchema: string, value: string): Promise<void> {
    const input = this.page.locator(
      `input[data-id="${fieldSchema}.fieldControl-text-box-text"], input[name="${fieldSchema}"], [data-id*="${fieldSchema}" i] input, input[aria-label*="${fieldSchema}" i]`
    ).first();

    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.click();
    await input.fill(value);
    await input.blur();

    // Explicitly sync with Xrm model (recommenced by microsoft/power-platform-playwright-samples)
    // so Dataverse internal attribute model marks field dirty for PATCH on save.
    try {
      await this.page.evaluate(
        ({ attrName, val }) => {
          const xrm = (window as any).Xrm;
          const attr = xrm?.Page?.data?.entity?.attributes?.get(attrName) || 
                       xrm?.Page?.getAttribute?.(attrName);
          if (attr && typeof attr.setValue === 'function') {
            const attrType = attr.getAttributeType ? attr.getAttributeType() : '';
            if (attrType === 'datetime' && typeof val === 'string' && val.includes('-')) {
              attr.setValue(new Date(val));
            } else {
              attr.setValue(val);
            }
            if (typeof attr.setSubmitMode === 'function') {
              attr.setSubmitMode('always');
            }
          }
        },
        { attrName: fieldSchema, val: value }
      ).catch(() => {});
    } catch (e) {}
  }

  /**
   * Alias matching microsoft/power-platform-playwright-samples API
   */
  async setTextFieldValue(fieldSchema: string, value: string): Promise<void> {
    await this.setTextInput(fieldSchema, value);
  }

  async setLookupValue(fieldSchema: string, searchValue: string): Promise<void> {
    const lookupInput = this.page.locator(`[data-id*="${fieldSchema}" i] input[role="combobox"], [data-id*="${fieldSchema}" i] input`).first();
    if (await lookupInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lookupInput.fill(searchValue);
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(600).catch(() => {});
      }

      const option = this.page.locator(`[role="option"]:has-text("${searchValue}"), li:has-text("${searchValue}")`).first();
      if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
        await option.click();
      }
    }
  }

  async selectOption(fieldSchema: string, optionLabel: string): Promise<void> {
    const select = this.page.locator(`[data-id*="${fieldSchema}" i] select, [data-id*="${fieldSchema}" i] [role="combobox"]`).first();
    if (await select.isVisible({ timeout: 4000 }).catch(() => false)) {
      await select.click();
      const opt = this.page.locator(`option:has-text("${optionLabel}"), [role="option"]:has-text("${optionLabel}")`).first();
      await opt.click();
    }

    // Sync with Xrm option set
    try {
      await this.page.evaluate(
        ({ attrName, label }) => {
          const xrm = (window as any).Xrm;
          const attr = xrm?.Page?.data?.entity?.attributes?.get(attrName) || xrm?.Page?.getAttribute?.(attrName);
          if (attr && attr.getOptions) {
            const options = attr.getOptions();
            const matched = options.find((o: any) => o.text?.toLowerCase() === label.toLowerCase());
            if (matched && matched.value !== undefined) {
              attr.setValue(matched.value);
              if (attr.setSubmitMode) attr.setSubmitMode('always');
            }
          }
        },
        { attrName: fieldSchema, label: optionLabel }
      ).catch(() => {});
    } catch (e) {}
  }

  async assertFieldValue(fieldSchema: string, expectedValue?: string): Promise<void> {
    const container = this.page.locator(
      `[data-id*="${fieldSchema}" i], [data-id*="header_${fieldSchema}" i], [data-id*="footer_${fieldSchema}" i], [aria-label*="${fieldSchema}" i]`
    ).first();

    const matchesExpected = (val: string, exp: string): boolean => {
      const v = val.toLowerCase().trim();
      const e = exp.toLowerCase().trim();
      if (v.includes(e) || e.includes(v)) return true;
      // Date format tolerance (e.g. "1/15/1990" vs "1990-01-15")
      const expParts = exp.split(/[-/.]/);
      if (expParts.length === 3 && expParts.every((p) => v.includes(String(Number(p))) || v.includes(p))) {
        return true;
      }
      return false;
    };

    // If no specific value expected, simply verify field presence
    if (expectedValue === undefined || expectedValue === '') {
      if (await container.isVisible({ timeout: 3000 }).catch(() => false)) {
        return;
      }
      const xrmCheck = await this.page.evaluate(async ({ schema }) => {
        const xrm = (window as any).Xrm;
        if (!xrm) return false;
        const attr = xrm?.Page?.data?.entity?.attributes?.get(schema) || xrm?.Page?.getAttribute?.(schema);
        if (attr) return true;
        try {
          const entityId = xrm.Page?.data?.entity?.getId?.();
          const entityName = xrm.Page?.data?.entity?.getEntityName?.();
          if (entityId && entityName && xrm.WebApi?.retrieveRecord) {
            const cleanId = entityId.replace(/[{}]/g, '');
            const lookupSchema = (schema.endsWith('by') || schema.endsWith('id')) && !schema.startsWith('_') ? `_${schema}_value` : '';
            const selectQuery = lookupSchema ? `?$select=${schema},${lookupSchema}` : `?$select=${schema}`;
            let record: any = null;
            try {
              record = await xrm.WebApi.retrieveRecord(entityName, cleanId, selectQuery);
            } catch {
              record = await xrm.WebApi.retrieveRecord(entityName, cleanId);
            }
            if (record && (record[schema] !== undefined || (lookupSchema && record[lookupSchema] !== undefined))) {
              return true;
            }
          }
        } catch {}
        return false;
      }, { schema: fieldSchema }).catch(() => false);
      if (xrmCheck) return;
      await expect(container).toBeVisible({ timeout: 5000 });
      return;
    }

    // Polling loop across DOM inputs, container text, Xrm attributes, and WebApi
    const timeoutMs = 12000;
    const deadline = Date.now() + timeoutMs;
    let lastFound: string | null = null;

    while (Date.now() < deadline) {
      // 1. Check DOM inputs inside container or by field data-id
      const input = container.locator('input, textarea, select, [role="textbox"]').first();
      if (await input.isVisible().catch(() => false)) {
        const domVal = (await input.inputValue().catch(() => '')) || (await input.getAttribute('value').catch(() => '')) || '';
        if (domVal) {
          lastFound = domVal;
          if (matchesExpected(domVal, expectedValue)) return;
        }
      }

      // Check direct input locator by data-id
      const directInput = this.page.locator(`input[data-id*="${fieldSchema}" i], textarea[data-id*="${fieldSchema}" i]`).first();
      if (await directInput.isVisible().catch(() => false)) {
        const domVal = (await directInput.inputValue().catch(() => '')) || (await directInput.getAttribute('value').catch(() => '')) || '';
        if (domVal) {
          lastFound = domVal;
          if (matchesExpected(domVal, expectedValue)) return;
        }
      }

      // 2. Check container textContent or innerText (e.g. read-only spans, lookups, headers)
      if (await container.isVisible().catch(() => false)) {
        const text = (await container.innerText().catch(async () => await container.textContent().catch(() => ''))) || '';
        if (text) {
          if (matchesExpected(text, expectedValue)) return;
        }
      }

      // 3. Check Xrm client-side attribute
      const xrmResult = await this.page.evaluate(async ({ schema }) => {
        const xrm = (window as any).Xrm;
        if (!xrm) return { found: false, value: null };

        // 3a. Xrm Page attributes
        const attr = xrm.Page?.data?.entity?.attributes?.get(schema) || xrm.Page?.getAttribute?.(schema);
        if (attr) {
          const val = attr.getValue?.();
          if (val !== null && val !== undefined) {
            if (Array.isArray(val) && val.length > 0 && val[0].name) return { found: true, value: val[0].name };
            if (typeof attr.getText === 'function') {
              const txt = attr.getText();
              if (txt) return { found: true, value: txt };
            }
            if (val instanceof Date) {
              return { found: true, value: val.toISOString() };
            }
            return { found: true, value: String(val) };
          }
        }

        // 3b. Xrm WebApi retrieve for system/audit attributes
        try {
          const entityId = xrm.Page?.data?.entity?.getId?.();
          const entityName = xrm.Page?.data?.entity?.getEntityName?.();
          if (entityId && entityName && xrm.WebApi?.retrieveRecord) {
            const cleanId = entityId.replace(/[{}]/g, '');
            const lookupSchema = (schema.endsWith('by') || schema.endsWith('id')) && !schema.startsWith('_') ? `_${schema}_value` : '';
            let record: any = null;
            try {
              const selectQuery = lookupSchema ? `?$select=${schema},${lookupSchema}` : `?$select=${schema}`;
              record = await xrm.WebApi.retrieveRecord(entityName, cleanId, selectQuery);
            } catch {
              record = await xrm.WebApi.retrieveRecord(entityName, cleanId);
            }
            if (record) {
              const rawVal = record[schema] ?? (lookupSchema ? record[lookupSchema] : undefined);
              if (rawVal !== undefined && rawVal !== null) {
                let resVal = rawVal;
                if (schema === 'statecode') {
                  resVal = Number(resVal) === 0 ? 'Active' : 'Inactive';
                }
                return { found: true, value: String(resVal) };
              }
            }
          }
        } catch (e) {}

        return { found: false, value: null };
      }, { schema: fieldSchema }).catch(() => ({ found: false, value: null }));

      if (xrmResult.found && xrmResult.value !== null) {
        lastFound = String(xrmResult.value);
        if (matchesExpected(lastFound, expectedValue)) return;
      }

      await this.page.waitForTimeout(400).catch(() => {});
    }

    // If loop expires without matching, throw descriptive assertion error
    throw new Error(
      `Field "${fieldSchema}" failed assertion. Expected to match "${expectedValue}", but found "${lastFound ?? 'null'}".`
    );
  }

  async save(): Promise<void> {
    const modelApp = new ModelDrivenAppPage(this.page);
    await modelApp.save();
  }

  async saveAndClose(): Promise<void> {
    const modelApp = new ModelDrivenAppPage(this.page);
    await modelApp.saveAndClose();
  }
}

/**
 * CopilotChatComponent: Handles embedded Copilot Studio conversational agents.
 */
export class CopilotChatComponent {
  constructor(private page: Page) {}

  async sendMessage(promptText: string): Promise<void> {
    const chatInput = this.page.locator('[placeholder*="Ask a question" i], textarea[aria-label*="chat" i], .webchat__send-box-text-box').first();
    await chatInput.waitFor({ state: 'visible', timeout: 15000 });
    await chatInput.fill(promptText);
    await chatInput.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async assertResponseContains(text: string, timeoutMs = 25000): Promise<void> {
    const msgLocator = this.page.locator(`.webchat__bubble:has-text("${text}"), [data-testid="bot-message"]:has-text("${text}")`).first();
    await expect(msgLocator).toBeVisible({ timeout: timeoutMs });
  }

  async assertAdaptiveCardVisible(): Promise<void> {
    const card = this.page.locator('.ac-adaptiveCard').first();
    await expect(card).toBeVisible({ timeout: 15000 });
  }
}

