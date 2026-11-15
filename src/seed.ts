import type { DatabaseSync } from 'node:sqlite';

// Seed data. Passwords are stored in PLAINTEXT on purpose so the SQL Injection
// demo can show leaked credentials in the UI. Intentional for the assignment,
// not a production practice.

export interface SeedUser {
  username: string;
  password: string;
  role: 'admin' | 'user';
}

export interface SeedProduct {
  name: string;
  price: number;
  secret: string | null;
}

export const SEED_USERS: SeedUser[] = [
  { username: 'admin', password: 'Adm1n!2024', role: 'admin' },
  { username: 'guest', password: 'guest123', role: 'user' },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  { name: 'Keyboard', price: 49.99, secret: null },
  { name: 'Mouse', price: 19.99, secret: null },
  { name: 'Monitor', price: 199.99, secret: null },
  { name: 'Admin License Key', price: 0, secret: 'FLAG-ADMIN-ONLY-XYZ' },
];

/**
 * Create the schema and insert seed rows. Dropping first makes the function
 * idempotent, so it can be safely re-run on each boot.
 */
export function seedDatabase(db: DatabaseSync): DatabaseSync {
  db.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;

    CREATE TABLE users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE products (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT NOT NULL,
      price  REAL NOT NULL,
      secret TEXT
    );
  `);

  const insUser = db.prepare(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
  );
  for (const u of SEED_USERS) {
    insUser.run(u.username, u.password, u.role);
  }

  const insProduct = db.prepare(
    'INSERT INTO products (name, price, secret) VALUES (?, ?, ?)'
  );
  for (const p of SEED_PRODUCTS) {
    insProduct.run(p.name, p.price, p.secret);
  }

  return db;
}
