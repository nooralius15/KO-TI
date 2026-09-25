const request = require('supertest');
const app = require('../server');
const { db } = require('../db');

afterAll(async () => {
  await db.end();
});

describe('Basic Routes', () => {
  it('GET / - expect 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  it('GET /login - expect 200', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
  });

  it('GET /register - expect 200', async () => {
    const res = await request(app).get('/register');
    expect(res.status).toBe(200);
  });

  it('GET /admin.html - expect 404', async () => {
    const res = await request(app).get('/admin.html');
    expect(res.status).toBe(404);
  });

  it('GET /dashboard.html - expect 404', async () => {
    const res = await request(app).get('/dashboard.html');
    expect(res.status).toBe(404);
  });

  it('GET /admin - without auth expect 302', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(302);
  });

  it('GET /dashboard - without auth expect 302', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
  });

  it('GET /api/products - expect 200', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /nonexistent-page - expect 404', async () => {
    const res = await request(app).get('/nonexistent-page');
    expect(res.status).toBe(404);
  });
});
