const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { createTestCustomer } = require('./helpers/factories');

afterAll((done) => {
    db.end(done);
});

describe('POST /api/accounts/me', () => {
    test('requires authentication', async () => {
        const res = await request(app).post('/api/accounts/me').send({ account_type: 'Savings' });
        expect(res.status).toBe(401);
    });

    test('creates a zero-balance active account for the authenticated customer', async () => {
        const customer = await createTestCustomer(app);

        const res = await request(app)
            .post('/api/accounts/me')
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ account_type: 'Savings' });

        expect(res.status).toBe(201);
        expect(res.body.account.account_balance).toBe('0.00');
        expect(res.body.account.account_status).toBe('Active');
    });

    test('rejects an invalid account_type', async () => {
        const customer = await createTestCustomer(app);

        const res = await request(app)
            .post('/api/accounts/me')
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ account_type: 'Bitcoin Wallet' });

        expect(res.status).toBe(400);
    });
});
