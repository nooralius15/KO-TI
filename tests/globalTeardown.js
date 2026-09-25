/**
 * Jest globalTeardown — runs ONCE after all test suites.
 * Drops the koti_test database.
 */
const mysql = require('mysql2/promise');

module.exports = async function globalTeardown() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });

  await conn.query('DROP DATABASE IF EXISTS koti_test');
  await conn.end();
  console.log('🧹 Test database koti_test dropped');
};
