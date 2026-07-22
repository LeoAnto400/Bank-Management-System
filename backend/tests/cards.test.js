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

const issueCard = (customer, body) =>
    request(app)
        .post('/api/cards/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(body);

describe('POST /api/cards/me', () => {
    test('requires authentication', async () => {
        const res = await request(app).post('/api/cards/me').send({ account_id: 1, card_type: 'Debit' });
        expect(res.status).toBe(401);
    });

    test('issues a debit card and returns the CVV once', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await issueCard(customer, { account_id: account.account_id, card_type: 'Debit' });

        expect(res.status).toBe(201);
        expect(res.body.card.card_type).toBe('Debit');
        expect(res.body.card.card_status).toBe('Active');
        expect(res.body.card.credit_limit).toBeNull();
        expect(res.body.card.card_number).toHaveLength(16);
        expect(res.body.card.cvv).toMatch(/^\d{3}$/);
    });

    test('requires a positive credit_limit for a Credit card', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await issueCard(customer, { account_id: account.account_id, card_type: 'Credit' });

        expect(res.status).toBe(400);
    });

    test('issues a credit card with the requested limit', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await issueCard(customer, {
            account_id: account.account_id,
            card_type: 'Credit',
            card_network: 'Visa',
            credit_limit: 50000,
        });

        expect(res.status).toBe(201);
        expect(res.body.card.card_network).toBe('Visa');
        expect(res.body.card.credit_limit).toBe('50000.00');
    });

    test("rejects issuing a card against another customer's account", async () => {
        const owner = await createTestCustomer(app);
        const account = await openAccount(owner);
        const attacker = await createTestCustomer(app);

        const res = await issueCard(attacker, { account_id: account.account_id, card_type: 'Debit' });

        expect(res.status).toBe(404);
    });

    test('rejects an invalid card_type', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);

        const res = await issueCard(customer, { account_id: account.account_id, card_type: 'Prepaid' });

        expect(res.status).toBe(400);
    });
});

describe('PATCH /api/cards/:cardId/status', () => {
    test('blocks and unblocks a card owned by the customer', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);
        const issueRes = await issueCard(customer, { account_id: account.account_id, card_type: 'Debit' });
        const cardId = issueRes.body.card.card_id;

        const blockRes = await request(app)
            .patch(`/api/cards/${cardId}/status`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ card_status: 'Blocked' });

        expect(blockRes.status).toBe(200);

        const unblockRes = await request(app)
            .patch(`/api/cards/${cardId}/status`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ card_status: 'Active' });

        expect(unblockRes.status).toBe(200);
    });

    test("rejects blocking another customer's card", async () => {
        const owner = await createTestCustomer(app);
        const account = await openAccount(owner);
        const issueRes = await issueCard(owner, { account_id: account.account_id, card_type: 'Debit' });
        const cardId = issueRes.body.card.card_id;

        const attacker = await createTestCustomer(app);
        const res = await request(app)
            .patch(`/api/cards/${cardId}/status`)
            .set('Authorization', `Bearer ${attacker.token}`)
            .send({ card_status: 'Blocked' });

        expect(res.status).toBe(404);
    });

    test('rejects an invalid card_status', async () => {
        const customer = await createTestCustomer(app);
        const account = await openAccount(customer);
        const issueRes = await issueCard(customer, { account_id: account.account_id, card_type: 'Debit' });
        const cardId = issueRes.body.card.card_id;

        const res = await request(app)
            .patch(`/api/cards/${cardId}/status`)
            .set('Authorization', `Bearer ${customer.token}`)
            .send({ card_status: 'Expired' });

        expect(res.status).toBe(400);
    });
});
