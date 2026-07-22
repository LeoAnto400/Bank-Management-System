const crypto = require('crypto');
const db = require('../config/db');
const { addMonthsToDate } = require('../utils/loanUtils');

const dbPromise = db.promise();

const CARD_TYPES = ['Debit', 'Credit'];
const CARD_NETWORKS = ['Visa', 'MasterCard', 'RuPay', 'Amex'];
const CARD_VALIDITY_MONTHS = 48;
const UPDATABLE_CARD_STATUSES = ['Active', 'Blocked'];

const generateCardNumber = () =>
    Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');

const generateCvv = () => String(Math.floor(100 + Math.random() * 900));

const hashCvv = (cvv) => crypto.createHash('sha256').update(cvv).digest('hex');

exports.issueMyCard = async (req, res) => {
    const customerId = req.user.customer_id;
    const accountId = Number(req.body?.account_id);
    const cardType = String(req.body?.card_type || '').trim();
    const cardNetwork = String(req.body?.card_network || 'RuPay').trim();
    const creditLimit =
        req.body?.credit_limit === '' || req.body?.credit_limit === undefined
            ? null
            : Number(req.body?.credit_limit);

    if (!Number.isInteger(accountId)) {
        return res.status(400).json({ message: 'A valid account_id is required.' });
    }

    if (!CARD_TYPES.includes(cardType)) {
        return res.status(400).json({ message: `card_type must be one of: ${CARD_TYPES.join(', ')}` });
    }

    if (!CARD_NETWORKS.includes(cardNetwork)) {
        return res.status(400).json({ message: `card_network must be one of: ${CARD_NETWORKS.join(', ')}` });
    }

    if (cardType === 'Credit' && (!Number.isFinite(creditLimit) || creditLimit <= 0)) {
        return res.status(400).json({ message: 'credit_limit must be greater than zero for Credit cards.' });
    }

    try {
        const [[account]] = await dbPromise.query(
            `
                SELECT
                    a.account_id,
                    a.account_number,
                    a.account_status,
                    c.first_name,
                    c.last_name
                FROM Accounts a
                JOIN Customers c ON c.customer_id = a.customer_id
                WHERE a.account_id = ?
                  AND a.customer_id = ?
                LIMIT 1
            `,
            [accountId, customerId]
        );

        if (!account) {
            return res.status(404).json({ message: 'Account not found for this customer.' });
        }

        if (account.account_status !== 'Active') {
            return res.status(403).json({
                message: `A card can only be issued against an active account. This account is ${account.account_status}.`,
            });
        }

        const cardHolderName = `${account.first_name} ${account.last_name}`.toUpperCase();
        const issueDate = new Date().toISOString().slice(0, 10);
        const expiryDate = addMonthsToDate(issueDate, CARD_VALIDITY_MONTHS);
        const cvv = generateCvv();
        const cvvHash = hashCvv(cvv);
        const sanctionedLimit = cardType === 'Credit' ? creditLimit : null;

        let cardNumber = generateCardNumber();
        let cardId = null;
        let inserted = false;

        while (!inserted) {
            try {
                const [result] = await dbPromise.query(
                    `
                        INSERT INTO Cards (
                            account_id,
                            card_number,
                            card_type,
                            card_network,
                            card_holder_name,
                            issue_date,
                            expiry_date,
                            cvv_hash,
                            credit_limit,
                            outstanding_amount,
                            card_status
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'Active')
                    `,
                    [
                        accountId,
                        cardNumber,
                        cardType,
                        cardNetwork,
                        cardHolderName,
                        issueDate,
                        expiryDate,
                        cvvHash,
                        sanctionedLimit,
                    ]
                );

                cardId = result.insertId;
                inserted = true;
            } catch (error) {
                if (error?.code === 'ER_DUP_ENTRY') {
                    cardNumber = generateCardNumber();
                    continue;
                }

                throw error;
            }
        }

        const [[card]] = await dbPromise.query(
            `
                SELECT
                    cd.card_id,
                    cd.account_id,
                    a.account_number,
                    cd.card_number,
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
                WHERE cd.card_id = ?
                LIMIT 1
            `,
            [cardId]
        );

        return res.status(201).json({
            message: 'Card issued successfully.',
            // The CVV is only ever available in this one response, mirroring
            // how a real issuer shows it once at issuance — it is not
            // recoverable afterward, only the hash is stored.
            card: { ...card, cvv },
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to issue card.' });
    }
};

exports.updateMyCardStatus = async (req, res) => {
    const customerId = req.user.customer_id;
    const cardId = Number(req.params.cardId);
    const nextStatus = String(req.body?.card_status || '').trim();

    if (!Number.isInteger(cardId)) {
        return res.status(400).json({ message: 'A valid card id is required.' });
    }

    if (!UPDATABLE_CARD_STATUSES.includes(nextStatus)) {
        return res.status(400).json({
            message: `card_status must be one of: ${UPDATABLE_CARD_STATUSES.join(', ')}`,
        });
    }

    try {
        const [[card]] = await dbPromise.query(
            `
                SELECT cd.card_id, cd.card_status
                FROM Cards cd
                JOIN Accounts a ON a.account_id = cd.account_id
                WHERE cd.card_id = ?
                  AND a.customer_id = ?
                LIMIT 1
            `,
            [cardId, customerId]
        );

        if (!card) {
            return res.status(404).json({ message: 'Card not found for this customer.' });
        }

        if (!UPDATABLE_CARD_STATUSES.includes(card.card_status)) {
            return res.status(400).json({
                message: `This card is ${card.card_status} and its status can no longer be changed.`,
            });
        }

        await dbPromise.query('UPDATE Cards SET card_status = ? WHERE card_id = ?', [nextStatus, cardId]);

        return res.json({
            message: nextStatus === 'Blocked' ? 'Card blocked successfully.' : 'Card unblocked successfully.',
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update card status.' });
    }
};
