const request = require('supertest');
const app = require('../server');
const { db } = require('../db');

afterAll(async () => {
  await db.end();
});

describe('Admin routes', () => {
  let createdProductId;

  it('GET /admin/products - without auth', async () => {
    const res = await request(app).get('/admin/products');
    expect(res.status).toBe(403);
  });

  it('GET /admin/products - as customer', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'user@test.com', password: 'testpass' }).expect(200);
    const res = await agent.get('/admin/products');
    expect(res.status).toBe(403);
  });

  it('GET /admin/products - as admin', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'admin@test.com', password: '123456' }).expect(200);
    const res = await agent.get('/admin/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /admin/products - as admin creates product', async () => {
    const adminAgent = request.agent(app);
    await adminAgent.post('/login').send({ email: 'admin@test.com', password: '123456' }).expect(200);

    const res = await adminAgent
      .post('/admin/products')
      .field('title', 'Test Toy')
      .field('price', '9.99')
      .field('stock_quantity', '50')
      .attach('image', Buffer.from('fake-image'), { filename: 'test.jpg', contentType: 'image/jpeg' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product).toHaveProperty('id');
    expect(res.body.product.title).toBe('Test Toy');
    
    createdProductId = res.body.product.id;
  });

  it('PUT /admin/products/:id - update product', async () => {
    if (!createdProductId) return;

    const adminAgent = request.agent(app);
    await adminAgent.post('/login').send({ email: 'admin@test.com', password: '123456' }).expect(200);

    const res = await adminAgent
      .put(`/admin/products/${createdProductId}`)
      .send({ title: 'Updated Test Toy' });
      
    expect(res.status).toBe(200);
    
    // Verify
    const check = await db.query('SELECT title FROM products WHERE id = ?', [createdProductId]);
    expect(check[0][0].title).toBe('Updated Test Toy');
  });

  it('DELETE /admin/products/:id - deactivate product', async () => {
    if (!createdProductId) return;
    
    const adminAgent = request.agent(app);
    await adminAgent.post('/login').send({ email: 'admin@test.com', password: '123456' }).expect(200);

    const res = await adminAgent.delete(`/admin/products/${createdProductId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Product deactivated' });
    
    const productsRes = await request(app).get('/api/products');
    const found = productsRes.body.find(p => p.id === createdProductId);
    expect(found).toBeUndefined();
    
    // Cleanup DB
    await db.query('DELETE FROM products WHERE id = ?', [createdProductId]);
  });
});
