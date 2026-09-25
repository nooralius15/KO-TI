require("dotenv").config();
const mysql = require("mysql2");

// Create the underlying callback-based pool (needed by express-mysql-session)
const rawPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promise-based wrapper for async/await usage throughout the app
const db = rawPool.promise();

// Verify connectivity on startup
rawPool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL Connection Error:", err.code);
    process.exit(1);
  }
  console.log("✅ MySQL Connected (pool)");
  connection.release();
});

module.exports = { db, rawPool };
