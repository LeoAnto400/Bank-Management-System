const db = require('../config/db');
const { getLoanTypeOptions } = require('../utils/loanUtils');
const { optionalQuery } = require('../utils/dbHelpers');

const dbPromise = db.promise();

const loanPaymentMethodOptions = [
    'Online Banking',
    'Branch Counter',
    'Auto-Debit',
    'Cheque',
];

const buildDashboardPayload = async (customerId) => {
    const [
        [customerRows],
        [accountRows],
        [transactionRows],
        cardRows,
        loanRows,
        transferRows,
        loanApplicationRows,
        loanPaymentRows,
        loanTypeOptions,
    ] = await Promise.all([
        dbPromise.query(
            `
                SELECT
                    customer_id,
                    first_name,
                    last_name,
                    date_of_birth,
                    gender,
                    pan_number,
                    aadhaar_number,
                    customer_phone,
                    customer_email,
                    customer_address,
                    customer_city,
                    customer_state,
                    pincode,
                    kyc_status,
                    created_at
                FROM Customers
                WHERE customer_id = ?
                LIMIT 1
            `,
            [customerId]
        ),
        dbPromise.query(
            `
                SELECT
                    a.account_id,
                    a.account_number,
                    a.account_type,
                    a.account_balance,
                    a.account_currency,
                    a.account_status,
                    a.opened_date,
                    a.annual_interest_rate,
                    b.branch_name,
                    b.branch_city,
                    b.branch_state,
                    b.ifsc_code
                FROM Accounts a
                JOIN Branches b ON b.branch_id = a.branch_id
                WHERE a.customer_id = ?
                ORDER BY a.opened_date DESC, a.account_id DESC
            `,
            [customerId]
        ),
        dbPromise.query(
            `
                SELECT
                    t.transaction_id,
                    t.account_id,
                    a.account_number,
                    a.account_type,
                    t.transaction_type,
                    t.transaction_amount,
                    t.balance_after_txn,
                    t.transaction_desc,
                    t.transaction_channel,
                    t.reference_number,
                    t.transaction_status,
                    t.transaction_date
                FROM Transactions t
                JOIN Accounts a ON a.account_id = t.account_id
                WHERE a.customer_id = ?
                ORDER BY t.transaction_date DESC, t.transaction_id DESC
                LIMIT 12
            `,
            [customerId]
        ),
        optionalQuery(
            `
                SELECT
                    cd.card_id,
                    cd.account_id,
                    a.account_number,
                    cd.card_type,
                    cd.card_network,
                    cd.card_holder_name,
                    cd.issue_date,
                    cd.expiry_date,
                    cd.credit_limit,
                    cd.outstanding_amount,
                    cd.card_status
                FROM Cards cd
                JOIN Accounts a ON a.account_id = cd.account_id
                WHERE a.customer_id = ?
                ORDER BY cd.expiry_date ASC, cd.card_id DESC
            `,
            [customerId]
        ),
        optionalQuery(
            `
                SELECT
                    l.loan_id,
                    l.loan_type,
                    l.principal_amount,
                    l.annual_interest_rate,
                    l.tenure_months,
                    l.emi_amount,
                    l.outstanding_amount,
                    l.disbursement_date,
                    l.maturity_date,
                    l.loan_status,
                    b.branch_name
                FROM Loans l
                JOIN Branches b ON b.branch_id = l.branch_id
                WHERE l.customer_id = ?
                ORDER BY l.disbursement_date DESC, l.loan_id DESC
            `,
            [customerId]
        ),
        optionalQuery(
            `
                SELECT
                    tr.transfer_id,
                    tr.sender_account_id,
                    tr.receiver_account_id,
                    sender.account_number AS sender_account_number,
                    receiver.account_number AS receiver_account_number,
                    tr.transfer_amount,
                    tr.transfer_mode,
                    tr.reference_number,
                    tr.transfer_remarks,
                    tr.transfer_status,
                    tr.initiated_at,
                    tr.completed_at,
                    CASE
                        WHEN sender.customer_id = ? THEN 'Outgoing'
                        ELSE 'Incoming'
                    END AS transfer_direction
                FROM Transfers tr
                JOIN Accounts sender ON sender.account_id = tr.sender_account_id
                JOIN Accounts receiver ON receiver.account_id = tr.receiver_account_id
                WHERE sender.customer_id = ? OR receiver.customer_id = ?
                ORDER BY tr.initiated_at DESC, tr.transfer_id DESC
                LIMIT 10
            `,
            [customerId, customerId, customerId]
        ),
        optionalQuery(
            `
                SELECT
                    la.loan_application_id,
                    la.customer_id,
                    la.branch_id,
                    la.linked_account_id,
                    la.loan_type,
                    la.requested_amount,
                    la.approved_amount,
                    la.annual_interest_rate,
                    la.tenure_months,
                    la.estimated_emi,
                    la.purpose,
                    la.application_status,
                    la.review_notes,
                    la.reviewed_by,
                    la.reviewed_at,
                    la.created_loan_id,
                    la.created_at,
                    a.account_number AS linked_account_number,
                    a.account_type AS linked_account_type,
                    a.account_balance AS linked_account_balance,
                    b.branch_name,
                    CONCAT(ac.first_name, ' ', ac.last_name) AS reviewed_by_name
                FROM Loan_Applications la
                JOIN Accounts a ON a.account_id = la.linked_account_id
                JOIN Branches b ON b.branch_id = la.branch_id
                LEFT JOIN Accountants ac ON ac.accountant_id = la.reviewed_by
                WHERE la.customer_id = ?
                ORDER BY la.created_at DESC, la.loan_application_id DESC
            `,
            [customerId]
        ),
        optionalQuery(
            `
                SELECT
                    lp.payment_id,
                    lp.loan_id,
                    lp.payment_date,
                    lp.amount_paid,
                    lp.principal_component,
                    lp.interest_component,
                    lp.penalty_amount,
                    lp.payment_method,
                    lp.reference_number,
                    lp.payment_status,
                    lp.created_at,
                    l.loan_type,
                    l.emi_amount,
                    l.outstanding_amount
                FROM Loan_Payments lp
                JOIN Loans l ON l.loan_id = lp.loan_id
                WHERE l.customer_id = ?
                ORDER BY lp.payment_date DESC, lp.payment_id DESC
                LIMIT 20
            `,
            [customerId]
        ),
        getLoanTypeOptions(dbPromise),
    ]);

    const customer = customerRows[0];

    if (!customer) {
        return null;
    }

    const summary = {
        total_balance: accountRows.reduce(
            (sum, account) => sum + Number(account.account_balance || 0),
            0
        ),
        active_accounts: accountRows.filter((account) => account.account_status === 'Active').length,
        recent_transaction_count: transactionRows.length,
        total_monthly_debits: transactionRows
            .filter((transaction) => transaction.transaction_type === 'Debit')
            .reduce((sum, transaction) => sum + Number(transaction.transaction_amount || 0), 0),
        total_monthly_credits: transactionRows
            .filter((transaction) => transaction.transaction_type === 'Credit')
            .reduce((sum, transaction) => sum + Number(transaction.transaction_amount || 0), 0),
        loan_exposure: loanRows.reduce(
            (sum, loan) => sum + Number(loan.outstanding_amount || 0),
            0
        ),
        active_cards: cardRows.filter((card) => card.card_status === 'Active').length,
        pending_loan_applications: loanApplicationRows.filter(
            (application) => application.application_status === 'Pending'
        ).length,
    };

    return {
        profile: customer,
        summary,
        accounts: accountRows,
        recent_transactions: transactionRows,
        cards: cardRows,
        loans: loanRows,
        loan_applications: loanApplicationRows,
        loan_payments: loanPaymentRows,
        loan_types: loanTypeOptions,
        loan_payment_methods: loanPaymentMethodOptions,
        recent_transfers: transferRows,
    };
};

module.exports = { buildDashboardPayload, loanPaymentMethodOptions };
