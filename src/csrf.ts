import crypto from 'crypto';
import type { DatabaseSync } from 'node:sqlite';

export const COOKIE_NAME = 'session';

export interface SessionUser {
  username: string;
  role: string;
  email: string;
}

const sessions = new Map<string, string>();
const csrfTokens = new Map<string, string>();

export const actionLog: string[] = [];
export function logAction(message: string): void {
  actionLog.push(message);
  if (actionLog.length > 10) actionLog.shift();
}

interface UserRow {
  username: string;
  role: string;
  email: string;
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

export function login(
  db: DatabaseSync,
  username: string,
  password: string
): string | null {
  const row = db
    .prepare('SELECT username FROM users WHERE username = ? AND password = ?')
    .get(username, password) as unknown as { username: string } | undefined;
  if (!row) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, row.username);
  return token;
}

export function resolveSession(
  db: DatabaseSync,
  token: string | undefined
): SessionUser | null {
  if (!token) return null;
  const username = sessions.get(token);
  if (!username) return null;
  const row = db
    .prepare('SELECT username, role, email FROM users WHERE username = ?')
    .get(username) as unknown as UserRow | undefined;
  return row ? { username: row.username, role: row.role, email: row.email } : null;
}

export function getCsrfToken(sessionToken: string): string {
  let t = csrfTokens.get(sessionToken);
  if (!t) {
    t = crypto.randomBytes(16).toString('hex');
    csrfTokens.set(sessionToken, t);
  }
  return t;
}

export function validateCsrf(sessionToken: string, provided: string | undefined): boolean {
  const expected = csrfTokens.get(sessionToken);
  return Boolean(expected) && provided === expected;
}

export function destroySession(token: string | undefined): void {
  if (token) {
    sessions.delete(token);
    csrfTokens.delete(token);
  }
}

export function changeEmail(db: DatabaseSync, username: string, email: string): void {
  db.prepare('UPDATE users SET email = ? WHERE username = ?').run(email, username);
}

export function _resetCsrfState(): void {
  sessions.clear();
  csrfTokens.clear();
  actionLog.length = 0;
}
