const db = require('../config/db');

const dbPromise = db.promise();

const TRANSACTION_TYPES = ['Credit', 'Debit'];
const TRANSACTION_CHANNELS = [
    'ATM',
    'Online Banking',
    'Branch Counter',
    'POS Terminal',
    'UPI',
    'NEFT',
    'RTGS',
    'IMPS',
];
const MAX_SELF_SERVICE_TRANSACTION_AMOUNT = 50000;

const generateReferenceNumber = () =>
    `TXN${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

const getOwnedAccountForTransaction = async (accountId, customerId) => {
    const [[account]] = await dbPromise.query(
        `
            SELECT
                account_id,
                account_number,
                account_type,
                account_balance,
                account_currency,
                account_status
            FROM Accounts
            WHERE account_id = ?
              AND customer_id = ?
            LIMIT 1
        `,
        [accountId, customerId]
    );

    return account || null;
};

// GET transactions by account
exports.getTransactionsByAccount = (req, res) => {
    const { accountId } = req.params;

    db.query(
        'SELECT * FROM Transactions WHERE account_id = ?',
        [accountId],
        (err, results) => {
            if (err) return res.status(500).send(err);
            res.json(results);
        }
    );
};

// GET detailed transaction view (JOIN)
exports.getTransactionDetails = (req, res) => {
    const { accountId } = req.params;

    const query = `
        SELECT
            c.customer_id,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            a.account_id,
            a.account_type,
            a.account_balance,
            a.account_status,
            t.transaction_id,
            t.transaction_type,
            t.transaction_amount,
            t.balance_after_txn,
            t.transaction_channel,
            t.reference_number,
            t.transaction_status,
            t.transaction_date
        FROM Customers c
        JOIN Accounts a ON c.customer_id = a.customer_id
        JOIN Transactions t ON a.account_id = t.account_id
        WHERE a.account_id = ?
    `;

    db.query(query, [accountId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

exports.createMyTransaction = async (req, res) => {
    const customerId = req.user.customer_id;
    const accountId = Number(req.body?.account_id);
    const transactionType = (req.body?.transaction_type || '').trim();
    const transactionChannel = (req.body?.transaction_channel || '').trim();
    const transactionDesc = (req.body?.transaction_desc || '').trim();
    const amount = Number(req.body?.transaction_amount || 0);

    if (!Number.isInteger(accountId)) {
        return res.status(400).json({ message: 'A valid account_id is required.' });
    }

    if (!TRANSACTION_TYPES.includes(transactionType)) {
        return res.status(400).json({
            message: `transaction_type must be one of: ${TRANSACTION_TYPES.join(', ')}`,
        });
    }

    if (!TRANSACTION_CHANNELS.includes(transactionChannel)) {
        return res.status(400).json({
            message: `transaction_channel must be one of: ${TRANSACTION_CHANNELS.join(', ')}`,
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

    if (amount > MAX_SELF_SERVICE_TRANSACTION_AMOUNT) {
        return res.status(403).json({
            message: `Transactions above INR ${MAX_SELF_SERVICE_TRANSACTION_AMOUNT.toLocaleString('en-IN')} are blocked in one go. Please use a branch-assisted process.`,
        });
    }

    try {
        await dbPromise.beginTransaction();

        const [accounts] = await dbPromise.query(
            `
                SELECT
                    account_id,
                    account_number,
                    account_type,
                    account_balance,
                    account_currency,
                    account_status
                FROM Accounts
                WHERE account_id = ?
                  AND customer_id = ?
                FOR UPDATE
            `,
            [accountId, customerId]
        );

        const account = accounts[0];

        if (!account) {
            await dbPromise.rollback();
            return res.status(404).json({
                message: 'Account not found for this customer.',
            });
        }

        if (account.account_status === 'Frozen') {
            await dbPromise.rollback();
            return res.status(403).json({
                message: 'Transactions are blocked for frozen accounts.',
            });
        }

        if (account.account_status !== 'Active') {
            await dbPromise.rollback();
            return res.status(403).json({
                message: `Transactions are not allowed while the account is ${account.account_status}.`,
            });
        }

        const currentBalance = Number(account.account_balance || 0);
        const nextBalance =
            transactionType === 'Credit' ? currentBalance + amount : currentBalance - amount;

        if (nextBalance < 0) {
            await dbPromise.rollback();
            return res.status(400).json({
                message: 'Insufficient balance for this debit transaction.',
            });
        }

        let referenceNumber = generateReferenceNumber();
        let insertId = null;
        let inserted = false;

        while (!inserted) {
            try {
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
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'Success')
                    `,
                    [
                        accountId,
                        transactionType,
                        amount,
                        nextBalance,
                        transactionDesc,
                        transactionChannel,
                        referenceNumber,
                    ]
                );

                insertId = insertResult.insertId;
                inserted = true;
            } catch (error) {
                if (error?.code === 'ER_DUP_ENTRY') {
                    referenceNumber = generateReferenceNumber();
                    continue;
                }

                throw error;
            }
        }

        await dbPromise.query(
            `
                UPDATE Accounts
                SET account_balance = ?
                WHERE account_id = ?
            `,
            [nextBalance, accountId]
        );

        await dbPromise.commit();

        const updatedAccount = await getOwnedAccountForTransaction(accountId, customerId);
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
            [insertId]
        );

        return res.status(201).json({
            message: `${transactionType} transaction recorded successfully.`,
            transaction,
            account: updatedAccount,
        });
    } catch (error) {
        try {
            await dbPromise.rollback();
        } catch {
            // Ignore rollback failures and return the original request error response.
        }
        return res.status(500).json({
            message: 'Failed to record transaction.',
        });
    }
};
