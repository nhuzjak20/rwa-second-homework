import crypto from 'crypto';
import type { DatabaseSync } from 'node:sqlite';

export const COOKIE_NAME = 'session';
export const LOCK_THRESHOLD = 3;
const BRUTE_PASSWORDS = ['123456', 'password', 'admin', 'qwerty', 'letmein', 'Adm1n!2024'];

export interface SessionUser {
  username: string;
  role: string;
}

export interface LoginOutcome {
  token: string | null;
  ok: boolean;
  locked: boolean;
}

export interface BruteOutcome {
  processed: number;
  cracked: boolean;
  crackedPassword: string | null;
  locked: boolean;
}

const sessions = new Map<string, string>();
const failedAttempts = new Map<string, number>();

export const actionLog: string[] = [];
export function logAction(message: string): void {
  actionLog.push(message);
  if (actionLog.length > 10) actionLog.shift();
}

interface UserRow {
  username: string;
  role: string;
}

export function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function isLocked(username: string): boolean {
  return (failedAttempts.get(username) ?? 0) >= LOCK_THRESHOLD;
}

export function forgeToken(username: string): string {
  return Buffer.from(username, 'utf8').toString('base64');
}

export function login(
  db: DatabaseSync,
  username: string,
  password: string,
  vulnerable: boolean
): LoginOutcome {
  if (!vulnerable && isLocked(username)) {
    return { token: null, ok: false, locked: true };
  }
  const row = db
    .prepare('SELECT username, role FROM users WHERE username = ? AND password = ?')
    .get(username, password) as unknown as UserRow | undefined;
  if (!row) {
    failedAttempts.set(username, (failedAttempts.get(username) ?? 0) + 1);
    return { token: null, ok: false, locked: !vulnerable && isLocked(username) };
  }
  failedAttempts.delete(username);
  if (vulnerable) {
    return { token: forgeToken(row.username), ok: true, locked: false };
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, row.username);
  return { token, ok: true, locked: false };
}

export function resolveSession(
  db: DatabaseSync,
  token: string | undefined,
  vulnerable: boolean
): SessionUser | null {
  if (!token) return null;
  let username: string | undefined;
  if (vulnerable) {
    try {
      username = Buffer.from(token, 'base64').toString('utf8');
    } catch {
      return null;
    }
  } else {
    username = sessions.get(token);
  }
  if (!username) return null;
  const row = db
    .prepare('SELECT username, role FROM users WHERE username = ?')
    .get(username) as unknown as UserRow | undefined;
  return row ? { username: row.username, role: row.role } : null;
}

export function bruteForce(
  db: DatabaseSync,
  username: string,
  vulnerable: boolean
): BruteOutcome {
  let processed = 0;
  let cracked = false;
  let crackedPassword: string | null = null;
  for (const pw of BRUTE_PASSWORDS) {
    if (!vulnerable && isLocked(username)) break;
    processed++;
    const row = db
      .prepare('SELECT username FROM users WHERE username = ? AND password = ?')
      .get(username, pw) as unknown as { username: string } | undefined;
    if (row) {
      cracked = true;
      crackedPassword = pw;
      failedAttempts.delete(username);
      break;
    }
    failedAttempts.set(username, (failedAttempts.get(username) ?? 0) + 1);
  }
  return { processed, cracked, crackedPassword, locked: !vulnerable && isLocked(username) };
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

export function resetLock(username: string): void {
  failedAttempts.delete(username);
}

export function _resetAuthState(): void {
  sessions.clear();
  failedAttempts.clear();
  actionLog.length = 0;
}
