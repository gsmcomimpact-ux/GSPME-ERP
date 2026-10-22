/**
 * GSPME SaaS - Authentification : hachage scrypt + jetons JWT HS256 (sans dépendance externe)
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getJwtSecret } from './db.ts';

export interface AuthPayload {
  sub: string;
  tid: string;
  role: string;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signToken(user: { id: string; tenantId: string; role: string }): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: AuthPayload = {
    sub: user.id,
    tid: user.tenantId,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): AuthPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AuthPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  auth: AuthPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const payload = header.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
  if (!payload) {
    res.status(401).json({ error: 'Authentification requise' });
    return;
  }
  (req as AuthedRequest).auth = payload;
  next();
}

/** Limiteur simple en mémoire (anti force brute sur login/register). */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMIT === '1') return next(); // tests automatisés uniquement
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard' });
      return;
    }
    next();
  };
}
