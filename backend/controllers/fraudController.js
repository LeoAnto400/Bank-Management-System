const db = require('../config/db');

// ALL FRAUD LOGS
exports.getFrauds = (req, res) => {
    db.query(
        'SELECT * FROM fraud_logs ORDER BY risk_score DESC',
        (err, results) => {
            if (err) return res.status(500).send(err);
            res.json(results);
        }
    );
};

// HIGH RISK ONLY
exports.getHighRiskFrauds = (req, res) => {
    db.query(
        'SELECT * FROM fraud_logs WHERE risk_score >= 70 ORDER BY risk_score DESC',
        (err, results) => {
            if (err) return res.status(500).send(err);
            res.json(results);
        }
    );
};