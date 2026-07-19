const db = require('../config/db');

const dbPromise = db.promise();

const TRANSFER_MODE = 'Internal';
const TRANSACTION_CHANNEL = 'Online Banking';
const MAX_SELF_SERVICE_TRANSFER_AMOUNT = 50000;

const generateReference = (prefix) =>
    `${prefix}${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

exports.createMyTransfer = async (req, res) => {
    const customerId = req.user.customer_id;
    const senderAccountId = Number(req.body?.sender_account_id);
    const destinationAccountNumber = (req.body?.destination_account_number || '').trim();
    const transferRemarks = (req.body?.transfer_remarks || '').trim();
    const password = req.body?.password || '';
    const transferAmount = Number(req.body?.transfer_amount || 0);

    if (!Number.isInteger(senderAccountId)) {
        return res.status(400).json({ message: 'A valid sender_account_id is required.' });
    }

    if (!destinationAccountNumber) {
        return res.status(400).json({ message: 'destination_account_number is required.' });
    }

    if (!transferRemarks) {
        return res.status(400).json({ message: 'transfer_remarks is required.' });
    }

    if (!password) {
        return res.status(400).json({ message: 'Password confirmation is required.' });
    }

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({
            message: 'transfer_amount must be a valid number greater than zero.',
        });
    }

    if (transferAmount > MAX_SELF_SERVICE_TRANSFER_AMOUNT) {
        return res.status(403).json({
            message: `Transfers above INR ${MAX_SELF_SERVICE_TRANSFER_AMOUNT.toLocaleString('en-IN')} are blocked in one go. Please contact your branch.`,
        });
    }

    try {
        await dbPromise.beginTransaction();

        const [loginRows] = await dbPromise.query(
            `
                SELECT customer_login_id
                FROM Customer_Login
                WHERE customer_id = ?
                  AND password_hash = SHA2(?, 256)
                  AND is_active = 1
                LIMIT 1
            `,
            [customerId, password]
        );

        if (!loginRows[0]) {
            await dbPromise.rollback();
            return res.status(401).json({
                message: 'Password verification failed.',
            });
        }

        const [senderRows] = await dbPromise.query(
            `
                SELECT
                    account_id,
                    account_number,
                    account_balance,
                    account_currency,
                    account_status
                FROM Accounts
                WHERE account_id = ?
                  AND customer_id = ?
                FOR UPDATE
            `,
            [senderAccountId, customerId]
        );

        const senderAccount = senderRows[0];

        if (!senderAccount) {
            await dbPromise.rollback();
            return res.status(404).json({
                message: 'Sender account was not found for this customer.',
            });
        }

        const [receiverRows] = await dbPromise.query(
            `
                SELECT
                    account_id,
                    account_number,
                    account_balance,
                    account_currency,
                    account_status
                FROM Accounts
                WHERE account_number = ?
                FOR UPDATE
            `,
            [destinationAccountNumber]
        );

        const receiverAccount = receiverRows[0];

        if (!receiverAccount) {
            await dbPromise.rollback();
            return res.status(404).json({
                message: 'Destination account number was not found.',
            });
        }

        if (senderAccount.account_id === receiverAccount.account_id) {
            await dbPromise.rollback();
            return res.status(400).json({
                message: 'You cannot transfer money to the same account.',
            });
        }

        if (senderAccount.account_status !== 'Active') {
            await dbPromise.rollback();
            return res.status(403).json({
                message: `Transfers are not allowed while the sender account is ${senderAccount.account_status}.`,
            });
        }

        if (receiverAccount.account_status !== 'Active') {
            await dbPromise.rollback();
            return res.status(403).json({
                message: `Transfers are not allowed to an account that is ${receiverAccount.account_status}.`,
            });
        }

        const senderBalance = Number(senderAccount.account_balance || 0);
        const receiverBalance = Number(receiverAccount.account_balance || 0);

        if (senderBalance < transferAmount) {
            await dbPromise.rollback();
            return res.status(400).json({
                message: 'Insufficient balance for this transfer.',
            });
        }

        const senderNextBalance = senderBalance - transferAmount;
        const receiverNextBalance = receiverBalance + transferAmount;

        let transferReference = generateReference('TRF');
        let transferId = null;
        let transferCreated = false;

        while (!transferCreated) {
            try {
                const [transferResult] = await dbPromise.query(
                    `
                        INSERT INTO Transfers (
                            sender_account_id,
                            receiver_account_id,
                            transfer_amount,
                            transfer_mode,
                            reference_number,
                            transfer_remarks,
                            transfer_status,
                            completed_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, 'Success', NOW())
                    `,
                    [
                        senderAccount.account_id,
                        receiverAccount.account_id,
                        transferAmount,
                        TRANSFER_MODE,
                        transferReference,
                        transferRemarks,
                    ]
                );

                transferId = transferResult.insertId;
                transferCreated = true;
            } catch (error) {
                if (error?.code === 'ER_DUP_ENTRY') {
                    transferReference = generateReference('TRF');
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
            [senderNextBalance, senderAccount.account_id]
        );

        await dbPromise.query(
            `
                UPDATE Accounts
                SET account_balance = ?
                WHERE account_id = ?
            `,
            [receiverNextBalance, receiverAccount.account_id]
        );

        const transactionRows = [
            {
                accountId: senderAccount.account_id,
                type: 'Debit',
                amount: transferAmount,
                balanceAfter: senderNextBalance,
                desc: `Transfer to ${receiverAccount.account_number}: ${transferRemarks}`,
            },
            {
                accountId: receiverAccount.account_id,
                type: 'Credit',
                amount: transferAmount,
                balanceAfter: receiverNextBalance,
                desc: `Transfer from ${senderAccount.account_number}: ${transferRemarks}`,
            },
        ];

        for (const transaction of transactionRows) {
            let transactionReference = generateReference('TXN');
            let saved = false;

            while (!saved) {
                try {
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
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'Success')
                        `,
                        [
                            transaction.accountId,
                            transaction.type,
                            transaction.amount,
                            transaction.balanceAfter,
                            transaction.desc,
                            TRANSACTION_CHANNEL,
                            transactionReference,
                        ]
                    );

                    saved = true;
                } catch (error) {
                    if (error?.code === 'ER_DUP_ENTRY') {
                        transactionReference = generateReference('TXN');
                        continue;
                    }

                    throw error;
                }
            }
        }

        await dbPromise.commit();

        return res.status(201).json({
            message: 'Transfer successful.',
            transfer: {
                transfer_id: transferId,
                reference_number: transferReference,
                sender_account_number: senderAccount.account_number,
                receiver_account_number: receiverAccount.account_number,
                transfer_amount: transferAmount,
            },
        });
    } catch (error) {
        try {
            await dbPromise.rollback();
        } catch {
            // Ignore rollback failures and return the original request error response.
        }

        return res.status(500).json({
            message: 'Failed to complete transfer.',
        });
    }
};
