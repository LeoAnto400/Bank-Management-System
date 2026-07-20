const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { createTestCustomer } = require('./helpers/factories');

const dbPromise = db.promise();

afterAll((done) => {
    db.end(done);
});

const getAdminToken = async () => {
    const [[seededAdmin]] = await dbPromise.query(
        'SELECT accountant_id, accountant_email FROM Accountants ORDER BY accountant_id ASC LIMIT 1'
    );

    const res = await request(app)
        .post('/api/admin/login')
        .send({ email: seededAdmin.accountant_email, password: `Admin@${seededAdmin.accountant_id}` });

    return res.body.token;
};

// Regression coverage for a fixed vulnerability: several GET routes used to
// return all customers/accounts/transactions/fraud logs with no auth at all.
describe('previously-open endpoints now require admin auth', () => {
    test('GET /api/fraud rejects unauthenticated requests', async () => {
        const res = await request(app).get('/api/fraud');
        expect(res.status).toBe(401);
    });

    test('GET /api/fraud/high-risk rejects unauthenticated requests', async () => {
        const res = await request(app).get('/api/fraud/high-risk');
        expect(res.status).toBe(401);
    });

    test('GET /api/dashboard rejects unauthenticated requests', async () => {
        const res = await request(app).get('/api/dashboard');
        expect(res.status).toBe(401);
    });

    test('GET /api/fraud rejects a customer token (admin-only resource)', async () => {
        const customer = await createTestCustomer(app);
        const res = await request(app).get('/api/fraud').set('Authorization', `Bearer ${customer.token}`);
        expect(res.status).toBe(403);
    });

    test('GET /api/fraud succeeds for an authenticated admin', async () => {
        const token = await getAdminToken();
        const res = await request(app).get('/api/fraud').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/dashboard succeeds for an authenticated admin', async () => {
        const token = await getAdminToken();
        const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total_customers');
    });
});

// Regression coverage for the raw, unscoped dump endpoints that were removed
// entirely (GET /api/accounts, /api/customers, /api/transactions/:id).
describe('removed raw data-dump routes stay gone', () => {
    test('GET /api/accounts no longer exists', async () => {
        const res = await request(app).get('/api/accounts');
        expect(res.status).toBe(404);
    });

    test('GET /api/customers no longer exists', async () => {
        const res = await request(app).get('/api/customers');
        expect(res.status).toBe(404);
    });

    test('GET /api/transactions/:accountId no longer exists', async () => {
        const res = await request(app).get('/api/transactions/1');
        expect(res.status).toBe(404);
    });
});
