const db = require('../config/db');
const { optionalQuery, buildInClause } = require('../utils/dbHelpers');

const dbPromise = db.promise();

const buildAdminDashboardPayload = async (admin) => {
    const branchId = admin.branch_id;

    const [
        [accounts],
        [customers],
        [recentTransactions],
        [recentAccounts],
        [loans],
        auditLogs,
        [branchSummaryRows],
        pendingLoanApplicationRows,
    ] = await Promise.all([
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
                    a.created_at,
                    c.customer_id,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                    c.customer_email,
                    c.customer_phone
                FROM Accounts a
                JOIN Customers c ON c.customer_id = a.customer_id
                WHERE a.branch_id = ?
                ORDER BY a.created_at DESC, a.account_id DESC
            `,
            [branchId]
        ),
        dbPromise.query(
            `
                SELECT DISTINCT
                    c.customer_id,
                    c.first_name,
                    c.last_name,
                    c.customer_address,
                    c.customer_city,
                    c.customer_state,
                    c.pincode,
                    c.customer_email,
                    c.customer_phone,
                    c.kyc_status,
                    c.created_at
                FROM Customers c
                JOIN Accounts a ON a.customer_id = c.customer_id
                WHERE a.branch_id = ?
                ORDER BY c.created_at DESC, c.customer_id DESC
            `,
            [branchId]
        ),
        dbPromise.query(
            `
                SELECT
                    t.transaction_id,
                    t.account_id,
                    a.account_number,
                    a.account_type,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
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
                JOIN Customers c ON c.customer_id = a.customer_id
                WHERE a.branch_id = ?
                ORDER BY t.transaction_date DESC, t.transaction_id DESC
                LIMIT 12
            `,
            [branchId]
        ),
        dbPromise.query(
            `
                SELECT
                    a.account_id,
                    a.account_number,
                    a.account_type,
                    a.account_balance,
                    a.account_status,
                    a.opened_date,
                    a.created_at,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name
                FROM Accounts a
                JOIN Customers c ON c.customer_id = a.customer_id
                WHERE a.branch_id = ?
                ORDER BY a.created_at DESC, a.account_id DESC
                LIMIT 8
            `,
            [branchId]
        ),
        dbPromise.query(
            `
                SELECT
                    l.loan_id,
                    l.loan_type,
                    l.principal_amount,
                    l.outstanding_amount,
                    l.emi_amount,
                    l.loan_status,
                    l.disbursement_date,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name
                FROM Loans l
                JOIN Customers c ON c.customer_id = l.customer_id
                WHERE l.branch_id = ?
                  AND l.loan_status = 'Active'
                ORDER BY l.disbursement_date DESC, l.loan_id DESC
                LIMIT 8
            `,
            [branchId]
        ),
        optionalQuery(
            `
                SELECT
                    al.audit_log_id,
                    al.accountant_id,
                    CONCAT(acc.first_name, ' ', acc.last_name) AS accountant_name,
                    acc.employee_role,
                    al.audit_action,
                    al.target_table_name,
                    al.target_record_id,
                    al.old_value,
                    al.new_value,
                    al.ip_address,
                    al.audit_remarks,
                    al.performed_at
                FROM Audit_Logs al
                JOIN Accountants acc ON acc.accountant_id = al.accountant_id
                WHERE acc.branch_id = ?
                ORDER BY al.performed_at DESC, al.audit_log_id DESC
                LIMIT 20
            `,
            [branchId]
        ),
        dbPromise.query(
            `
                SELECT
                    COUNT(DISTINCT a.account_id) AS total_accounts,
                    COALESCE(SUM(a.account_balance), 0) AS total_deposits,
                    COUNT(
                        DISTINCT CASE
                            WHEN l.loan_status = 'Active' THEN l.loan_id
                            ELSE NULL
                        END
                    ) AS active_loans
                FROM Accounts a
                LEFT JOIN Loans l ON l.branch_id = a.branch_id
                WHERE a.branch_id = ?
            `,
            [branchId]
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
                    la.created_at,
                    c.first_name,
                    c.last_name,
                    c.customer_email,
                    c.customer_phone,
                    c.customer_city,
                    c.customer_state,
                    c.kyc_status,
                    a.account_number AS linked_account_number,
                    a.account_type AS linked_account_type,
                    a.account_balance AS linked_account_balance,
                    a.account_status AS linked_account_status
                FROM Loan_Applications la
                JOIN Customers c ON c.customer_id = la.customer_id
                JOIN Accounts a ON a.account_id = la.linked_account_id
                WHERE la.branch_id = ?
                  AND la.application_status = 'Pending'
                ORDER BY la.created_at ASC, la.loan_application_id ASC
            `,
            [branchId]
        ),
    ]);

    const todayTransactionCount = accounts.length
        ? recentTransactions.filter((transaction) => {
              const transactionDate = new Date(transaction.transaction_date);
              const now = new Date();

              return (
                  transactionDate.getFullYear() === now.getFullYear() &&
                  transactionDate.getMonth() === now.getMonth() &&
                  transactionDate.getDate() === now.getDate()
              );
          }).length
        : 0;

    const [[todayTransactionsResult]] = await dbPromise.query(
        `
            SELECT COUNT(*) AS total_transactions_today
            FROM Transactions t
            JOIN Accounts a ON a.account_id = t.account_id
            WHERE a.branch_id = ?
              AND DATE(t.transaction_date) = CURDATE()
        `,
        [branchId]
    );

    const branchSummary = branchSummaryRows[0] || {};
    const pendingCustomerIds = [...new Set(pendingLoanApplicationRows.map((row) => row.customer_id))];
    let pendingLoanApplications = pendingLoanApplicationRows.map((application) => ({
        ...application,
        customer_accounts: [],
        customer_loans: [],
        account_balance_history: [],
    }));

    if (pendingCustomerIds.length) {
        const placeholders = buildInClause(pendingCustomerIds);
        const [[customerAccounts], [customerLoans], [balanceHistory]] = await Promise.all([
            dbPromise.query(
                `
                    SELECT
                        a.account_id,
                        a.customer_id,
                        a.account_number,
                        a.account_type,
                        a.account_balance,
                        a.account_status,
                        b.branch_name
                    FROM Accounts a
                    JOIN Branches b ON b.branch_id = a.branch_id
                    WHERE a.customer_id IN (${placeholders})
                    ORDER BY a.customer_id ASC, a.account_balance DESC, a.account_id DESC
                `,
                pendingCustomerIds
            ),
            dbPromise.query(
                `
                    SELECT
                        l.loan_id,
                        l.customer_id,
                        l.loan_type,
                        l.principal_amount,
                        l.outstanding_amount,
                        l.annual_interest_rate,
                        l.tenure_months,
                        l.emi_amount,
                        l.loan_status,
                        l.disbursement_date,
                        l.maturity_date
                    FROM Loans l
                    WHERE l.customer_id IN (${placeholders})
                    ORDER BY l.customer_id ASC, l.disbursement_date DESC, l.loan_id DESC
                `,
                pendingCustomerIds
            ),
            dbPromise.query(
                `
                    SELECT
                        a.customer_id,
                        a.account_id,
                        a.account_number,
                        t.transaction_id,
                        t.transaction_type,
                        t.transaction_amount,
                        t.balance_after_txn,
                        t.transaction_desc,
                        t.transaction_channel,
                        t.transaction_date
                    FROM Transactions t
                    JOIN Accounts a ON a.account_id = t.account_id
                    WHERE a.customer_id IN (${placeholders})
                    ORDER BY t.transaction_date DESC, t.transaction_id DESC
                `,
                pendingCustomerIds
            ),
        ]);

        const customerAccountsById = customerAccounts.reduce((accumulator, account) => {
            const key = String(account.customer_id);
            accumulator[key] = accumulator[key] || [];
            accumulator[key].push(account);
            return accumulator;
        }, {});

        const customerLoansById = customerLoans.reduce((accumulator, loan) => {
            const key = String(loan.customer_id);
            accumulator[key] = accumulator[key] || [];
            accumulator[key].push(loan);
            return accumulator;
        }, {});

        const historyByCustomerId = balanceHistory.reduce((accumulator, entry) => {
            const key = String(entry.customer_id);
            accumulator[key] = accumulator[key] || [];

            if (accumulator[key].length < 12) {
                accumulator[key].push(entry);
            }

            return accumulator;
        }, {});

        pendingLoanApplications = pendingLoanApplicationRows.map((application) => ({
            ...application,
            customer_accounts: customerAccountsById[String(application.customer_id)] || [],
            customer_loans: customerLoansById[String(application.customer_id)] || [],
            account_balance_history: historyByCustomerId[String(application.customer_id)] || [],
        }));
    }

    const summary = {
        total_accounts: Number(branchSummary.total_accounts) || accounts.length,
        total_customers: customers.length,
        total_deposits:
            Number(branchSummary.total_deposits) ||
            accounts.reduce((sum, account) => sum + Number(account.account_balance || 0), 0),
        total_transactions_today:
            Number(todayTransactionsResult?.total_transactions_today) || todayTransactionCount,
        active_loans: Number(branchSummary.active_loans) || loans.length,
        pending_loan_applications: pendingLoanApplications.length,
        branch_audit_logs: auditLogs.length,
    };

    return {
        profile: admin,
        summary,
        accounts,
        customers,
        transactions: recentTransactions,
        recent_accounts: recentAccounts,
        recent_transactions: recentTransactions,
        active_loans: loans,
        audit_logs: auditLogs,
        pending_loan_applications: pendingLoanApplications,
    };
};

module.exports = { buildAdminDashboardPayload };
