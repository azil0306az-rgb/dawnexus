import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { createSession, validateSession, destroySession } from './db.js';

// Configuration
const COOKIE_NAME = 'dawnexus_session';
const SESSION_MAX_AGE_HOURS = 4;

// Rate limiting for login attempts
interface FailedAttemptInfo {
  count: number;
  lockedUntil: number | null;
}
const failedAttemptsMap = new Map<string, FailedAttemptInfo>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown-ip';
}

export function handleAdminLogin(req: Request, res: Response) {
  const ip = getClientIp(req);
  const now = Date.now();

  // Check rate limit / lockout
  const attemptInfo = failedAttemptsMap.get(ip) || { count: 0, lockedUntil: null };
  if (attemptInfo.lockedUntil && now < attemptInfo.lockedUntil) {
    const remainingMinutes = Math.ceil((attemptInfo.lockedUntil - now) / 60000);
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${remainingMinutes} minute(s) before trying again.`
    });
  }

  // Clear lockout if period expired
  if (attemptInfo.lockedUntil && now >= attemptInfo.lockedUntil) {
    attemptInfo.count = 0;
    attemptInfo.lockedUntil = null;
  }

  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Expected password from environment
  const expectedPassword = process.env.ADMIN_PASSWORD || '9566';

  // Constant-time comparison to prevent timing attacks
  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expectedPassword);
  const isMatch = passwordBuffer.length === expectedBuffer.length &&
                  crypto.timingSafeEqual(passwordBuffer, expectedBuffer);

  if (!isMatch) {
    attemptInfo.count += 1;
    if (attemptInfo.count >= MAX_FAILED_ATTEMPTS) {
      attemptInfo.lockedUntil = now + LOCKOUT_DURATION_MS;
      failedAttemptsMap.set(ip, attemptInfo);
      return res.status(429).json({
        error: 'Too many incorrect attempts. Account locked for 15 minutes.'
      });
    }
    failedAttemptsMap.set(ip, attemptInfo);
    const remainingAttempts = MAX_FAILED_ATTEMPTS - attemptInfo.count;
    return res.status(401).json({
      error: `Invalid administrative password. (${remainingAttempts} attempt(s) remaining)`
    });
  }

  // Successful login -> Reset failed attempts
  failedAttemptsMap.delete(ip);

  // Generate high-entropy session ID
  const sessionId = crypto.randomBytes(32).toString('hex');
  createSession(sessionId, SESSION_MAX_AGE_HOURS);
  const signedSession = signStatelessSession(sessionId);

  // Set HTTP-only session cookie
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, signedSession, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_HOURS * 60 * 60 * 1000
  });

  return res.json({
    success: true,
    message: 'Authenticated successfully'
  });
}

export function handleAdminSession(req: Request, res: Response) {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ authenticated: false });
  }

  const isValidDb = validateSession(sessionId);
  if (isValidDb) {
    return res.json({ authenticated: true });
  }

  const isValidStateless = verifyStatelessSession(sessionId);
  if (isValidStateless) {
    try {
      createSession(sessionId.split('.')[0] || sessionId, SESSION_MAX_AGE_HOURS);
    } catch {
      // Non-fatal
    }
    return res.json({ authenticated: true });
  }

  return res.status(401).json({ authenticated: false });
}

export function handleAdminLogout(req: Request, res: Response) {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (sessionId) {
    destroySession(sessionId);
  }

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: '/'
  });

  return res.json({ success: true, message: 'Logged out successfully' });
}

// Fallback stateless signature verification for serverless container recycling
function getSessionSigningSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dawnexus-secret-session-salt-fallback';
}

export function signStatelessSession(sessionId: string): string {
  const secret = getSessionSigningSecret();
  const signature = crypto.createHmac('sha256', secret).update(sessionId).digest('hex');
  return `${sessionId}.${signature}`;
}

export function verifyStatelessSession(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [sessionId, signature] = token.split('.');
  if (!sessionId || !signature) return false;
  const secret = getSessionSigningSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(sessionId).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

// Middleware to guard protected admin endpoints
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[COOKIE_NAME];

  if (!sessionId) {
    return res.status(401).json({
      error: 'Authentication required. Access to this administrative endpoint is denied.'
    });
  }

  // First verify against SQLite database session table
  const isValidDb = validateSession(sessionId);
  if (isValidDb) {
    return next();
  }

  // Fallback verify stateless signature (in case serverless container spawned fresh /tmp SQLite)
  const isValidStateless = verifyStatelessSession(sessionId);
  if (isValidStateless) {
    // Re-seed session into this container's SQLite
    try {
      createSession(sessionId.split('.')[0] || sessionId, SESSION_MAX_AGE_HOURS);
    } catch {
      // Non-fatal
    }
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required. Access to this administrative endpoint is denied.'
  });
}

