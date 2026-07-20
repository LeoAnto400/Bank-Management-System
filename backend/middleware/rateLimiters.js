const rateLimit = require('express-rate-limit');

// Disabled under the automated test suite so functional tests aren't flaky;
// the limiting behavior itself is covered by a manual/CI smoke check instead
// since it depends on wall-clock windows that don't suit unit-style tests.
const skipInTests = () => process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTests,
    message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTests,
    message: { message: 'Too many signup attempts. Please try again later.' },
});

module.exports = { loginLimiter, signupLimiter };
