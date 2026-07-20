const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { buildCustomerPayload } = require('./helpers/factories');

const dbPromise = db.promise();

afterAll((done) => {
    db.end(done);
});

describe('POST /api/signup', () => {
    test('creates a new customer with a bcrypt password hash', async () => {
        const payload = buildCustomerPayload();
        const res = await request(app).post('/api/signup').send(payload);

        expect(res.status).toBe(201);
        expect(res.body.user.user_role).toBe('customer');

        const [[login]] = await dbPromise.query(
            'SELECT password_hash FROM Customer_Login WHERE customer_id = ?',
            [res.body.user.customer_id]
        );
        expect(login.password_hash).toMatch(/^\$2[aby]\$/);
    });

    test('rejects signup with missing required fields', async () => {
        const res = await request(app)
            .post('/api/signup')
            .send({ role: 'customer', password: 'TestPass123!' });

        expect(res.status).toBe(400);
    });

    test('rejects a password shorter than 8 characters', async () => {
        const payload = buildCustomerPayload({ password: 'short' });
        const res = await request(app).post('/api/signup').send(payload);

        expect(res.status).toBe(400);
    });

    test('rejects duplicate email addresses', async () => {
        const payload = buildCustomerPayload();
        const first = await request(app).post('/api/signup').send(payload);
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/signup')
            .send(buildCustomerPayload({ customer_email: payload.customer_email }));

        expect(second.status).toBe(409);
    });
});

describe('POST /api/login', () => {
    test('logs in with correct credentials and returns a JWT', async () => {
        const payload = buildCustomerPayload();
        await request(app).post('/api/signup').send(payload);

        const res = await request(app)
            .post('/api/login')
            .send({ email: payload.customer_email, password: payload.password });

        expect(res.status).toBe(200);
        expect(typeof res.body.token).toBe('string');
        expect(res.body.user.customer_email).toBe(payload.customer_email);
    });

    test('rejects an incorrect password', async () => {
        const payload = buildCustomerPayload();
        await request(app).post('/api/signup').send(payload);

        const res = await request(app)
            .post('/api/login')
            .send({ email: payload.customer_email, password: 'WrongPass1!' });

        expect(res.status).toBe(401);
    });

    test('rejects an unknown email', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ email: 'nobody-at-all@example.com', password: 'whatever123' });

        expect(res.status).toBe(401);
    });

    test('authenticates seeded legacy SHA-256 accounts and transparently upgrades them to bcrypt', async () => {
        const [[seededCustomer]] = await dbPromise.query(
            'SELECT customer_id, customer_email FROM Customers ORDER BY customer_id ASC LIMIT 1'
        );
        const seededPassword = `Cust@${seededCustomer.customer_id}`;

        const [[loginBefore]] = await dbPromise.query(
            'SELECT password_hash FROM Customer_Login WHERE customer_id = ?',
            [seededCustomer.customer_id]
        );
        expect(loginBefore.password_hash).toMatch(/^[a-f0-9]{64}$/i);

        const res = await request(app)
            .post('/api/login')
            .send({ email: seededCustomer.customer_email, password: seededPassword });

        expect(res.status).toBe(200);

        const [[loginAfter]] = await dbPromise.query(
            'SELECT password_hash FROM Customer_Login WHERE customer_id = ?',
            [seededCustomer.customer_id]
        );
        expect(loginAfter.password_hash).toMatch(/^\$2[aby]\$/);
    });
});

describe('POST /api/admin/login', () => {
    test('authenticates a seeded admin account', async () => {
        const [[seededAdmin]] = await dbPromise.query(
            'SELECT accountant_id, accountant_email FROM Accountants ORDER BY accountant_id ASC LIMIT 1'
        );
        const seededPassword = `Admin@${seededAdmin.accountant_id}`;

        const res = await request(app)
            .post('/api/admin/login')
            .send({ email: seededAdmin.accountant_email, password: seededPassword });

        expect(res.status).toBe(200);
        expect(res.body.user.user_role).toBe('admin');
    });

    test('rejects an incorrect admin password', async () => {
        const [[seededAdmin]] = await dbPromise.query(
            'SELECT accountant_email FROM Accountants ORDER BY accountant_id ASC LIMIT 1'
        );

        const res = await request(app)
            .post('/api/admin/login')
            .send({ email: seededAdmin.accountant_email, password: 'WrongPass1!' });

        expect(res.status).toBe(401);
    });
});
