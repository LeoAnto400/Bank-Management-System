const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { createTestCustomer } = require('./helpers/factories');

const dbPromise = db.promise();

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

const fundAccount = (customer, accountId, amount) =>
    request(app)
        .post('/api/transactions/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
            account_id: accountId,
            transaction_type: 'Credit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Funding for transfer test',
            transaction_amount: amount,
        });

const getBalance = async (accountId) => {
    const [[row]] = await dbPromise.query('SELECT account_balance FROM Accounts WHERE account_id = ?', [
        accountId,
    ]);
    return Number(row.account_balance);
};

describe('POST /api/transfers/me', () => {
    test('requires password confirmation', async () => {
        const sender = await createTestCustomer(app);
        const senderAccount = await openAccount(sender);
        await fundAccount(sender, senderAccount.account_id, 5000);

        const recipient = await createTestCustomer(app);
        const recipientAccount = await openAccount(recipient);

        const res = await request(app)
            .post('/api/transfers/me')
            .set('Authorization', `Bearer ${sender.token}`)
            .send({
                sender_account_id: senderAccount.account_id,
                destination_account_number: recipientAccount.account_number,
                transfer_remarks: 'Test transfer',
                transfer_amount: 500,
            });

        expect(res.status).toBe(400);
    });

    test('rejects an incorrect password confirmation', async () => {
        const sender = await createTestCustomer(app);
        const senderAccount = await openAccount(sender);
        await fundAccount(sender, senderAccount.account_id, 5000);

        const recipient = await createTestCustomer(app);
        const recipientAccount = await openAccount(recipient);

        const res = await request(app)
            .post('/api/transfers/me')
            .set('Authorization', `Bearer ${sender.token}`)
            .send({
                sender_account_id: senderAccount.account_id,
                destination_account_number: recipientAccount.account_number,
                transfer_remarks: 'Test transfer',
                transfer_amount: 500,
                password: 'WrongPass1!',
            });

        expect(res.status).toBe(401);
    });

    test('moves money atomically between two accounts', async () => {
        const sender = await createTestCustomer(app);
        const senderAccount = await openAccount(sender);
        await fundAccount(sender, senderAccount.account_id, 5000);

        const recipient = await createTestCustomer(app);
        const recipientAccount = await openAccount(recipient);

        const res = await request(app)
            .post('/api/transfers/me')
            .set('Authorization', `Bearer ${sender.token}`)
            .send({
                sender_account_id: senderAccount.account_id,
                destination_account_number: recipientAccount.account_number,
                transfer_remarks: 'Test transfer',
                transfer_amount: 1500,
                password: sender.password,
            });

        expect(res.status).toBe(201);

        const senderBalance = await getBalance(senderAccount.account_id);
        const recipientBalance = await getBalance(recipientAccount.account_id);
        expect(senderBalance).toBe(3500);
        expect(recipientBalance).toBe(1500);
    });

    test('rejects a transfer larger than the sender balance', async () => {
        const sender = await createTestCustomer(app);
        const senderAccount = await openAccount(sender);
        await fundAccount(sender, senderAccount.account_id, 1000);

        const recipient = await createTestCustomer(app);
        const recipientAccount = await openAccount(recipient);

        const res = await request(app)
            .post('/api/transfers/me')
            .set('Authorization', `Bearer ${sender.token}`)
            .send({
                sender_account_id: senderAccount.account_id,
                destination_account_number: recipientAccount.account_number,
                transfer_remarks: 'Test transfer',
                transfer_amount: 2000,
                password: sender.password,
            });

        expect(res.status).toBe(400);
    });
});
