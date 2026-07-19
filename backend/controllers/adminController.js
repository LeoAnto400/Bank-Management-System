const db = require('../config/db');
const {
    addMonthsToDate,
    calculateEmi,
    generateReferenceNumber,
} = require('../utils/loanUtils');

const dbPromise = db.promise();

const COUNTER_TRANSACTION_TYPES = ['Credit', 'Debit'];
const REVIEW_ACTIONS = ['approve', 'reject'];

const buildInClause = (values) => values.map(() => '?').join(', ');

const optionalQuery = async (query, params = [], fallbackValue = []) => {
    try {
        const [rows] = await dbPromise.query(query, params);
        return rows;
    } catch (error) {
        if (error && error.code === 'ER_NO_SUCH_TABLE') {
            return fallbackValue;
        }

        throw error;
    }
};

const generateUniqueReference = async (tableName, columnName, prefix) => {
    while (true) {
        const reference = generateReferenceNumber(prefix);
        const [[existing]] = await dbPromise.query(
            `SELECT ${columnName} FROM ${tableName} WHERE ${columnName} = ? LIMIT 1`,
            [reference]
        );

        if (!existing) {
            return reference;
        }
    }
};

const loadAdminContext = async (accountantId) => {
    const [[admin]] = await dbPromise.query(
        `
            SELECT
                a.accountant_id,
                a.branch_id,
                a.first_name,
                a.last_name,
                a.employee_code,
                a.employee_role,
                a.accountant_email,
                a.accountant_phone,
                a.joining_date,
                b.branch_name,
                b.branch_city,
                b.branch_state,
                b.branch_address,
                b.ifsc_code
            FROM Accountants a
            JOIN Branches b ON b.branch_id = a.branch_id
            WHERE a.accountant_id = ?
            LIMIT 1
        `,
        [accountantId]
    );

    return admin || null;
};

const verifyAdminPassword = async (accountantId, password) => {
    const secret = String(password || '').trim();

    if (!secret) {
        return false;
    }

    const [[login]] = await dbPromise.query(
        `
            SELECT admin_login_id
            FROM Admin_Login
            WHERE accountant_id = ?
              AND password_hash = SHA2(?, 256)
              AND is_active = 1
            LIMIT 1
        `,
        [accountantId, secret]
    );

    return Boolean(login);
};

exports.getMyDashboard = async (req, res) => {
    try {
        const admin = await loadAdminContext(req.user.accountant_id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin dashboard not found.' });
        }

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

        return res.json({
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
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to load admin dashboard.' });
    }
};

exports.createCounterTransaction = async (req, res) => {
    const accountantId = req.user.accountant_id;
    const accountId = Number(req.params.accountId);
    const transactionType = (req.body?.transaction_type || '').trim();
    const transactionDesc = (req.body?.transaction_desc || '').trim();
    const amount = Number(req.body?.transaction_amount || 0);
    const confirmPassword = String(req.body?.confirm_password || '');

    if (!Number.isInteger(accountId)) {
        return res.status(400).json({ message: 'A valid account id is required.' });
    }

    if (!COUNTER_TRANSACTION_TYPES.includes(transactionType)) {
        return res.status(400).json({
            message: `transaction_type must be one of: ${COUNTER_TRANSACTION_TYPES.join(', ')}`,
        });
    }

    if (!transactionDesc) {
        return res.status(400).json({ message: 'transaction_desc is required.' });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            message: 'transaction_amount must be a valid number greater than zero.',
        });
    }

    if (!confirmPassword) {
        return res.status(400).json({ message: 'confirm_password is required.' });
    }

    try {
        const admin = await loadAdminContext(accountantId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const passwordVerified = await verifyAdminPassword(accountantId, confirmPassword);

        if (!passwordVerified) {
            return res.status(401).json({ message: 'Password confirmation failed.' });
        }

        await dbPromise.beginTransaction();

        const [accounts] = await dbPromise.query(
            `
                SELECT
                    a.account_id,
                    a.account_number,
                    a.account_type,
                    a.account_balance,
                    a.account_currency,
                    a.account_status,
                    a.branch_id,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name
                FROM Accounts a
                JOIN Customers c ON c.customer_id = a.customer_id
                WHERE a.account_id = ?
                  AND a.branch_id = ?
                FOR UPDATE
            `,
            [accountId, admin.branch_id]
        );

        const account = accounts[0];

        if (!account) {
            await dbPromise.rollback();
            return res.status(404).json({
                message: 'This account is not available in the accountant branch scope.',
            });
        }

        if (account.account_status !== 'Active') {
            await dbPromise.rollback();
            return res.status(403).json({
                message: `Counter transactions are only allowed on active accounts. This account is ${account.account_status}.`,
            });
        }

        const currentBalance = Number(account.account_balance || 0);
        const nextBalance =
            transactionType === 'Credit' ? currentBalance + amount : currentBalance - amount;

        if (nextBalance < 0) {
            await dbPromise.rollback();
            return res.status(400).json({
                message: 'Insufficient balance for this withdrawal.',
            });
        }

        const referenceNumber = await generateUniqueReference(
            'Transactions',
            'reference_number',
            'CTX'
        );

        const [insertResult] = await dbPromise.query(
            `
                INSERT INTO Transactions (
                    account_id,
                    transaction_type,
                    transaction_amount,
                    balance_after_txn,
                    transaction_desc,
                    transaction_channel,
                    reference_number,
                    transaction_status
                )
                VALUES (?, ?, ?, ?, ?, 'Branch Counter', ?, 'Success')
            `,
            [accountId, transactionType, amount, nextBalance, transactionDesc, referenceNumber]
        );

        await dbPromise.query(
            `
                UPDATE Accounts
                SET account_balance = ?
                WHERE account_id = ?
            `,
            [nextBalance, accountId]
        );

        await dbPromise.query(
            `
                INSERT INTO Audit_Logs (
                    accountant_id,
                    audit_action,
                    target_table_name,
                    target_record_id,
                    old_value,
                    new_value,
                    audit_remarks
                )
                VALUES (?, ?, 'Transactions', ?, ?, ?, ?)
            `,
            [
                accountantId,
                transactionType === 'Credit' ? 'Counter Deposit' : 'Counter Withdrawal',
                insertResult.insertId,
                `balance_before: ${currentBalance.toFixed(2)}`,
                `balance_after: ${nextBalance.toFixed(2)}`,
                `${transactionType} via branch counter for ${account.account_number}`,
            ]
        );

        await dbPromise.commit();

        const [[transaction]] = await dbPromise.query(
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
                WHERE t.transaction_id = ?
                LIMIT 1
            `,
            [insertResult.insertId]
        );

        return res.status(201).json({
            message:
                transactionType === 'Credit'
                    ? 'Cash deposit recorded successfully.'
                    : 'Cash withdrawal recorded successfully.',
            transaction,
            account: {
                ...account,
                account_balance: nextBalance,
            },
        });
    } catch (error) {
        try {
            await dbPromise.rollback();
        } catch {
            // Ignore rollback failures.
        }

        return res.status(500).json({
            message: 'Failed to record the branch counter transaction.',
        });
    }
};

exports.reviewLoanApplication = async (req, res) => {
    const [[loanApplicationsTable]] = await dbPromise.query(
        `
            SELECT 1 AS present
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Loan_Applications'
            LIMIT 1
        `
    );

    if (!loanApplicationsTable) {
        return res.status(503).json({
            message: 'Loan review is unavailable until the Loan_Applications table is added to the database.',
        });
    }

    const accountantId = req.user.accountant_id;
    const applicationId = Number(req.params.applicationId);
    const action = String(req.body?.action || '').trim().toLowerCase();
    const reviewNotes = String(req.body?.review_notes || '').trim();
    const confirmPassword = String(req.body?.confirm_password || '');
    const approvedAmount =
        req.body?.approved_amount === '' || req.body?.approved_amount === undefined
            ? null
            : Number(req.body?.approved_amount);
    const annualInterestRate =
        req.body?.annual_interest_rate === '' || req.body?.annual_interest_rate === undefined
            ? null
            : Number(req.body?.annual_interest_rate);

    if (!Number.isInteger(applicationId)) {
        return res.status(400).json({ message: 'A valid loan application id is required.' });
    }

    if (!REVIEW_ACTIONS.includes(action)) {
        return res.status(400).json({
            message: `action must be one of: ${REVIEW_ACTIONS.join(', ')}`,
        });
    }

    if (!confirmPassword) {
        return res.status(400).json({ message: 'confirm_password is required.' });
    }

    try {
        const admin = await loadAdminContext(accountantId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const passwordVerified = await verifyAdminPassword(accountantId, confirmPassword);

        if (!passwordVerified) {
            return res.status(401).json({ message: 'Password confirmation failed.' });
        }

        await dbPromise.beginTransaction();

        const [applicationRows] = await dbPromise.query(
            `
                SELECT
                    la.loan_application_id,
                    la.customer_id,
                    la.branch_id,
                    la.linked_account_id,
                    la.loan_type,
                    la.requested_amount,
                    la.annual_interest_rate,
                    la.tenure_months,
                    la.estimated_emi,
                    la.purpose,
                    la.application_status,
                    a.account_number,
                    a.account_balance,
                    a.account_status
                FROM Loan_Applications la
                JOIN Accounts a ON a.account_id = la.linked_account_id
                WHERE la.loan_application_id = ?
                  AND la.branch_id = ?
                FOR UPDATE
            `,
            [applicationId, admin.branch_id]
        );

        const application = applicationRows[0];

        if (!application) {
            await dbPromise.rollback();
            return res.status(404).json({
                message: 'Loan application not found in the accountant branch scope.',
            });
        }

        if (application.application_status !== 'Pending') {
            await dbPromise.rollback();
            return res.status(409).json({
                message: `This loan application is already ${application.application_status}.`,
            });
        }

        if (action === 'reject') {
            await dbPromise.query(
                `
                    UPDATE Loan_Applications
                    SET
                        application_status = 'Rejected',
                        review_notes = ?,
                        reviewed_by = ?,
                        reviewed_at = NOW()
                    WHERE loan_application_id = ?
                `,
                [reviewNotes || 'Rejected during accountant review.', accountantId, applicationId]
            );

            await dbPromise.query(
                `
                    INSERT INTO Audit_Logs (
                        accountant_id,
                        audit_action,
                        target_table_name,
                        target_record_id,
                        old_value,
                        new_value,
                        audit_remarks
                    )
                    VALUES (?, 'Loan Rejected', 'Loan_Applications', ?, ?, ?, ?)
                `,
                [
                    accountantId,
                    applicationId,
                    'application_status: Pending',
                    'application_status: Rejected',
                    reviewNotes || `Rejected ${application.loan_type} loan request`,
                ]
            );

            await dbPromise.commit();

            return res.json({
                message: 'Loan application rejected successfully.',
            });
        }

        if (application.account_status !== 'Active') {
            await dbPromise.rollback();
            return res.status(403).json({
                message: `Loan approval requires an active destination account. This account is ${application.account_status}.`,
            });
        }

        const sanctionAmount = Number.isFinite(approvedAmount)
            ? approvedAmount
            : Number(application.requested_amount || 0);
        const sanctionRate = Number.isFinite(annualInterestRate)
            ? annualInterestRate
            : Number(application.annual_interest_rate || 0);

        if (!Number.isFinite(sanctionAmount) || sanctionAmount <= 0) {
            await dbPromise.rollback();
            return res.status(400).json({ message: 'approved_amount must be greater than zero.' });
        }

        if (!Number.isFinite(sanctionRate) || sanctionRate < 0) {
            await dbPromise.rollback();
            return res.status(400).json({
                message: 'annual_interest_rate must be a valid number zero or above.',
            });
        }

        const emiAmount = calculateEmi(
            sanctionAmount,
            sanctionRate,
            Number(application.tenure_months || 0)
        );
        const disbursementDate = new Date().toISOString().slice(0, 10);
        const maturityDate = addMonthsToDate(disbursementDate, application.tenure_months);
        const nextBalance = Number(application.account_balance || 0) + sanctionAmount;
        const transactionReference = await generateUniqueReference(
            'Transactions',
            'reference_number',
            'LCR'
        );

        const [loanInsert] = await dbPromise.query(
            `
                INSERT INTO Loans (
                    customer_id,
                    branch_id,
                    loan_type,
                    principal_amount,
                    annual_interest_rate,
                    tenure_months,
                    emi_amount,
                    outstanding_amount,
                    disbursement_date,
                    maturity_date,
                    loan_status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
            `,
            [
                application.customer_id,
                application.branch_id,
                application.loan_type,
                sanctionAmount,
                sanctionRate,
                application.tenure_months,
                emiAmount,
                sanctionAmount,
                disbursementDate,
                maturityDate,
            ]
        );

        await dbPromise.query(
            `
                UPDATE Accounts
                SET account_balance = ?
                WHERE account_id = ?
            `,
            [nextBalance, application.linked_account_id]
        );

        await dbPromise.query(
            `
                INSERT INTO Transactions (
                    account_id,
                    transaction_type,
                    transaction_amount,
                    balance_after_txn,
                    transaction_desc,
                    transaction_channel,
                    reference_number,
                    transaction_status
                )
                VALUES (?, 'Credit', ?, ?, ?, 'Branch Counter', ?, 'Success')
            `,
            [
                application.linked_account_id,
                sanctionAmount,
                nextBalance,
                `${application.loan_type} loan disbursal`,
                transactionReference,
            ]
        );

        await dbPromise.query(
            `
                UPDATE Loan_Applications
                SET
                    application_status = 'Approved',
                    approved_amount = ?,
                    annual_interest_rate = ?,
                    estimated_emi = ?,
                    review_notes = ?,
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    created_loan_id = ?
                WHERE loan_application_id = ?
            `,
            [
                sanctionAmount,
                sanctionRate,
                emiAmount,
                reviewNotes || 'Approved by branch accountant.',
                accountantId,
                loanInsert.insertId,
                applicationId,
            ]
        );

        await dbPromise.query(
            `
                INSERT INTO Audit_Logs (
                    accountant_id,
                    audit_action,
                    target_table_name,
                    target_record_id,
                    old_value,
                    new_value,
                    audit_remarks
                )
                VALUES (?, 'Loan Approved', 'Loans', ?, ?, ?, ?)
            `,
            [
                accountantId,
                loanInsert.insertId,
                'application_status: Pending',
                `loan_type: ${application.loan_type} amount: ${sanctionAmount.toFixed(2)} rate: ${sanctionRate.toFixed(2)}%`,
                reviewNotes || `Approved ${application.loan_type} loan application ${applicationId}`,
            ]
        );

        await dbPromise.commit();

        return res.status(201).json({
            message: 'Loan application approved and funds credited successfully.',
            loan_id: loanInsert.insertId,
            credited_account_id: application.linked_account_id,
            credited_balance: nextBalance,
        });
    } catch (error) {
        try {
            await dbPromise.rollback();
        } catch {
            // Ignore rollback failures.
        }

        return res.status(500).json({ message: 'Failed to review the loan application.' });
    }
};

exports.updateBranchAccount = async (req, res) => {
    const accountantId = req.user.accountant_id;
    const accountId = Number(req.params.accountId);
    const confirmPassword = String(req.body?.confirm_password || '');
    const accountType = String(req.body?.account_type || '').trim();
    const accountStatus = String(req.body?.account_status || '').trim();
    const annualInterestRate =
        req.body?.annual_interest_rate === '' || req.body?.annual_interest_rate === undefined
            ? null
            : Number(req.body?.annual_interest_rate);

    const allowedTypes = ['Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit'];
    const allowedStatuses = ['Active', 'Inactive', 'Frozen', 'Closed'];

    if (!Number.isInteger(accountId)) {
        return res.status(400).json({ message: 'A valid account id is required.' });
    }

    if (!confirmPassword) {
        return res.status(400).json({ message: 'confirm_password is required.' });
    }

    if (!allowedTypes.includes(accountType)) {
        return res.status(400).json({ message: `account_type must be one of: ${allowedTypes.join(', ')}` });
    }

    if (!allowedStatuses.includes(accountStatus)) {
        return res.status(400).json({ message: `account_status must be one of: ${allowedStatuses.join(', ')}` });
    }

    if (annualInterestRate !== null && (!Number.isFinite(annualInterestRate) || annualInterestRate < 0)) {
        return res.status(400).json({ message: 'annual_interest_rate must be a valid number zero or above.' });
    }

    try {
        const admin = await loadAdminContext(accountantId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const passwordVerified = await verifyAdminPassword(accountantId, confirmPassword);

        if (!passwordVerified) {
            return res.status(401).json({ message: 'Password confirmation failed.' });
        }

        await dbPromise.beginTransaction();

        const [rows] = await dbPromise.query(
            `
                SELECT
                    a.account_id,
                    a.account_number,
                    a.account_type,
                    a.account_status,
                    a.annual_interest_rate,
                    a.branch_id
                FROM Accounts a
                WHERE a.account_id = ?
                  AND a.branch_id = ?
                FOR UPDATE
            `,
            [accountId, admin.branch_id]
        );

        const account = rows[0];

        if (!account) {
            await dbPromise.rollback();
            return res.status(404).json({ message: 'Account not found in this branch.' });
        }

        await dbPromise.query(
            `
                UPDATE Accounts
                SET
                    account_type = ?,
                    account_status = ?,
                    annual_interest_rate = ?
                WHERE account_id = ?
            `,
            [accountType, accountStatus, annualInterestRate, accountId]
        );

        await dbPromise.query(
            `
                INSERT INTO Audit_Logs (
                    accountant_id,
                    audit_action,
                    target_table_name,
                    target_record_id,
                    old_value,
                    new_value,
                    audit_remarks
                )
                VALUES (?, 'Account Updated', 'Accounts', ?, ?, ?, ?)
            `,
            [
                accountantId,
                accountId,
                `account_type: ${account.account_type}, account_status: ${account.account_status}, annual_interest_rate: ${account.annual_interest_rate ?? 'NULL'}`,
                `account_type: ${accountType}, account_status: ${accountStatus}, annual_interest_rate: ${annualInterestRate ?? 'NULL'}`,
                `Branch accountant updated account ${account.account_number}`,
            ]
        );

        await dbPromise.commit();

        return res.json({ message: 'Account details updated successfully.' });
    } catch (error) {
        try {
            await dbPromise.rollback();
        } catch {}

        return res.status(500).json({ message: 'Failed to update account details.' });
    }
};

exports.updateBranchCustomer = async (req, res) => {
    const accountantId = req.user.accountant_id;
    const customerId = Number(req.params.customerId);
    const confirmPassword = String(req.body?.confirm_password || '');
    const updates = {
        first_name: String(req.body?.first_name || '').trim(),
        last_name: String(req.body?.last_name || '').trim(),
        customer_phone: String(req.body?.customer_phone || '').trim(),
        customer_email: String(req.body?.customer_email || '').trim(),
        customer_address: String(req.body?.customer_address || '').trim(),
        customer_city: String(req.body?.customer_city || '').trim(),
        customer_state: String(req.body?.customer_state || '').trim(),
        pincode: String(req.body?.pincode || '').trim(),
        kyc_status: String(req.body?.kyc_status || '').trim(),
    };
    const allowedKyc = ['Pending', 'Verified', 'Rejected'];

    if (!Number.isInteger(customerId)) {
        return res.status(400).json({ message: 'A valid customer id is required.' });
    }

    if (!confirmPassword) {
        return res.status(400).json({ message: 'confirm_password is required.' });
    }

    if (!allowedKyc.includes(updates.kyc_status)) {
        return res.status(400).json({ message: `kyc_status must be one of: ${allowedKyc.join(', ')}` });
    }

    if (Object.values(updates).some((value) => !value)) {
        return res.status(400).json({ message: 'All customer fields are required.' });
    }

    try {
        const admin = await loadAdminContext(accountantId);

        if (!admin) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const passwordVerified = await verifyAdminPassword(accountantId, confirmPassword);

        if (!passwordVerified) {
            return res.status(401).json({ message: 'Password confirmation failed.' });
        }

        await dbPromise.beginTransaction();

        const [rows] = await dbPromise.query(
            `
                SELECT DISTINCT
                    c.customer_id,
                    c.first_name,
                    c.last_name,
                    c.customer_phone,
                    c.customer_email,
                    c.customer_address,
                    c.customer_city,
                    c.customer_state,
                    c.pincode,
                    c.kyc_status
                FROM Customers c
                JOIN Accounts a ON a.customer_id = c.customer_id
                WHERE c.customer_id = ?
                  AND a.branch_id = ?
                FOR UPDATE
            `,
            [customerId, admin.branch_id]
        );

        const customer = rows[0];

        if (!customer) {
            await dbPromise.rollback();
            return res.status(404).json({ message: 'Customer not found in this branch.' });
        }

        await dbPromise.query(
            `
                UPDATE Customers
                SET
                    first_name = ?,
                    last_name = ?,
                    customer_phone = ?,
                    customer_email = ?,
                    customer_address = ?,
                    customer_city = ?,
                    customer_state = ?,
                    pincode = ?,
                    kyc_status = ?
                WHERE customer_id = ?
            `,
            [
                updates.first_name,
                updates.last_name,
                updates.customer_phone,
                updates.customer_email,
                updates.customer_address,
                updates.customer_city,
                updates.customer_state,
                updates.pincode,
                updates.kyc_status,
                customerId,
            ]
        );

        await dbPromise.query(
            `
                INSERT INTO Audit_Logs (
                    accountant_id,
                    audit_action,
                    target_table_name,
                    target_record_id,
                    old_value,
                    new_value,
                    audit_remarks
                )
                VALUES (?, 'Customer Updated', 'Customers', ?, ?, ?, ?)
            `,
            [
                accountantId,
                customerId,
                `name: ${customer.first_name} ${customer.last_name}, phone: ${customer.customer_phone}, email: ${customer.customer_email}, city: ${customer.customer_city}, state: ${customer.customer_state}, kyc_status: ${customer.kyc_status}`,
                `name: ${updates.first_name} ${updates.last_name}, phone: ${updates.customer_phone}, email: ${updates.customer_email}, city: ${updates.customer_city}, state: ${updates.customer_state}, kyc_status: ${updates.kyc_status}`,
                `Branch accountant updated customer ${customerId}`,
            ]
        );

        await dbPromise.commit();

        return res.json({ message: 'Customer details updated successfully.' });
    } catch (error) {
        try {
            await dbPromise.rollback();
        } catch {}

        if (error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062)) {
            return res.status(409).json({ message: 'The email or phone details already exist for another customer.' });
        }

        return res.status(500).json({ message: 'Failed to update customer details.' });
    }
};
