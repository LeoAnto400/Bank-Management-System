const mysql = require('mysql2');
const env = require('./env');

const db = mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
});

const MAX_CONNECT_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

// In Docker, MySQL's healthcheck can pass a moment before it's truly ready
// to accept connections, so the first attempt here can lose that race.
const connectWithRetry = (attempt = 1) => {
    db.connect((err) => {
        if (!err) {
            console.log('Connected to MySQL');
            return;
        }

        if (attempt >= MAX_CONNECT_ATTEMPTS) {
            console.error(`Database connection failed after ${MAX_CONNECT_ATTEMPTS} attempts:`, err.message);
            process.exit(1);
        }

        console.warn(
            `Database connection attempt ${attempt} failed (${err.code || err.message}); retrying in ${RETRY_DELAY_MS}ms...`
        );
        setTimeout(() => connectWithRetry(attempt + 1), RETRY_DELAY_MS);
    });
};

connectWithRetry();

module.exports = db;