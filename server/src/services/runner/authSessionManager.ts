import fs from 'fs';
import path from 'path';

export interface DualSessionPaths {
  powerAppsSessionPath: string;
  dataverseSessionPath: string;
  isCached: boolean;
}

export class AuthSessionManager {
  private static authDir = path.resolve(__dirname, '../../../playwright/.playwright-ms-auth');
  private static rootAuthDir = path.resolve(__dirname, '../../../../playwright/.playwright-ms-auth');

  /**
   * Ensures the storageState directory exists.
   */
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

  /**
   * Checks whether a session file exists and contains genuine authenticated cookies (not dummy mock).
   */
  static isRealSession(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false;
      const stats = fs.statSync(filePath);
      if (stats.size < 1000) return false;
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('active-crm-authenticated-cookie-session')) return false;
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.cookies) || parsed.cookies.length === 0) return false;
      return parsed.cookies.some((c: any) =>
        c.name === 'CrmOwinAuth' ||
        c.name === 'ESTSAUTH' ||
        c.name === 'ESTSAUTHPERSISTENT' ||
        c.name === 'SignInStateCookie' ||
        (c.domain && c.domain.includes('dynamics.com') && c.name && c.name.toLowerCase().includes('auth'))
      );
    } catch {
      return false;
    }
  }

  /**
   * Generates or validates dual-domain storageState files for headless Playwright execution.
   */
  static async getOrCreateSessions(
    email = 'spadmin@contoso.onmicrosoft.com',
    environmentUrl = 'https://org.crm.dynamics.com'
  ): Promise<DualSessionPaths> {
    this.ensureDir();

    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const paSessionFile = path.join(this.authDir, `state-${cleanEmail}.json`);
    const mdaSessionFile = path.join(this.authDir, `state-mda-${cleanEmail}.json`);
    const defaultMdaSessionFile = path.join(this.authDir, 'state-mda-default.json');

    // First check for a genuine authenticated MFA / Microsoft session
    let realSessionPath: string | null = null;

    if (this.isRealSession(mdaSessionFile)) {
      realSessionPath = mdaSessionFile;
    } else if (this.isRealSession(defaultMdaSessionFile)) {
      realSessionPath = defaultMdaSessionFile;
    } else {
      // Check any other real session in authDir
      try {
        const files = fs.readdirSync(this.authDir)
          .filter(f => f.startsWith('state-mda-') && f.endsWith('.json'))
          .map(f => path.join(this.authDir, f))
          .filter(f => this.isRealSession(f));
        if (files.length > 0) {
          files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
          realSessionPath = files[0];
        }
      } catch (e) {}

      // Fallback check rootAuthDir
      if (!realSessionPath && fs.existsSync(this.rootAuthDir)) {
        try {
          const rootDefault = path.join(this.rootAuthDir, 'state-mda-default.json');
          const rootSpecific = path.join(this.rootAuthDir, `state-mda-${cleanEmail}.json`);
          if (this.isRealSession(rootSpecific)) {
            fs.copyFileSync(rootSpecific, mdaSessionFile);
            realSessionPath = mdaSessionFile;
          } else if (this.isRealSession(rootDefault)) {
            fs.copyFileSync(rootDefault, defaultMdaSessionFile);
            realSessionPath = defaultMdaSessionFile;
          }
        } catch (e) {}
      }
    }

    if (realSessionPath) {
      try {
        if (realSessionPath !== defaultMdaSessionFile && !fs.existsSync(defaultMdaSessionFile)) {
          fs.copyFileSync(realSessionPath, defaultMdaSessionFile);
        }
        if (realSessionPath !== mdaSessionFile && !this.isRealSession(mdaSessionFile)) {
          fs.copyFileSync(realSessionPath, mdaSessionFile);
        }
      } catch (e) {}

      const hasCachedPA = fs.existsSync(paSessionFile);
      return {
        powerAppsSessionPath: hasCachedPA ? paSessionFile : realSessionPath,
        dataverseSessionPath: realSessionPath,
        isCached: true,
      };
    }

    const hasCachedPA = fs.existsSync(paSessionFile);
    const hasCachedMDA = fs.existsSync(mdaSessionFile);
    const hasDefaultMDA = fs.existsSync(defaultMdaSessionFile);

    const effectiveMda = hasCachedMDA ? mdaSessionFile : (hasDefaultMDA ? defaultMdaSessionFile : null);

    if (effectiveMda) {
      return {
        powerAppsSessionPath: hasCachedPA ? paSessionFile : effectiveMda,
        dataverseSessionPath: effectiveMda,
        isCached: true,
      };
    }

    // Provision baseline mock/authenticated storage states
    const expires = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const parsedUrl = new URL(environmentUrl.startsWith('http') ? environmentUrl : `https://${environmentUrl}`);

    const makePortalState = {
      cookies: [
        {
          name: 'MSPOK',
          value: '$uuid-auth-token-session',
          domain: 'make.powerapps.com',
          path: '/',
          expires,
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
        {
          name: 'AADSSO',
          value: 'NA|NoAccount',
          domain: '.powerapps.com',
          path: '/',
          expires,
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
      ],
      origins: [
        {
          origin: 'https://make.powerapps.com',
          localStorage: [
            { name: 'msal.account.keys', value: `["${email}"]` },
            { name: 'ppqa_session_active', value: 'true' },
          ],
        },
      ],
    };

    const crmState = {
      cookies: [
        {
          name: 'CrmAuthToken',
          value: 'active-crm-authenticated-cookie-session',
          domain: parsedUrl.hostname,
          path: '/',
          expires,
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
        {
          name: 'ReqClientId',
          value: '00000000-0000-0000-0000-000000000000',
          domain: parsedUrl.hostname,
          path: '/',
          expires,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
      ],
      origins: [
        {
          origin: `${parsedUrl.protocol}//${parsedUrl.hostname}`,
          localStorage: [
            { name: 'CrmSessionUser', value: email },
            { name: 'ppqa_dynamics_session', value: 'valid' },
          ],
        },
      ],
    };

    fs.writeFileSync(paSessionFile, JSON.stringify(makePortalState, null, 2), 'utf8');
    fs.writeFileSync(mdaSessionFile, JSON.stringify(crmState, null, 2), 'utf8');

    return {
      powerAppsSessionPath: paSessionFile,
      dataverseSessionPath: mdaSessionFile,
      isCached: false,
    };
  }
}

