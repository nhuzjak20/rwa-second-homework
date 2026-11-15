// SQLite access via Node's built-in `node:sqlite` module (Node >= 24, no flag).
// Using the built-in avoids any native build step (better-sqlite3 needed one),
// which keeps `npm install` clean and the cloud deploy reliable.
//
// An in-memory database is used: state is demo-only and re-seeded on every boot,
// so there is no file to persist and no filesystem permissions to worry about.

import { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from './seed';

/**
 * Create a fresh, independent, seeded in-memory database.
 * Useful for tests that need isolation from the app instance.
 */
export function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  seedDatabase(db);
  return db;
}

// Shared application database instance (seeded once on startup).
export const db = createDatabase();
