import type { DatabaseSync } from 'node:sqlite';

export interface SeedUser {
  username: string;
  password: string;
  role: 'admin' | 'user';
  email: string;
}

export interface SeedProduct {
  name: string;
  price: number;
  secret: string | null;
}

export const SEED_USERS: SeedUser[] = [
  { username: 'admin', password: 'Adm1n!2024', role: 'admin', email: 'admin@rwa.local' },
  { username: 'guest', password: 'guest123', role: 'user', email: 'guest@rwa.local' },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  { name: 'Keyboard', price: 49.99, secret: null },
  { name: 'Mouse', price: 19.99, secret: null },
  { name: 'Monitor', price: 199.99, secret: null },
  { name: 'Admin License Key', price: 0, secret: 'FLAG-ADMIN-ONLY-XYZ' },
];

export function seedDatabase(db: DatabaseSync): DatabaseSync {
  db.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;

    CREATE TABLE users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'user',
      email    TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE products (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT NOT NULL,
      price  REAL NOT NULL,
      secret TEXT
    );
  `);

  const insUser = db.prepare(
    'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)'
  );
  for (const u of SEED_USERS) {
    insUser.run(u.username, u.password, u.role, u.email);
  }

  const insProduct = db.prepare(
    'INSERT INTO products (name, price, secret) VALUES (?, ?, ?)'
  );
  for (const p of SEED_PRODUCTS) {
    insProduct.run(p.name, p.price, p.secret);
  }

  return db;
}
