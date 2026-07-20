const db = require('../config/db');

const dbPromise = db.promise();

exports.getDashboardStats = async (req, res) => {
    try {
        const [results] = await dbPromise.query(
            `
                SELECT
                    (SELECT COUNT(*) FROM Customers) AS total_customers,
                    (SELECT COUNT(*) FROM Accounts) AS total_accounts,
                    (SELECT COUNT(*) FROM Transactions) AS total_transactions,
                    (SELECT SUM(transaction_amount) FROM Transactions) AS total_money_flow,
                    (SELECT COUNT(*) FROM Fraud_Logs WHERE risk_score >= 70) AS high_risk_frauds
            `
        );

        return res.json(results[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to load dashboard statistics.' });
    }
};
