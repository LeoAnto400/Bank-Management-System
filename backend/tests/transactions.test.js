const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { createTestCustomer } = require('./helpers/factories');

afterAll((done) => {
    db.end(done);
});

const openAccount = async (customer) => {
    const res = await request(app)
        .post('/api/accounts/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ account_type: 'Savings' });

    return res.body.account;
};

const postTransaction = (customer, body) =>
    request(app)
        .post('/api/transactions/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(body);

describe('POST /api/transactions/me', () => {
    test('a credit transaction increases the account balance', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await postTransaction(customer, {
            account_id: account.account_id,
            transaction_type: 'Credit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Test deposit',
            transaction_amount: 1000,
        });

        expect(res.status).toBe(201);
        expect(res.body.account.account_balance).toBe('1000.00');
    });

    test('a debit transaction decreases the account balance', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        await postTransaction(customer, {
            account_id: account.account_id,
            transaction_type: 'Credit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Seed funds',
            transaction_amount: 1000,
        });

        const res = await postTransaction(customer, {
            account_id: account.account_id,
            transaction_type: 'Debit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Test withdrawal',
            transaction_amount: 400,
        });

        expect(res.status).toBe(201);
        expect(res.body.account.account_balance).toBe('600.00');
    });

    test('rejects a debit that would overdraw the account', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await postTransaction(customer, {
            account_id: account.account_id,
            transaction_type: 'Debit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Overdraw attempt',
            transaction_amount: 50,
        });

        expect(res.status).toBe(400);
    });

    test('rejects a self-service transaction above the INR 50,000 cap', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await postTransaction(customer, {
            account_id: account.account_id,
            transaction_type: 'Credit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Too big',
            transaction_amount: 60000,
        });

        expect(res.status).toBe(403);
    });

    test("rejects transacting on another customer's account", async () => {
        const owner = await createTestCustomer(app);
        const account = await openAccount(owner);
        const attacker = await createTestCustomer(app);

        const res = await postTransaction(attacker, {
            account_id: account.account_id,
            transaction_type: 'Credit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'IDOR attempt',
            transaction_amount: 100,
        });

        expect(res.status).toBe(404);
    });
});
