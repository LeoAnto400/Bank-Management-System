const DEFAULT_LOAN_RATES = Object.freeze({
    Home: 8.5,
    Personal: 12,
    Auto: 9.25,
    Education: 10.5,
    Gold: 8,
    Business: 11,
});

const parseEnumValues = (columnType = '') =>
    columnType
        .replace(/^enum\(/i, '')
        .replace(/\)$/i, '')
        .split(',')
        .map((value) => value.trim().replace(/^'(.*)'$/, '$1'))
        .filter(Boolean);

const getLoanTypeOptions = async (dbPromise) => {
    const [[column]] = await dbPromise.query(
        `
            SELECT COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Loans'
              AND COLUMN_NAME = 'loan_type'
            LIMIT 1
        `
    );

    const values = parseEnumValues(column?.COLUMN_TYPE || '');

    return values.length ? values : Object.keys(DEFAULT_LOAN_RATES);
};

const calculateEmi = (principalAmount, annualInterestRate, tenureMonths) => {
    const principal = Number(principalAmount || 0);
    const annualRate = Number(annualInterestRate || 0);
    const tenure = Number(tenureMonths || 0);

    if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(tenure) || tenure <= 0) {
        return 0;
    }

    const monthlyRate = annualRate / 1200;

    if (monthlyRate === 0) {
        return Number((principal / tenure).toFixed(2));
    }

    const factor = Math.pow(1 + monthlyRate, tenure);
    const emi = (principal * monthlyRate * factor) / (factor - 1);

    return Number(emi.toFixed(2));
};

const addMonthsToDate = (dateValue, monthsToAdd) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const months = Number(monthsToAdd || 0);
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);

    return nextDate.toISOString().slice(0, 10);
};

const generateReferenceNumber = (prefix) =>
    `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`.slice(0, 30);

module.exports = {
    DEFAULT_LOAN_RATES,
    getLoanTypeOptions,
    calculateEmi,
    addMonthsToDate,
    generateReferenceNumber,
};
