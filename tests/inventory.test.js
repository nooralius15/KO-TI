const request = require('supertest');
const app = require('../server');
const { db } = require('../db');

afterAll(async () => {
  await db.end();
});

describe('Inventory tests', () => {
  it('GET /api/products returns array with stock_quantity', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('stock_quantity');
    }
  });

  it('POST /create-checkout-session without auth returns 403', async () => {
    const res = await request(app).post('/create-checkout-session').send({ items: [] });
    expect(res.status).toBe(403);
  });

  it('Inventory check flow', async () => {
    // Login as customer
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'user@test.com', password: 'testpass' }).expect(200);

    // Get products to find a valid product ID
    const productsRes = await request(app).get('/api/products');
    const products = productsRes.body;
    
    if (products.length > 0) {
      const productId = products[0].id;
      
      // Set stock to 1
      await db.query('UPDATE products SET stock_quantity = 1 WHERE id = ?', [productId]);
      
      // Try to checkout with quantity 5
      const checkoutRes = await agent.post('/create-checkout-session').send({
        items: [{ id: productId, quantity: 5 }],
        name: 'Test Customer',
        address: '123 Main St',
        phone: '555-1234'
      });
      
      expect(checkoutRes.status).toBe(400);
      expect(checkoutRes.text).toMatch(/Insufficient stock/i);
      
      // Restore stock
      await db.query('UPDATE products SET stock_quantity = 100 WHERE id = ?', [productId]);
    } else {
      console.log('No products found to test inventory flow');
    }
  });
});
