const db = require('../config/db');
const { generateReferenceNumber } = require('./loanUtils');

const dbPromise = db.promise();

// Some tables (e.g. Loan_Applications) were added after the original schema
// shipped, so callers that touch them tolerate a missing table instead of
// hard-failing on environments that haven't migrated yet.
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

const buildInClause = (values) => values.map(() => '?').join(', ');

module.exports = { optionalQuery, generateUniqueReference, buildInClause };
