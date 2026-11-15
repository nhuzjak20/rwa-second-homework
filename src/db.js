'use strict';

const { DatabaseSync } = require('node:sqlite');
const { seedDatabase } = require('./seed');

function createDatabase() {
  const db = new DatabaseSync(':memory:');
  seedDatabase(db);
  return db;
}

const db = createDatabase();

module.exports = { db, createDatabase };
