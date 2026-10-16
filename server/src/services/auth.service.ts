import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { config } from '../config/env';

export interface UserPayload {
  id: string;
  email: string;
  displayName: string;
  microsoftOid?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

/**
 * Issues a signed JWT token for a given user payload.
 */
export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Finds or creates a user in PostgreSQL users table.
 */
export async function findOrCreateUser(
  email: string,
  displayName: string,
  microsoftOid?: string
): Promise<UserPayload> {
  const normalizedEmail = email.trim().toLowerCase();

  // Search by email (case-insensitive) or by microsoft_oid if provided
  const existing = await query(
    `SELECT id, email, display_name, microsoft_oid 
     FROM users 
     WHERE LOWER(email) = $1 
        OR ($2::text IS NOT NULL AND $2::text != '' AND microsoft_oid = $2::text)
     LIMIT 1`,
    [normalizedEmail, microsoftOid || null]
  );

  if (existing.rows.length > 0) {
    const u = existing.rows[0];
    if (displayName && displayName !== u.display_name) {
      await query(
        `UPDATE users 
         SET display_name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [displayName, u.id]
      );
    }
    return {
      id: u.id,
      email: u.email,
      displayName: displayName || u.display_name,
      microsoftOid: u.microsoft_oid || microsoftOid,
    };
  }

  // Ensure each user gets a unique OID if not explicitly provided
  const finalOid = microsoftOid && microsoftOid.trim()
    ? microsoftOid.trim()
    : (normalizedEmail === 'spadmin@contoso.onmicrosoft.com'
        ? '00000000-0000-0000-0000-000000000001'
        : crypto.randomUUID());

  const insertRes = await query(
    `INSERT INTO users (email, display_name, microsoft_oid)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
     SET display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         updated_at = CURRENT_TIMESTAMP
     RETURNING id, email, display_name, microsoft_oid`,
    [normalizedEmail, displayName, finalOid]
  );

  const u = insertRes.rows[0];
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    microsoftOid: u.microsoft_oid,
  };
}

/**
 * Express middleware to authenticate JWT bearer tokens.
 * Falls back to default dev user if not provided in dev/test mode.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as UserPayload;
      req.user = decoded;
      return next();
    } catch (err) {
      // Invalid token
      res.status(401).json({ error: 'Invalid or expired authentication token' });
      return;
    }
  }

  // In development, automatically provision default developer user so users don't get blocked
  try {
    const defaultUser = await findOrCreateUser(
      'spadmin@contoso.onmicrosoft.com',
      'Dev Engineer (Default)',
      '00000000-0000-0000-0000-000000000001'
    );
    req.user = defaultUser;
    return next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication required' });
  }
}

