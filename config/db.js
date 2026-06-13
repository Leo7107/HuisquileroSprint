const mysql = require("mysql2");
require("dotenv").config();

// Las BD remotas con TLS (TiDB Cloud, Aiven, PlanetScale, etc.) cierran las
// conexiones inactivas tras unos minutos sin avisar con FIN — solo resetean
// el socket. Sin keep-alive el pool entrega esas conexiones "zombies" y la
// primera query revienta con ECONNRESET fatal en TLSWrap.onStreamRead.
// enableKeepAlive hace que el SO mande paquetes TCP keep-alive periódicos,
// detectando la desconexión antes de reutilizar el socket y obligando al
// pool a recrear la conexión limpiamente.
const pool = mysql.createPool({
  host:            process.env.DB_HOST,
  user:            process.env.DB_USER,
  password:        process.env.DB_PASSWORD,
  database:        process.env.DB_NAME,
  port:            process.env.DB_PORT,
  ssl:             { rejectUnauthorized: true },
  timezone:        'Z',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit:      0,
  enableKeepAlive:        true,
  keepAliveInitialDelay:  10_000,
});

// Si una conexión del pool emite un error fatal (típicamente ECONNRESET o
// PROTOCOL_CONNECTION_LOST tras un timeout remoto), la sacamos del pool
// para que la próxima query reciba una conexión fresca. mysql2 lo hace
// automáticamente para errores `fatal: true`, este listener solo previene
// que esos errores tumben el proceso si nadie los escucha.
pool.on('connection', (conn) => {
  conn.on('error', (err) => {
    console.warn('[db pool] conexión emitió error y se descarta:', err.code || err.message);
  });
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
