const db = require('../config/db');
const { signJwt } = require('../utils/jwt');
const dbPromise = db.promise();

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const JWT_EXPIRES_IN_SECONDS = 60 * 60;

const customerSignupFields = [
    'password',
    'first_name',
    'last_name',
    'date_of_birth',
    'gender',
    'pan_number',
    'aadhaar_number',
    'customer_phone',
    'customer_email',
    'customer_address',
    'customer_city',
    'customer_state',
    'pincode',
];

const adminSignupFields = [
    'password',
    'branch_id',
    'first_name',
    'last_name',
    'employee_code',
    'employee_role',
    'accountant_phone',
    'accountant_email',
    'joining_date',
];

const isDuplicateEntryError = (error) =>
    error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062);

const getMissingFields = (payload, fields) =>
    fields.filter((field) => !payload[field]);

const getRequestIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return (
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        null
    );
};

const recordLoginAttempt = async ({
    customerId = null,
    accountantId = null,
    loginRole,
    loginIdentifier,
    ipAddress = null,
    attemptStatus,
    failureReason = null,
}) => {
    try {
        await dbPromise.query(
            `
                INSERT INTO Login_Attempts (
                    customer_id,
                    accountant_id,
                    login_role,
                    login_identifier,
                    ip_address,
                    attempt_status,
                    failure_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                customerId,
                accountantId,
                loginRole,
                loginIdentifier,
                ipAddress,
                attemptStatus,
                failureReason,
            ]
        );
    } catch (error) {
        if (error?.code !== 'ER_NO_SUCH_TABLE') {
            throw error;
        }
    }
};

exports.signup = (req, res) => {
    const payload = req.body || {};
    const role = payload.role;

    if (!role || !['customer', 'admin'].includes(role)) {
        return res.status(400).json({
            message: 'A valid signup role is required.',
        });
    }

    const requiredFields =
        role === 'customer' ? customerSignupFields : adminSignupFields;
    const missingFields = getMissingFields(payload, requiredFields);

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(', ')}`,
        });
    }

    db.beginTransaction((transactionError) => {
        if (transactionError) {
            return res.status(500).json({ message: 'Failed to start signup transaction.' });
        }

        if (role === 'customer') {
            const customerValues = [
                payload.first_name,
                payload.last_name,
                payload.date_of_birth,
                payload.gender,
                payload.pan_number,
                payload.aadhaar_number,
                payload.customer_phone,
                payload.customer_email,
                payload.customer_address,
                payload.customer_city,
                payload.customer_state,
                payload.pincode,
            ];

            const insertCustomerQuery = `
                INSERT INTO Customers (
                    first_name,
                    last_name,
                    date_of_birth,
                    gender,
                    pan_number,
                    aadhaar_number,
                    customer_phone,
                    customer_email,
                    customer_address,
                    customer_city,
                    customer_state,
                    pincode
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(insertCustomerQuery, customerValues, (customerError, customerResult) => {
                if (customerError) {
                    return db.rollback(() => {
                        const message = isDuplicateEntryError(customerError)
                            ? 'A customer with that PAN, Aadhaar, or email already exists.'
                            : 'Failed to create customer account.';

                        return res.status(isDuplicateEntryError(customerError) ? 409 : 500).json({
                            message,
                        });
                    });
                }

                const customerId = customerResult.insertId;

                db.query(
                    `
                        INSERT INTO Customer_Login (
                            customer_id,
                            password_hash
                        )
                        VALUES (?, SHA2(?, 256))
                    `,
                    [customerId, payload.password],
                    (loginError) => {
                        if (loginError) {
                            return db.rollback(() => {
                                const message = isDuplicateEntryError(loginError)
                                    ? 'Login credentials already exist for this customer.'
                                    : 'Failed to create customer login credentials.';

                                return res
                                    .status(isDuplicateEntryError(loginError) ? 409 : 500)
                                    .json({ message });
                            });
                        }

                        db.commit((commitError) => {
                            if (commitError) {
                                return db.rollback(() =>
                                    res.status(500).json({
                                        message: 'Failed to complete signup.',
                                    })
                                );
                            }

                            return res.status(201).json({
                                message: 'Customer signup successful.',
                                user: {
                                    customer_id: customerId,
                                    customer_email: payload.customer_email,
                                    user_role: 'customer',
                                },
                            });
                        });
                    }
                );
            });

            return;
        }

        const adminValues = [
            payload.branch_id,
            payload.first_name,
            payload.last_name,
            payload.employee_code,
            payload.employee_role,
            payload.accountant_phone,
            payload.accountant_email,
            payload.joining_date,
        ];

        const insertAdminQuery = `
            INSERT INTO Accountants (
                branch_id,
                first_name,
                last_name,
                employee_code,
                employee_role,
                accountant_phone,
                accountant_email,
                joining_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(insertAdminQuery, adminValues, (adminError, adminResult) => {
            if (adminError) {
                return db.rollback(() => {
                    const message = isDuplicateEntryError(adminError)
                        ? 'An accountant with that employee code or email already exists.'
                        : 'Failed to create accountant account.';

                    return res.status(isDuplicateEntryError(adminError) ? 409 : 500).json({
                        message,
                    });
                });
            }

            const accountantId = adminResult.insertId;

            db.query(
                `
                    INSERT INTO Admin_Login (
                        accountant_id,
                        password_hash
                    )
                    VALUES (?, SHA2(?, 256))
                `,
                [accountantId, payload.password],
                (loginError) => {
                    if (loginError) {
                        return db.rollback(() => {
                            const message = isDuplicateEntryError(loginError)
                                ? 'Login credentials already exist for this admin.'
                                : 'Failed to create admin login credentials.';

                            return res
                                .status(isDuplicateEntryError(loginError) ? 409 : 500)
                                .json({ message });
                        });
                    }

                    db.commit((commitError) => {
                        if (commitError) {
                            return db.rollback(() =>
                                res.status(500).json({
                                    message: 'Failed to complete signup.',
                                })
                            );
                        }

                        return res.status(201).json({
                            message: 'Admin signup successful.',
                            user: {
                                accountant_id: accountantId,
                                accountant_email: payload.accountant_email,
                                user_role: 'admin',
                            },
                        });
                    });
                }
            );
        });
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body || {};
    const identifier = (email || '').trim();
    const ipAddress = getRequestIp(req);

    if (!identifier || !password) {
        return res.status(400).json({
            message: 'Email and password are required.',
        });
    }

    try {
        const [[customerRecord]] = await dbPromise.query(
            `
                SELECT
                    cl.customer_login_id,
                    cl.customer_id,
                    c.customer_email,
                    c.first_name,
                    c.last_name,
                    cl.is_active
                FROM customer_Login cl
                JOIN customers c ON cl.customer_id = c.customer_id
                WHERE c.customer_email = ?
                LIMIT 1
            `,
            [identifier]
        );

        const [[user]] = await dbPromise.query(
            `
                SELECT
                    cl.customer_login_id,
                    cl.customer_id,
                    c.customer_email,
                    c.first_name,
                    c.last_name,
                    cl.is_active
                FROM customer_Login cl
                JOIN customers c ON cl.customer_id = c.customer_id
                WHERE c.customer_email = ?
                  AND cl.password_hash = SHA2(?, 256)
                LIMIT 1
            `,
            [identifier, password]
        );

        if (!user) {
            await recordLoginAttempt({
                customerId: customerRecord?.customer_id || null,
                loginRole: 'customer',
                loginIdentifier: identifier,
                ipAddress,
                attemptStatus: 'Failed',
                failureReason: customerRecord ? 'Invalid password.' : 'Unknown customer email.',
            });

            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (Number(user.is_active) !== 1) {
            return res.status(403).json({
                message: 'Login disabled for this customer account.',
            });
        }

        await recordLoginAttempt({
            customerId: user.customer_id,
            loginRole: 'customer',
            loginIdentifier: identifier,
            ipAddress,
            attemptStatus: 'Success',
        });

        await dbPromise.query(
            'UPDATE customer_Login SET last_login = NOW() WHERE customer_login_id = ?',
            [user.customer_login_id]
        );

        const token = signJwt(
            {
                sub: user.customer_login_id,
                role: 'customer',
                customer_id: user.customer_id,
            },
            JWT_SECRET,
            JWT_EXPIRES_IN_SECONDS
        );

        return res.json({
            message: 'Login successful.',
            token,
            user: {
                user_id: user.customer_login_id,
                user_role: 'customer',
                customer_id: user.customer_id,
                customer_email: user.customer_email,
                full_name:
                    user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : null,
            },
        });
    } catch (error) {
        console.error('LOGIN ERROR:', error);
        return res.status(500).json({ message: 'Failed to process login.' });
    }
};

exports.adminLogin = async (req, res) => {
    const { email, password } = req.body || {};
    const identifier = (email || '').trim();
    const ipAddress = getRequestIp(req);

    if (!identifier || !password) {
        return res.status(400).json({
            message: 'Email and password are required.',
        });
    }

    try {
        const [[adminRecord]] = await dbPromise.query(
            `
                SELECT
                    al.admin_login_id,
                    al.accountant_id
                FROM admin_Login al
                JOIN accountants a ON al.accountant_id = a.accountant_id
                WHERE a.accountant_email = ?
                LIMIT 1
            `,
            [identifier]
        );

        const [[admin]] = await dbPromise.query(
            `
                SELECT
                    al.admin_login_id,
                    al.accountant_id,
                    a.accountant_email,
                    a.first_name,
                    a.last_name,
                    a.branch_id,
                    a.employee_role,
                    al.is_active
                FROM admin_Login al
                JOIN accountants a ON al.accountant_id = a.accountant_id
                WHERE a.accountant_email = ?
                  AND al.password_hash = SHA2(?, 256)
                LIMIT 1
            `,
            [identifier, password]
        );

        if (!admin) {
            await recordLoginAttempt({
                accountantId: adminRecord?.accountant_id || null,
                loginRole: 'admin',
                loginIdentifier: identifier,
                ipAddress,
                attemptStatus: 'Failed',
                failureReason: adminRecord ? 'Invalid password.' : 'Unknown admin email.',
            });

            return res.status(401).json({ message: 'Invalid admin credentials.' });
        }

        if (Number(admin.is_active) !== 1) {
            return res.status(403).json({
                message: 'Admin login is disabled for this account.',
            });
        }

        await recordLoginAttempt({
            accountantId: admin.accountant_id,
            loginRole: 'admin',
            loginIdentifier: identifier,
            ipAddress,
            attemptStatus: 'Success',
        });

        await dbPromise.query(
            'UPDATE admin_Login SET last_login = NOW() WHERE admin_login_id = ?',
            [admin.admin_login_id]
        );

        const token = signJwt(
            {
                sub: admin.admin_login_id,
                role: 'admin',
                accountant_id: admin.accountant_id,
                branch_id: admin.branch_id,
            },
            JWT_SECRET,
            JWT_EXPIRES_IN_SECONDS
        );

        return res.json({
            message: 'Admin login successful.',
            token,
            user: {
                user_id: admin.admin_login_id,
                user_role: 'admin',
                accountant_id: admin.accountant_id,
                branch_id: admin.branch_id,
                accountant_email: admin.accountant_email,
                full_name: `${admin.first_name} ${admin.last_name}`,
                employee_role: admin.employee_role,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to process admin login.' });
    }
};
