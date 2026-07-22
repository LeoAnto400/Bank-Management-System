const path = require('path');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, '..', envFile) });

const REQUIRED_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
    console.error(
        `Missing required environment variable(s): ${missing.join(', ')}. ` +
            'Copy backend/.env.example to backend/.env and fill in real values.'
    );
    process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long.');
    process.exit(1);
}

const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

if (!process.env.CORS_ORIGIN) {
    console.warn(
        `CORS_ORIGIN is not set; defaulting to ${DEFAULT_CORS_ORIGIN}. ` +
            'Set it in backend/.env to the real frontend URL(s) for any other environment.'
    );
}

const CORS_ORIGINS = (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

module.exports = {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    JWT_SECRET: process.env.JWT_SECRET,
    PORT: Number(process.env.PORT) || 5000,
    CORS_ORIGINS,
};
