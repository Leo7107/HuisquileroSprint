const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host:            process.env.DB_HOST,
  user:            process.env.DB_USER,
  password:        process.env.DB_PASSWORD,
  database:        process.env.DB_NAME,
  port:            process.env.DB_PORT,
  ssl:             { rejectUnauthorized: true },
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit:      0,
});

pool.getConnection((err, conn) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err.message);
    return;
  }
  console.log("Conexión exitosa a la base de datos (pool)");
  conn.release();
});

module.exports = pool;
