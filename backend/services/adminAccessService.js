const db = require('../config/db');
const { verifyPassword } = require('../utils/password');

const dbPromise = db.promise();

const loadAdminContext = async (accountantId) => {
    const [[admin]] = await dbPromise.query(
        `
            SELECT
                a.accountant_id,
                a.branch_id,
                a.first_name,
                a.last_name,
                a.employee_code,
                a.employee_role,
                a.accountant_email,
                a.accountant_phone,
                a.joining_date,
                b.branch_name,
                b.branch_city,
                b.branch_state,
                b.branch_address,
                b.ifsc_code
            FROM Accountants a
            JOIN Branches b ON b.branch_id = a.branch_id
            WHERE a.accountant_id = ?
            LIMIT 1
        `,
        [accountantId]
    );

    return admin || null;
};

const verifyAdminPassword = async (accountantId, password) => {
    const secret = String(password || '').trim();

    if (!secret) {
        return false;
    }

    const [[login]] = await dbPromise.query(
        `
            SELECT admin_login_id, password_hash
            FROM Admin_Login
            WHERE accountant_id = ?
              AND is_active = 1
            LIMIT 1
        `,
        [accountantId]
    );

    if (!login) {
        return false;
    }

    const { matches, upgradedHash } = await verifyPassword(secret, login.password_hash);

    if (upgradedHash) {
        await dbPromise.query(
            'UPDATE Admin_Login SET password_hash = ? WHERE admin_login_id = ?',
            [upgradedHash, login.admin_login_id]
        );
    }

    return matches;
};

module.exports = { loadAdminContext, verifyAdminPassword };
