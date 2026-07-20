const request = require('supertest');

let counter = 0;

// Produces a fixed-length numeric suffix that's unique within a test run,
// since the schema only enforces CHAR lengths + uniqueness, not real PAN/Aadhaar formats.
const nextSuffix = (length) => {
    counter += 1;
    return `${process.pid}${Date.now()}${counter}`.slice(-length).padStart(length, '0');
};

const buildCustomerPayload = (overrides = {}) => {
    const suffix = nextSuffix(8);

    return {
        role: 'customer',
        password: 'TestPass123!',
        first_name: 'Test',
        last_name: `User${suffix}`,
        date_of_birth: '1995-05-15',
        gender: 'Other',
        pan_number: `T${suffix}X`.slice(0, 10).padEnd(10, 'X'),
        aadhaar_number: `9${suffix}`.padStart(12, '9'),
        customer_phone: `9${suffix}`.padStart(10, '0'),
        customer_email: `test.user.${suffix}@example.com`,
        customer_address: '123 Test Street',
        customer_city: 'Testville',
        customer_state: 'TS',
        pincode: '560001',
        ...overrides,
    };
};

// Signs up a fresh customer and logs in, returning enough context for
// account/transaction/transfer tests to act on their behalf.
const createTestCustomer = async (app, overrides = {}) => {
    const payload = buildCustomerPayload(overrides);

    const signupResponse = await request(app).post('/api/signup').send(payload);

    if (signupResponse.status !== 201) {
        throw new Error(
            `Failed to create test customer: ${signupResponse.status} ${JSON.stringify(signupResponse.body)}`
        );
    }

    const loginResponse = await request(app)
        .post('/api/login')
        .send({ email: payload.customer_email, password: payload.password });

    if (loginResponse.status !== 200) {
        throw new Error(
            `Failed to log in test customer: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`
        );
    }

    return {
        customerId: signupResponse.body.user.customer_id,
        email: payload.customer_email,
        password: payload.password,
        token: loginResponse.body.token,
    };
};

module.exports = { buildCustomerPayload, createTestCustomer, nextSuffix };
