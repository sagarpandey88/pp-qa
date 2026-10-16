import { query } from '../../db/pool';
import { encrypt, decrypt, maskSecret } from '../../utils/crypto';
import { config } from '../../config/env';

export type AiProvider = 'openai' | 'gemini' | 'azure_openai';

export interface AzureOpenAiConfig {
  apiKey: string;
  endpoint: string;
  deployment?: string;
  apiVersion?: string;
}

export interface ByokKeyInfo {
  provider: AiProvider;
  keyHint: string;
  isConfigured: boolean;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
  updatedAt?: string;
}

export class ByokService {
  /**
   * Saves or updates an encrypted BYOK API key or Azure OpenAI configuration for a user.
   */
  static async saveKey(
    userId: string | null,
    provider: AiProvider,
    apiKey: string,
    extra?: { endpoint?: string; deployment?: string; apiVersion?: string }
  ): Promise<ByokKeyInfo> {
    let cleanKey = apiKey.trim();
    let hint = '';
    let encryptedPayload = '';
    let endpoint = extra?.endpoint?.trim();
    let deployment = extra?.deployment?.trim();
    let apiVersion = extra?.apiVersion?.trim() || '2024-06-01';

    if (provider === 'azure_openai') {
      if (cleanKey.startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanKey);
          cleanKey = parsed.apiKey || cleanKey;
          endpoint = parsed.endpoint || endpoint;
          deployment = parsed.deployment || deployment;
          apiVersion = parsed.apiVersion || apiVersion;
        } catch {
          // not json
        }
      }

      if (!endpoint && config.AZURE_OPENAI_ENDPOINT) {
        endpoint = config.AZURE_OPENAI_ENDPOINT;
      }
      if (!deployment && config.AZURE_OPENAI_DEPLOYMENT) {
        deployment = config.AZURE_OPENAI_DEPLOYMENT;
      }

      encryptedPayload = encrypt(
        JSON.stringify({
          apiKey: cleanKey,
          endpoint: endpoint || '',
          deployment: deployment || 'gpt-4o',
          apiVersion: apiVersion || '2024-06-01',
        })
      );

      let host = '';
      if (endpoint) {
        try {
          host = new URL(endpoint).hostname;
        } catch {
          host = endpoint;
        }
      }
      hint = `${maskSecret(cleanKey)}${host ? ` (${host})` : ''}`;
    } else {
      encryptedPayload = encrypt(cleanKey);
      hint = maskSecret(cleanKey);
    }

    const existing = await query(
      'SELECT id FROM byok_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE byok_keys
         SET encrypted_api_key = $1, key_hint = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [encryptedPayload, hint, existing.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO byok_keys (user_id, provider, encrypted_api_key, key_hint)
         VALUES ($1, $2, $3, $4)`,
        [userId, provider, encryptedPayload, hint]
      );
    }

    return {
      provider,
      keyHint: hint,
      isConfigured: true,
      endpoint,
      deployment,
      apiVersion,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves decrypted API key for a user (or falls back to env vars).
   */
  static async getKey(userId: string | null, provider: 'openai' | 'gemini'): Promise<string | null> {
    if (userId) {
      const res = await query(
        'SELECT encrypted_api_key FROM byok_keys WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
      if (res.rows.length > 0) {
        try {
          return decrypt(res.rows[0].encrypted_api_key);
        } catch (e) {
          console.error(`Failed to decrypt BYOK key for ${provider}`, e);
        }
      }
    }

    // Check global/organization key
    const globalRes = await query(
      'SELECT encrypted_api_key FROM byok_keys WHERE user_id IS NULL AND provider = $1',
      [provider]
    );
    if (globalRes.rows.length > 0) {
      try {
        return decrypt(globalRes.rows[0].encrypted_api_key);
      } catch (e) {
        console.error(`Failed to decrypt global BYOK key for ${provider}`, e);
      }
    }

    // Check environment variables
    if (provider === 'openai' && config.OPENAI_API_KEY) {
      return config.OPENAI_API_KEY;
    }
    if (provider === 'gemini' && config.GEMINI_API_KEY) {
      return config.GEMINI_API_KEY;
    }

    return null;
  }

  /**
   * Retrieves decrypted Azure OpenAI configuration (apiKey, endpoint, deployment, apiVersion)
   */
  static async getAzureOpenAiConfig(userId: string | null): Promise<AzureOpenAiConfig | null> {
    if (userId) {
      const res = await query(
        'SELECT encrypted_api_key FROM byok_keys WHERE user_id = $1 AND provider = $2',
        [userId, 'azure_openai']
      );
      if (res.rows.length > 0) {
        try {
          const decrypted = decrypt(res.rows[0].encrypted_api_key);
          if (decrypted.startsWith('{')) {
            const parsed = JSON.parse(decrypted);
            return {
              apiKey: parsed.apiKey,
              endpoint: parsed.endpoint || config.AZURE_OPENAI_ENDPOINT || '',
              deployment: parsed.deployment || config.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
              apiVersion: parsed.apiVersion || config.AZURE_OPENAI_API_VERSION || '2024-06-01',
            };
          }
          return {
            apiKey: decrypted,
            endpoint: config.AZURE_OPENAI_ENDPOINT || '',
            deployment: config.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
            apiVersion: config.AZURE_OPENAI_API_VERSION || '2024-06-01',
          };
        } catch (e) {
          console.error('Failed to decrypt Azure OpenAI config from DB', e);
        }
      }
    }

    // Check global key in DB
    const globalRes = await query(
      'SELECT encrypted_api_key FROM byok_keys WHERE user_id IS NULL AND provider = $1',
      ['azure_openai']
    );
    if (globalRes.rows.length > 0) {
      try {
        const decrypted = decrypt(globalRes.rows[0].encrypted_api_key);
        if (decrypted.startsWith('{')) {
          const parsed = JSON.parse(decrypted);
          return {
            apiKey: parsed.apiKey,
            endpoint: parsed.endpoint || config.AZURE_OPENAI_ENDPOINT || '',
            deployment: parsed.deployment || config.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
            apiVersion: parsed.apiVersion || config.AZURE_OPENAI_API_VERSION || '2024-06-01',
          };
        }
        return {
          apiKey: decrypted,
          endpoint: config.AZURE_OPENAI_ENDPOINT || '',
          deployment: config.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
          apiVersion: config.AZURE_OPENAI_API_VERSION || '2024-06-01',
        };
      } catch (e) {
        console.error('Failed to decrypt global Azure OpenAI config from DB', e);
      }
    }

    // Check environment variables
    if (config.AZURE_OPENAI_API_KEY && config.AZURE_OPENAI_ENDPOINT) {
      return {
        apiKey: config.AZURE_OPENAI_API_KEY,
        endpoint: config.AZURE_OPENAI_ENDPOINT,
        deployment: config.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
        apiVersion: config.AZURE_OPENAI_API_VERSION || '2024-06-01',
      };
    }

    return null;
  }

  /**
   * Lists status of all AI providers for user.
   */
  static async listKeys(userId: string | null): Promise<ByokKeyInfo[]> {
    const providers: AiProvider[] = ['openai', 'azure_openai', 'gemini'];
    const results: ByokKeyInfo[] = [];

    for (const prov of providers) {
      let keyHint = '';
      let isConfigured = false;
      let endpoint: string | undefined;
      let deployment: string | undefined;
      let apiVersion: string | undefined;
      let updatedAt: string | undefined;

      if (userId) {
        const res = await query(
          'SELECT key_hint, encrypted_api_key, updated_at FROM byok_keys WHERE user_id = $1 AND provider = $2',
          [userId, prov]
        );
        if (res.rows.length > 0) {
          keyHint = res.rows[0].key_hint;
          isConfigured = true;
          updatedAt = res.rows[0].updated_at;

          if (prov === 'azure_openai') {
            try {
              const decrypted = decrypt(res.rows[0].encrypted_api_key);
              if (decrypted.startsWith('{')) {
                const parsed = JSON.parse(decrypted);
                endpoint = parsed.endpoint;
                deployment = parsed.deployment;
                apiVersion = parsed.apiVersion;
              }
            } catch {
              // ignore
            }
          }
        }
      }

      if (!isConfigured) {
        // Check env vars
        if (prov === 'openai' && config.OPENAI_API_KEY) {
          keyHint = maskSecret(config.OPENAI_API_KEY);
          isConfigured = true;
        } else if (prov === 'gemini' && config.GEMINI_API_KEY) {
          keyHint = maskSecret(config.GEMINI_API_KEY);
          isConfigured = true;
        } else if (prov === 'azure_openai' && config.AZURE_OPENAI_API_KEY && config.AZURE_OPENAI_ENDPOINT) {
          let host = '';
          try {
            host = new URL(config.AZURE_OPENAI_ENDPOINT).hostname;
          } catch {
            host = config.AZURE_OPENAI_ENDPOINT;
          }
          keyHint = `${maskSecret(config.AZURE_OPENAI_API_KEY)} (${host})`;
          isConfigured = true;
          endpoint = config.AZURE_OPENAI_ENDPOINT;
          deployment = config.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
          apiVersion = config.AZURE_OPENAI_API_VERSION || '2024-06-01';
        }
      }

      results.push({
        provider: prov,
        keyHint: keyHint || 'Not configured',
        isConfigured,
        endpoint,
        deployment,
        apiVersion,
        updatedAt,
      });
    }

    return results;
  }

  /**
   * Automatically detects the first active/configured AI provider for a user.
   * Priority: User-configured BYOK keys -> Global DB keys -> Environment variables.
   */
  static async detectConfiguredProvider(userId: string | null): Promise<AiProvider | null> {
    const list = await this.listKeys(userId);
    const active = list.find((k) => k.isConfigured);
    return active ? active.provider : null;
  }

  /**
   * Deletes a key.
   */
  static async deleteKey(userId: string | null, provider: AiProvider): Promise<boolean> {
    const res = await query(
      'DELETE FROM byok_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    return (res.rowCount || 0) > 0;
  }
}

