const request = require('supertest');
const app = require('../server');
const { db } = require('../db');

afterAll(async () => {
  await db.end();
});

describe('Auth routes', () => {
  it('POST /register - success', async () => {
    const email = `newuser-${Date.now()}@test.com`;
    const res = await request(app)
      .post('/register')
      .send({ email, password: 'password123', name: 'Test User' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, redirect: '/dashboard' });
  });

  it('POST /register - duplicate email', async () => {
    const email = `newuser-${Date.now()}@test.com`;
    await request(app)
      .post('/register')
      .send({ email, password: 'password123', name: 'Test User' });
    
    const res = await request(app)
      .post('/register')
      .send({ email, password: 'password123', name: 'Test User 2' });
    
    expect(res.status).toBe(409);
  });

  it('POST /register - missing fields', async () => {
    const res = await request(app).post('/register').send({});
    expect(res.status).toBe(400);
  });

  it('POST /login - valid customer', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'user@test.com', password: 'testpass' });
    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe('/dashboard');
  });

  it('POST /login - valid admin', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'admin@test.com', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe('/admin');
  });

  it('POST /login - wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'user@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('POST /login - non-existent email', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'nobody@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('GET /dashboard - without session', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/unauthorized');
  });

  it('GET /admin - without session', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/unauthorized');
  });
});
