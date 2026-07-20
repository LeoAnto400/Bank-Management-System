const db = require('../config/db');

const dbPromise = db.promise();

exports.getFrauds = async (req, res) => {
    try {
        const [results] = await dbPromise.query('SELECT * FROM Fraud_Logs ORDER BY risk_score DESC');
        return res.json(results);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to load fraud logs.' });
    }
};

exports.getHighRiskFrauds = async (req, res) => {
    try {
        const [results] = await dbPromise.query(
            'SELECT * FROM Fraud_Logs WHERE risk_score >= 70 ORDER BY risk_score DESC'
        );
        return res.json(results);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to load high-risk fraud logs.' });
    }
};
