const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
    const query = `
        SELECT
            (SELECT COUNT(*) FROM Customers) AS total_customers,
            (SELECT COUNT(*) FROM Accounts) AS total_accounts,
            (SELECT COUNT(*) FROM Transactions) AS total_transactions,
            (SELECT SUM(transaction_amount) FROM Transactions) AS total_money_flow,
            (SELECT COUNT(*) FROM fraud_logs WHERE risk_score >= 70) AS high_risk_frauds
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
};