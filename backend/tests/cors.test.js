const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

afterAll((done) => {
    db.end(done);
});

// Regression test: CORS used to be wide open (app.use(cors()) with no
// origin restriction), meaning any website could make authenticated
// requests to this API from a browser. It's now restricted to CORS_ORIGIN.
describe('CORS configuration', () => {
    test('reflects the allowed origin in Access-Control-Allow-Origin', async () => {
        const res = await request(app).get('/').set('Origin', 'http://localhost:5173');

        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('does not allow an arbitrary, unconfigured origin', async () => {
        const res = await request(app).get('/').set('Origin', 'http://evil.example.com');

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});
