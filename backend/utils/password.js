const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BCRYPT_SALT_ROUNDS = 12;
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

const hashPassword = (plainPassword) => bcrypt.hash(String(plainPassword), BCRYPT_SALT_ROUNDS);

const isLegacySha256Hash = (hash) => LEGACY_SHA256_PATTERN.test(String(hash || ''));

const matchesLegacySha256 = (plainPassword, storedHash) => {
    const candidate = crypto.createHash('sha256').update(String(plainPassword)).digest('hex');
    const candidateBuffer = Buffer.from(candidate, 'hex');
    const storedBuffer = Buffer.from(String(storedHash).toLowerCase(), 'hex');

    return (
        candidateBuffer.length === storedBuffer.length &&
        crypto.timingSafeEqual(candidateBuffer, storedBuffer)
    );
};

// Accepts both bcrypt hashes and legacy unsalted SHA-256 hashes so existing
// accounts keep working. Returns whether the password matched and, when it
// matched via the legacy scheme, a freshly-hashed bcrypt value the caller
// should persist to migrate that row off SHA-256 (see hashesToUpgrade below).
const verifyPassword = async (plainPassword, storedHash) => {
    if (!storedHash) {
        return { matches: false, upgradedHash: null };
    }

    if (isLegacySha256Hash(storedHash)) {
        if (!matchesLegacySha256(plainPassword, storedHash)) {
            return { matches: false, upgradedHash: null };
        }

        return { matches: true, upgradedHash: await hashPassword(plainPassword) };
    }

    const matches = await bcrypt.compare(String(plainPassword), storedHash);
    return { matches, upgradedHash: null };
};

module.exports = { hashPassword, verifyPassword, isLegacySha256Hash };
