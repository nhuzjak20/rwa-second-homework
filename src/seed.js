'use strict';


const SEED_USERS = [
  { username: 'admin', password: 'Adm1n!2024', role: 'admin' },
  { username: 'guest', password: 'guest123', role: 'user' },
];

const SEED_PRODUCTS = [
  { name: 'Keyboard', price: 49.99, secret: null },
  { name: 'Mouse', price: 19.99, secret: null },
  { name: 'Monitor', price: 199.99, secret: null },
  { name: 'Admin License Key', price: 0, secret: 'FLAG-ADMIN-ONLY-XYZ' },
];

/**
 * Kreira i inserta redove. 
 * migracijska
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {import('node:sqlite').DatabaseSync} the same db, seeded
 */
function seedDatabase(db) {
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

module.exports = { seedDatabase, SEED_USERS, SEED_PRODUCTS };
