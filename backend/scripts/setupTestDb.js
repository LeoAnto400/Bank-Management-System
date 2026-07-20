const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.test') });

const fs = require('fs');
const { execFileSync } = require('child_process');

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_NAME || !DB_NAME.endsWith('_test')) {
    console.error(
        'Refusing to run: DB_NAME in backend/.env.test must end with "_test" so this script can never target a real database.'
    );
    process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..', '..');

const schemaSql = fs
    .readFileSync(path.join(repoRoot, 'dbSyntax.sql'), 'utf8')
    .replace(/financial_system/g, DB_NAME);
const authSql = fs.readFileSync(path.join(repoRoot, 'auth_schema.sql'), 'utf8');

const combinedSql = [schemaSql, `USE \`${DB_NAME}\`;`, authSql].join('\n\n');

console.log(`Rebuilding test database "${DB_NAME}" on ${DB_HOST}...`);

execFileSync('mysql', ['-h', DB_HOST, '-u', DB_USER], {
    input: combinedSql,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, MYSQL_PWD: DB_PASSWORD },
});

console.log(`Test database "${DB_NAME}" is ready.`);
