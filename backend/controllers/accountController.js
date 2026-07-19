const db = require('../config/db');

const dbPromise = db.promise();

const ACCOUNT_TYPES = ['Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit'];
const ACCOUNT_STATUSES = ['Active', 'Frozen', 'Closed'];

const generateAccountNumber = () => `AC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

const getBranchIdForCustomer = async (customerId) => {
    const [[existingAccount]] = await dbPromise.query(
        `
            SELECT branch_id
            FROM Accounts
            WHERE customer_id = ?
            ORDER BY opened_date DESC, account_id DESC
            LIMIT 1
        `,
        [customerId]
    );

    if (existingAccount?.branch_id) {
        return existingAccount.branch_id;
    }

    const [[fallbackBranch]] = await dbPromise.query(
        `
            SELECT branch_id
            FROM Branches
            ORDER BY branch_id ASC
            LIMIT 1
        `
    );

    return fallbackBranch?.branch_id || null;
};

const getOwnedAccount = async (accountId, customerId) => {
    const [[account]] = await dbPromise.query(
        `
            SELECT
                account_id,
                account_number,
                account_type,
                account_balance,
                account_currency,
                account_status,
                opened_date,
                closed_date,
                annual_interest_rate,
                branch_id,
                customer_id
            FROM Accounts
            WHERE account_id = ?
              AND customer_id = ?
            LIMIT 1
        `,
        [accountId, customerId]
    );

    return account || null;
};

// GET ALL ACCOUNTS
exports.getAccounts = (req, res) => {
    db.query('SELECT * FROM Accounts', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// GET ACCOUNT BY ID
exports.getAccountById = (req, res) => {
    const { id } = req.params;

    db.query(
        'SELECT * FROM Accounts WHERE account_id = ?',
        [id],
        (err, results) => {
            if (err) return res.status(500).send(err);
            res.json(results[0]);
        }
    );
};

// JOIN (ACCOUNT + CUSTOMER)
exports.getAccountDetails = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT
            a.account_id,
            a.account_type,
            a.account_balance,
            a.account_status,
            c.customer_id,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            c.customer_email
        FROM Accounts a
        JOIN Customers c ON a.customer_id = c.customer_id
        WHERE a.account_id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

exports.createMyAccount = async (req, res) => {
    const customerId = req.user.customer_id;
    const accountType = (req.body?.account_type || '').trim();

    if (!ACCOUNT_TYPES.includes(accountType)) {
        return res.status(400).json({
            message: `account_type must be one of: ${ACCOUNT_TYPES.join(', ')}`,
        });
    }

    try {
        const branchId = await getBranchIdForCustomer(customerId);

        if (!branchId) {
            return res.status(500).json({
                message: 'No branch is available to open a new account.',
            });
        }

        let accountNumber = generateAccountNumber();
        let created = false;

        while (!created) {
            try {
                const [result] = await dbPromise.query(
                    `
                        INSERT INTO Accounts (
                            account_number,
                            customer_id,
                            branch_id,
                            account_type,
                            account_balance,
                            account_currency,
                            account_status,
                            opened_date
                        )
                        VALUES (?, ?, ?, ?, 0, 'INR', 'Active', CURDATE())
                    `,
                    [accountNumber, customerId, branchId, accountType]
                );

                const [rows] = await dbPromise.query(
                    `
                        SELECT
                            a.account_id,
                            a.account_number,
                            a.account_type,
                            a.account_balance,
                            a.account_currency,
                            a.account_status,
                            a.opened_date,
                            a.closed_date,
                            a.annual_interest_rate,
                            b.branch_name,
                            b.branch_city,
                            b.branch_state,
                            b.ifsc_code
                        FROM Accounts a
                        JOIN Branches b ON b.branch_id = a.branch_id
                        WHERE a.account_id = ?
                        LIMIT 1
                    `,
                    [result.insertId]
                );

                created = true;

                return res.status(201).json({
                    message: 'New account created successfully with zero balance.',
                    account: rows[0],
                });
            } catch (error) {
                if (error?.code === 'ER_DUP_ENTRY') {
                    accountNumber = generateAccountNumber();
                    continue;
                }

                throw error;
            }
        }
    } catch (error) {
        return res.status(500).json({
            message: 'Failed to create a new account.',
        });
    }
};

exports.updateMyAccountStatus = async (req, res) => {
    const customerId = req.user.customer_id;
    const accountId = Number(req.params.accountId);
    const nextStatus = (req.body?.account_status || '').trim();

    if (!ACCOUNT_STATUSES.includes(nextStatus)) {
        return res.status(400).json({
            message: `account_status must be one of: ${ACCOUNT_STATUSES.join(', ')}`,
        });
    }

    try {
        const account = await getOwnedAccount(accountId, customerId);

        if (!account) {
            return res.status(404).json({
                message: 'Account not found for this customer.',
            });
        }

        if (account.account_status === 'Closed') {
            return res.status(400).json({
                message: 'Closed accounts cannot be updated.',
            });
        }

        if (nextStatus === 'Closed' && Number(account.account_balance || 0) > 0) {
            return res.status(400).json({
                message: 'Account balance must be zero before closing the account.',
            });
        }

        const closedDate = nextStatus === 'Closed' ? 'CURDATE()' : 'NULL';

        await dbPromise.query(
            `
                UPDATE Accounts
                SET
                    account_status = ?,
                    closed_date = ${closedDate}
                WHERE account_id = ?
                  AND customer_id = ?
            `,
            [nextStatus, accountId, customerId]
        );

        const [rows] = await dbPromise.query(
            `
                SELECT
                    a.account_id,
                    a.account_number,
                    a.account_type,
                    a.account_balance,
                    a.account_currency,
                    a.account_status,
                    a.opened_date,
                    a.closed_date,
                    a.annual_interest_rate,
                    b.branch_name,
                    b.branch_city,
                    b.branch_state,
                    b.ifsc_code
                FROM Accounts a
                JOIN Branches b ON b.branch_id = a.branch_id
                WHERE a.account_id = ?
                LIMIT 1
            `,
            [accountId]
        );

        return res.json({
            message: `Account status updated to ${nextStatus}.`,
            account: rows[0],
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Failed to update account status.',
        });
    }
};
