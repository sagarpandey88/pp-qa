import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  MS_TENANT_ID?: string;
  MS_CLIENT_ID?: string;
  MS_CLIENT_SECRET?: string;
  MS_REDIRECT_URI?: string;
  MS_ENVIRONMENT_URL?: string;
  MS_AUTH_EMAIL?: string;
  MS_USER_PASSWORD?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
  AZURE_OPENAI_API_VERSION?: string;
}

const defaultEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export const config: AppConfig = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ppqa',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || defaultEncryptionKey,
  JWT_SECRET: process.env.JWT_SECRET || 'pp-qa-development-jwt-secret-key-32-chars-min',
  MS_TENANT_ID: process.env.MS_TENANT_ID,
  MS_CLIENT_ID: process.env.MS_CLIENT_ID,
  MS_CLIENT_SECRET: process.env.MS_CLIENT_SECRET,
  MS_REDIRECT_URI: process.env.MS_REDIRECT_URI,
  MS_ENVIRONMENT_URL: process.env.MS_ENVIRONMENT_URL,
  MS_AUTH_EMAIL: process.env.MS_AUTH_EMAIL,
  MS_USER_PASSWORD: process.env.MS_USER_PASSWORD,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
};

