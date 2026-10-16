import { query } from '../db/pool';
import { encrypt, decrypt, maskSecret } from '../utils/crypto';
import { config } from '../config/env';
import axios from 'axios';

export interface AzureAppProfile {
  id: string;
  userId: string;
  profileName: string;
  tenantId: string;
  clientId: string;
  clientSecretHint: string;
  environmentUrl: string;
  isActive: boolean;
  isDelegated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AzureConnectionTestResult {
  success: boolean;
  message: string;
  tokenType?: string;
  expiresIn?: number;
  environmentUrl?: string;
  details?: any;
}

export class AzureAppService {
  /**
   * Lists all Azure App profiles for a user with client secret masked.
   */
  static async listProfiles(userId: string): Promise<AzureAppProfile[]> {
    const res = await query(
      `SELECT id, user_id, profile_name, tenant_id, client_id, encrypted_client_secret,
              environment_url, is_active, created_at, updated_at
       FROM azure_app_profiles
       WHERE user_id = $1
       ORDER BY is_active DESC, created_at DESC`,
      [userId]
    );

    return res.rows.map(r => {
      let hint = '****';
      let isDelegated = false;
      try {
        const decrypted = decrypt(r.encrypted_client_secret);
        isDelegated = decrypted.startsWith('MSAL_CACHE:');
        hint = maskSecret(decrypted);
      } catch (e) {
        hint = '****';
      }

      return {
        id: r.id,
        userId: r.user_id,
        profileName: r.profile_name,
        tenantId: r.tenant_id,
        clientId: r.client_id,
        clientSecretHint: hint,
        environmentUrl: r.environment_url,
        isActive: r.is_active,
        isDelegated,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  /**
   * Retrieves the currently active profile with DECRYPTED secret (for backend API calls).
   */
  static async getActiveProfileSecret(userId: string): Promise<{
    id: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    environmentUrl: string;
    isDelegated: boolean;
  } | null> {
    const res = await query(
      `SELECT id, tenant_id, client_id, encrypted_client_secret, environment_url
       FROM azure_app_profiles
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId]
    );

    let row = res.rows[0];
    if (!row) {
      // Fallback: check any profile
      const anyRes = await query(
        `SELECT id, tenant_id, client_id, encrypted_client_secret, environment_url
         FROM azure_app_profiles
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );
      if (anyRes.rows.length === 0) return null;
      row = anyRes.rows[0];
    }

    const decrypted = decrypt(row.encrypted_client_secret);
    return {
      id: row.id,
      tenantId: row.tenant_id,
      clientId: row.client_id,
      clientSecret: decrypted,
      environmentUrl: row.environment_url,
      isDelegated: decrypted.startsWith('MSAL_CACHE:'),
    };
  }

  /**
   * Updates the secret or MSAL token cache for an existing profile.
   */
  static async updateProfileSecret(id: string, rawSecret: string): Promise<void> {
    const encryptedSecret = encrypt(rawSecret);
    await query(
      'UPDATE azure_app_profiles SET encrypted_client_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [encryptedSecret, id]
    );
  }

  /**
   * Saves or updates a delegated user profile with serialized MSAL token cache.
   */
  static async saveOrUpdateDelegatedProfile(
    userId: string,
    environmentUrl: string,
    serializedCache: string,
    tenantId?: string,
    clientId?: string
  ): Promise<AzureAppProfile> {
    const cleanEnv = environmentUrl.trim().replace(/\/+$/, '');
    const encryptedSecret = encrypt('MSAL_CACHE:' + serializedCache);
    const cleanTenant = (tenantId || config.MS_TENANT_ID || 'common').trim();
    const cleanClient = (clientId || config.MS_CLIENT_ID || '').trim();

    // Deactivate other profiles for this user
    await query('UPDATE azure_app_profiles SET is_active = false WHERE user_id = $1', [userId]);

    // Check if a profile with the same environment_url already exists for this user
    const existing = await query(
      'SELECT id, profile_name FROM azure_app_profiles WHERE user_id = $1 AND environment_url = $2 LIMIT 1',
      [userId, cleanEnv]
    );

    let profileId: string;
    let profileName: string;

    if (existing.rows.length > 0) {
      profileId = existing.rows[0].id;
      profileName = existing.rows[0].profile_name;
      await query(
        `UPDATE azure_app_profiles
         SET encrypted_client_secret = $1, tenant_id = $2, client_id = $3, is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [encryptedSecret, cleanTenant, cleanClient, profileId]
      );
    } else {
      let hostName = 'Power Platform Environment';
      try {
        const u = new URL(cleanEnv);
        const hostPart = u.hostname.split('.')[0];
        if (hostPart) hostName = `${hostPart} Environment`;
      } catch (e) {
        // ignore
      }
      profileName = hostName;

      const insertRes = await query(
        `INSERT INTO azure_app_profiles
         (user_id, profile_name, tenant_id, client_id, encrypted_client_secret, environment_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [userId, profileName, cleanTenant, cleanClient, encryptedSecret, cleanEnv]
      );
      profileId = insertRes.rows[0].id;
    }

    return {
      id: profileId,
      userId,
      profileName,
      tenantId: cleanTenant,
      clientId: cleanClient,
      clientSecretHint: 'Delegated User (MSAL)',
      environmentUrl: cleanEnv,
      isActive: true,
      isDelegated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Saves a new or updated Azure App profile.
   */
  static async saveProfile(
    userId: string,
    profileName: string,
    tenantId: string,
    clientId: string,
    clientSecret: string,
    environmentUrl: string,
    setActive = true
  ): Promise<AzureAppProfile> {
    // Clean environment url (remove trailing slash)
    const cleanEnvUrl = environmentUrl.trim().replace(/\/+$/, '');
    const encryptedSecret = encrypt(clientSecret);

    if (setActive) {
      // Deactivate other profiles for this user
      await query(
        'UPDATE azure_app_profiles SET is_active = false WHERE user_id = $1',
        [userId]
      );
    }

    const res = await query(
      `INSERT INTO azure_app_profiles
       (user_id, profile_name, tenant_id, client_id, encrypted_client_secret, environment_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, profile_name, tenant_id, client_id, environment_url, is_active, created_at, updated_at`,
      [userId, profileName, tenantId.trim(), clientId.trim(), encryptedSecret, cleanEnvUrl, setActive]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      profileName: r.profile_name,
      tenantId: r.tenant_id,
      clientId: r.client_id,
      clientSecretHint: maskSecret(clientSecret),
      environmentUrl: r.environment_url,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Sets a profile as the active one.
   */
  static async setActive(id: string, userId: string): Promise<boolean> {
    await query('UPDATE azure_app_profiles SET is_active = false WHERE user_id = $1', [userId]);
    const res = await query(
      'UPDATE azure_app_profiles SET is_active = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  /**
   * Deletes a profile.
   */
  static async deleteProfile(id: string, userId: string): Promise<boolean> {
    const res = await query(
      'DELETE FROM azure_app_profiles WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  /**
   * Validates Azure App connection by requesting an OAuth2 token from Microsoft Entra ID.
   */
  static async testConnection(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    environmentUrl: string
  ): Promise<AzureConnectionTestResult> {
    const cleanTenant = tenantId.trim();
    const cleanClient = clientId.trim();
    const cleanSecret = clientSecret.trim();
    const cleanEnv = environmentUrl.trim().replace(/\/+$/, '');

    // Format validation
    if (!cleanEnv) {
      return {
        success: false,
        message: 'Dataverse Environment URL is required.',
      };
    }

    if (!cleanEnv.startsWith('https://')) {
      return {
        success: false,
        message: 'Dataverse Environment URL must start with https:// (e.g., https://org.crm.dynamics.com).',
      };
    }

    // Special mock/demo mode handler for offline/local testing
    if (cleanSecret === 'mock-secret' || cleanTenant === '00000000-0000-0000-0000-000000000000') {
      return {
        success: true,
        message: 'Mock Connection Successful: Verified simulated Dataverse endpoint credentials.',
        tokenType: 'Bearer',
        expiresIn: 3600,
        environmentUrl: cleanEnv,
      };
    }

    // Handle delegated user token test (MSAL Cache)
    if (cleanSecret.startsWith('MSAL_CACHE:')) {
      try {
        const { ConfidentialClientApplication } = await import('@azure/msal-node');
        const serializedCache = cleanSecret.substring('MSAL_CACHE:'.length);
        const pca = new ConfidentialClientApplication({
          auth: {
            clientId: cleanClient || config.MS_CLIENT_ID || '',
            authority: `https://login.microsoftonline.com/${cleanTenant || config.MS_TENANT_ID || 'common'}`,
            clientSecret: config.MS_CLIENT_SECRET || '',
          },
        });
        pca.getTokenCache().deserialize(serializedCache);
        const accounts = await pca.getTokenCache().getAllAccounts();
        if (accounts.length === 0) {
          return {
            success: false,
            message: 'Delegated connection test failed: No user account found in token cache.',
          };
        }
        const tokenRes = await pca.acquireTokenSilent({
          account: accounts[0],
          scopes: [`${cleanEnv}/user_impersonation`],
        });
        return {
          success: true,
          message: `Successfully validated delegated user connection (${accounts[0].username}) to ${cleanEnv}!`,
          tokenType: tokenRes.tokenType || 'Bearer',
          environmentUrl: cleanEnv,
        };
      } catch (delegatedErr: any) {
        return {
          success: false,
          message: `Delegated token acquisition failed: ${delegatedErr.message}`,
        };
      }
    }

    if (!cleanTenant || !cleanClient || !cleanSecret) {
      return {
        success: false,
        message: 'All connection parameters (Tenant ID, Client ID, Client Secret, Environment URL) are required.',
      };
    }

    const tokenUrl = `https://login.microsoftonline.com/${cleanTenant}/oauth2/v2.0/token`;
    const scope = `${cleanEnv}/.default`;

    const params = new URLSearchParams();
    params.append('client_id', cleanClient);
    params.append('client_secret', cleanSecret);
    params.append('grant_type', 'client_credentials');
    params.append('scope', scope);

    try {
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });

      if (response.data && response.data.access_token) {
        return {
          success: true,
          message: `Successfully connected to Dataverse environment at ${cleanEnv}! OAuth2 token acquired.`,
          tokenType: response.data.token_type,
          expiresIn: response.data.expires_in,
          environmentUrl: cleanEnv,
        };
      }

      return {
        success: false,
        message: 'Token endpoint responded without an access token.',
      };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error_description ||
        err.response?.data?.error ||
        err.message ||
        'Failed to connect to Microsoft Entra token endpoint';
      return {
        success: false,
        message: `Connection test failed: ${errorMsg}`,
        details: err.response?.data,
      };
    }
  }
}

