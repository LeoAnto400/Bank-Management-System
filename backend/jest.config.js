process.env.NODE_ENV = 'test';

module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    // Integration tests share one real MySQL test database, so they must not
    // run concurrently against it.
    maxWorkers: 1,
    testTimeout: 15000,
};
