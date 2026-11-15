import { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from './seed';

export function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  seedDatabase(db);
  return db;
}

export const db = createDatabase();
