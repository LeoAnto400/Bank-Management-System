const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

afterAll((done) => {
    db.end(done);
});

describe('centralized error handling', () => {
    test('returns a clean JSON 404 for an unmatched route instead of the default HTML page', async () => {
        const res = await request(app).get('/api/this-route-does-not-exist');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.text).not.toMatch(/<html/i);
    });

    // Regression test: malformed JSON used to bubble up as an unhandled
    // body-parser SyntaxError, returning an HTML page with the full server
    // file path and stack trace to any unauthenticated caller.
    test('returns a clean JSON 400 for a malformed request body, without leaking a stack trace', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('Content-Type', 'application/json')
            .send('{not valid json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
        expect(res.text).not.toMatch(/node_modules/i);
        expect(res.text).not.toMatch(/<html/i);
    });
});
