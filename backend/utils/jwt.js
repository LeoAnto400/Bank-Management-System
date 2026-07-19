const crypto = require('crypto');

const toBase64Url = (value) =>
    Buffer.from(value)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

const fromBase64Url = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

    return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
};

exports.signJwt = (payload, secret, expiresInSeconds = 3600) => {
    const header = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const issuedAt = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: issuedAt,
        exp: issuedAt + expiresInSeconds,
    };

    const encodedHeader = toBase64Url(JSON.stringify(header));
    const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
        .createHmac('sha256', secret)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
};

exports.verifyJwt = (token, secret) => {
    if (!token || typeof token !== 'string') {
        throw new Error('Missing token.');
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
        throw new Error('Invalid token format.');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        throw new Error('Invalid token signature.');
    }

    const payload = JSON.parse(fromBase64Url(encodedPayload));

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        throw new Error('Token expired.');
    }

    return payload;
};
