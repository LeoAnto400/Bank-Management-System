const db = require('../config/db');
const { generateUniqueReference } = require('../utils/dbHelpers');
const { loadAdminContext, verifyAdminPassword } = require('../services/adminAccessService');
const { buildAdminDashboardPayload } = require('../services/adminDashboardService');
const { rejectLoanApplication, approveLoanApplication } = require('../services/loanReviewService');

const dbPromise = db.promise();

const COUNTER_TRANSACTION_TYPES = ['Credit', 'Debit'];
const REVIEW_ACTIONS = ['approve', 'reject'];

exports.getMyDashboard = async (req, res) => {
    try {
        const admin = await loadAdminContext(req.user.accountant_id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin dashboard not found.' });
        }

        const dashboard = await buildAdminDashboardPayload(admin);

        return res.json(dashboard);
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
            await rejectLoanApplication({
                applicationId,
                accountantId,
                reviewNotes,
                loanType: application.loan_type,
            });

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

        const { loanId, creditedAccountId, creditedBalance } = await approveLoanApplication({
            application,
            applicationId,
            accountantId,
            sanctionAmount,
            sanctionRate,
            reviewNotes,
        });

        await dbPromise.commit();

        return res.status(201).json({
            message: 'Loan application approved and funds credited successfully.',
            loan_id: loanId,
            credited_account_id: creditedAccountId,
            credited_balance: creditedBalance,
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
