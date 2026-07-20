const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { createTestCustomer } = require('./helpers/factories');

const dbPromise = db.promise();

afterAll((done) => {
    db.end(done);
});

const openFundedAccount = async (customer, amount) => {
    const accountRes = await request(app)
        .post('/api/accounts/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ account_type: 'Savings' });
    const account = accountRes.body.account;

    await request(app)
        .post('/api/transactions/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
            account_id: account.account_id,
            transaction_type: 'Credit',
            transaction_channel: 'Online Banking',
            transaction_desc: 'Funding for loan repayment test',
            transaction_amount: amount,
        });

    return account;
};

// Inserts a Loan row directly rather than driving the full application/
// approval workflow, so this test can isolate the repayment interest math.
const createTestLoan = async (customerId, { disbursedDaysAgo = 0 } = {}) => {
    const [[branch]] = await dbPromise.query('SELECT branch_id FROM Branches LIMIT 1');

    const [result] = await dbPromise.query(
        `
            INSERT INTO Loans (
                customer_id, branch_id, loan_type, principal_amount,
                annual_interest_rate, tenure_months, emi_amount,
                outstanding_amount, disbursement_date, maturity_date, loan_status
            )
            VALUES (?, ?, 'Personal', 10000, 12.00, 12, 888.49, 10000,
                DATE_SUB(CURDATE(), INTERVAL ? DAY), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'Active')
        `,
        [customerId, branch.branch_id, disbursedDaysAgo]
    );

    return result.insertId;
};

const repay = (customer, loanId, body) =>
    request(app)
        .post(`/api/customers/me/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send(body);

describe('POST /api/customers/me/loans/:loanId/repay — interest accrual', () => {
    test('charges no interest on a repayment made the same day as disbursement', async () => {
        const customer = await createTestCustomer(app);
        const account = await openFundedAccount(customer, 5000);
        const loanId = await createTestLoan(customer.customerId, { disbursedDaysAgo: 0 });

        const res = await repay(customer, loanId, {
            source_account_id: account.account_id,
            repayment_amount: 1000,
            payment_method: 'Online Banking',
        });

        expect(res.status).toBe(201);
        expect(res.body.payment.interest_component).toBe('0.00');
        expect(res.body.payment.principal_component).toBe('1000.00');
    });

    // Regression test for the exact bug noted by the project author: making
    // more than one repayment did not previously check how much time had
    // actually passed, so every single call charged another flat month's
    // interest on the outstanding balance.
    test('does not double-charge interest across two repayments made the same day', async () => {
        const customer = await createTestCustomer(app);
        const account = await openFundedAccount(customer, 5000);
        const loanId = await createTestLoan(customer.customerId, { disbursedDaysAgo: 0 });

        const first = await repay(customer, loanId, {
            source_account_id: account.account_id,
            repayment_amount: 500,
            payment_method: 'Online Banking',
        });
        const second = await repay(customer, loanId, {
            source_account_id: account.account_id,
            repayment_amount: 500,
            payment_method: 'Online Banking',
        });

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(first.body.payment.interest_component).toBe('0.00');
        expect(second.body.payment.interest_component).toBe('0.00');
    });

    test('accrues interest proportional to days elapsed since disbursement', async () => {
        const customer = await createTestCustomer(app);
        const account = await openFundedAccount(customer, 5000);
        const loanId = await createTestLoan(customer.customerId, { disbursedDaysAgo: 30 });

        const res = await repay(customer, loanId, {
            source_account_id: account.account_id,
            repayment_amount: 1000,
            payment_method: 'Online Banking',
        });

        // 10000 outstanding * 12% annual / 365 days * 30 days = 98.63
        expect(res.status).toBe(201);
        expect(res.body.payment.interest_component).toBe('98.63');
        expect(res.body.payment.principal_component).toBe('901.37');
    });
});
