import type { DatabaseSync } from 'node:sqlite';

export interface ProductRow {
  id: number;
  name: string;
  price: number;
  secret: string | null;
}

export interface UserRow {
  id: number;
  username: string;
  role: string;
}

export interface SearchResult {
  sql: string;
  rows: ProductRow[];
  error?: string;
}

export interface LoginResult {
  sql: string;
  user: UserRow | null;
  success: boolean;
  error?: string;
}

export function searchProducts(
  db: DatabaseSync,
  term: string,
  vulnerable: boolean
): SearchResult {
  if (vulnerable) {
    const sql = `SELECT id, name, price, secret FROM products WHERE name LIKE '%${term}%'`;
    try {
      const rows = db.prepare(sql).all() as unknown as ProductRow[];
      return { sql, rows };
    } catch (e) {
      return { sql, rows: [], error: (e as Error).message };
    }
  }

  const sql = 'SELECT id, name, price, secret FROM products WHERE name LIKE ?';
  const rows = db.prepare(sql).all(`%${term}%`) as unknown as ProductRow[];
  return { sql: `${sql}   -- param: ['%${term}%']`, rows };
}

export function sqlLogin(
  db: DatabaseSync,
  username: string,
  password: string,
  vulnerable: boolean
): LoginResult {
  if (vulnerable) {
    const sql =
      `SELECT id, username, role FROM users ` +
      `WHERE username = '${username}' AND password = '${password}'`;
    try {
      const user = (db.prepare(sql).get() as unknown as UserRow) ?? null;
      return { sql, user, success: Boolean(user) };
    } catch (e) {
      return { sql, user: null, success: false, error: (e as Error).message };
    }
  }

  const sql =
    'SELECT id, username, role FROM users WHERE username = ? AND password = ?';
  const user = (db.prepare(sql).get(username, password) as unknown as UserRow) ?? null;
  return {
    sql: `${sql}   -- params: ['${username}', '${password}']`,
    user,
    success: Boolean(user),
  };
}
