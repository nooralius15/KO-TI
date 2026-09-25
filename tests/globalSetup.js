/**
 * Jest globalSetup — runs ONCE before all test suites.
 * Creates the koti_test database and populates it with the full schema.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

module.exports = async function globalSetup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
  });

  // Create fresh test database
  await conn.query('DROP DATABASE IF EXISTS koti_test');
  await conn.query('CREATE DATABASE koti_test');
  await conn.query('USE koti_test');

  // Load and execute the consolidated schema
  const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'koti.sql'), 'utf8');
  await conn.query(schemaSQL);

  // Seed a test admin user with a known bcrypt hash for '123456'
  const bcrypt = require('bcryptjs');
  const adminHash = await bcrypt.hash('123456', 10);
  const userHash = await bcrypt.hash('testpass', 10);

  await conn.query(`
    INSERT INTO users (name, email, password, role) VALUES
    ('Test Admin', 'admin@test.com', ?, 'admin'),
    ('Test Customer', 'user@test.com', ?, 'customer')
  `, [adminHash, userHash]);

  await conn.end();
  console.log('✅ Test database koti_test created and seeded');
};
