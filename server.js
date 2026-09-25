require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const { db, rawPool } = require("./db");
const { sendMail, orderConfirmationEmail, passwordResetEmail } = require("./email");

const app = express();

// ── Multer Setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'images')),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|avif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// ── Stripe Webhook (raw body — MUST be before express.json()) ────────────────
app.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret === "whsec_placeholder") {
    console.warn("⚠️  Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(400).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("⚠️  Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const stripeSession = event.data.object;
    const orderId = stripeSession.metadata?.order_id;

    if (orderId) {
      try {
        await db.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [orderId]);
        console.log(`✅ Order #${orderId} payment confirmed via webhook`);

        const [rows] = await db.query(
          `SELECT o.id, o.name, o.email, o.address, o.total_amount AS total,
                  i.product_name AS name, i.price, i.quantity, i.subtotal
           FROM orders o
           LEFT JOIN order_items i ON o.id = i.order_id
           WHERE o.id = ?`,
          [orderId]
        );

        if (rows.length > 0) {
          const order = {
            name: rows[0].name,
            email: rows[0].email,
            address: rows[0].address,
            total: rows[0].total,
            items: rows.map((r) => ({ name: r.name, price: r.price, quantity: r.quantity })),
          };
          sendMail({
            to: order.email,
            subject: `KOTI — Order #${orderId} Confirmed!`,
            html: orderConfirmationEmail(order),
          }).catch((err) => console.error("Email send failed:", err));
        }
      } catch (err) {
        console.error("Failed to process checkout.session.completed", err);
      }
    }
  } else if (event.type === "checkout.session.expired") {
    const stripeSession = event.data.object;
    const orderId = stripeSession.metadata?.order_id;

    if (orderId) {
      try {
        await db.query("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [orderId]);
        
        const [items] = await db.query("SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL", [orderId]);
        for (const item of items) {
          await db.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [item.quantity, item.product_id]);
        }
        console.log(`❌ Order #${orderId} expired, stock restored.`);
      } catch (err) {
        console.error("Failed to process checkout.session.expired", err);
      }
    }
  }

  res.json({ received: true });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Session Store (MySQL-backed, survives restarts) ──────────────────────────
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000,
}, rawPool);

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// ── Rate Limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again in 15 minutes." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// ── Products API ─────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const [results] = await db.query('SELECT id, title, image, price, stock_quantity FROM products WHERE is_active = 1');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load products' });
  }
});

// ── Stripe Checkout (server-side price validation) ───────────────────────────
app.post('/create-checkout-session', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { items, name, address, phone } = req.body;
    const user = req.session.user;
    if (!user || user.role !== 'customer') return res.status(403).json({ error: 'Unauthorized' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    const quantities = {};
    const productIds = [];
    for (const item of items) {
      const id = parseInt(item.id);
      const qty = parseInt(item.quantity);
      if (!id || !qty || qty < 1) return res.status(400).json({ error: 'Invalid item in cart' });
      quantities[id] = qty;
      productIds.push(id);
    }

    await conn.beginTransaction();

    // Lock product rows for update
    const [dbProducts] = await conn.query(
      'SELECT id, title, price, stock_quantity FROM products WHERE id IN (?) AND is_active = 1 FOR UPDATE',
      [productIds]
    );

    if (dbProducts.length !== productIds.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'One or more products not found or inactive' });
    }

    // Validate stock
    const outOfStock = [];
    for (const product of dbProducts) {
      if (product.stock_quantity < quantities[product.id]) {
        outOfStock.push(`${product.title} (only ${product.stock_quantity} left)`);
      }
    }
    if (outOfStock.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: `Insufficient stock: ${outOfStock.join(', ')}` });
    }

    const totalAmount = dbProducts.reduce((sum, p) => sum + parseFloat(p.price) * quantities[p.id], 0);

    const [userRows] = await conn.query('SELECT email FROM users WHERE id = ?', [user.id]);
    if (userRows.length === 0) { await conn.rollback(); return res.status(400).json({ error: 'User not found' }); }

    // Insert order as unpaid
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_amount, name, email, address, phone, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid')`,
      [user.id, totalAmount, name, userRows[0].email, address, phone]
    );
    const orderId = orderResult.insertId;

    // Insert order items AND decrement stock
    for (const product of dbProducts) {
      const qty = quantities[product.id];
      const subtotal = parseFloat(product.price) * qty;
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, product.id, product.title, product.price, qty, subtotal]
      );
      await conn.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [qty, product.id]
      );
    }

    // Create Stripe session
    const line_items = dbProducts.map(product => ({
      price_data: {
        currency: 'usd',
        product_data: { name: product.title },
        unit_amount: Math.round(parseFloat(product.price) * 100),
      },
      quantity: quantities[product.id],
    }));

    const sessionStripe = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${req.headers.origin}/success`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: { order_id: String(orderId) },
    });

    // Store stripe session id on the order
    await conn.query('UPDATE orders SET stripe_session_id = ? WHERE id = ?', [sessionStripe.id, orderId]);

    await conn.commit();
    res.json({ url: sessionStripe.url });
  } catch (error) {
    await conn.rollback();
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  } finally {
    conn.release();
  }
});

// ── Auth (AJAX JSON + rate-limited = CSRF-safe) ─────────────────────────────
app.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'All fields are required.' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);
    req.session.user = { id: result.insertId, name, role: 'customer' };
    res.json({ success: true, redirect: '/dashboard' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'An account with that email already exists.' });
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

app.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required.' });

    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) return res.status(401).json({ success: false, error: 'Invalid email or password.' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid email or password.' });

    req.session.user = { id: user.id, name: user.name, role: user.role };
    res.json({ success: true, redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Login failed.' });
  }
});

// ── Password Reset ───────────────────────────────────────────────────────────
app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });

  const successMsg = 'If an account exists with that email, a reset link has been sent.';

  try {
    const [results] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (results.length === 0) return res.json({ success: true, message: successMsg });

    const userId = results[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);
      await conn.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    sendMail({ to: email, subject: 'KOTI — Password Reset', html: passwordResetEmail(resetUrl) }).catch(err => console.error('Reset email failed:', err));

    res.json({ success: true, message: successMsg });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json({ success: true, message: successMsg });
  }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password are required.' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [results] = await db.query('SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > NOW()', [tokenHash]);
    if (results.length === 0) return res.status(400).json({ success: false, error: 'Invalid or expired reset link.' });

    const resetEntry = results[0];
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, resetEntry.user_id]);
    await db.query('DELETE FROM password_resets WHERE user_id = ?', [resetEntry.user_id]);

    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// ── Protected Pages ──────────────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/unauthorized');
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/unauthorized');
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ── Admin APIs ───────────────────────────────────────────────────────────────
// Get all orders (excludes soft-deleted)
app.get("/admin/orders-with-items", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  const sql = `
    SELECT 
      o.id AS order_id, o.total_amount, o.status, o.payment_status, o.created_at,
      o.name, o.email, o.address, o.phone,
      i.product_name, i.price, i.quantity, i.subtotal
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.order_id
    WHERE o.deleted_at IS NULL
    ORDER BY o.created_at DESC
  `;

  try {
    const [results] = await db.query(sql);
    const ordersMap = {};
    results.forEach((row) => {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          total: row.total_amount,
          status: row.status,
          payment_status: row.payment_status,
          created_at: row.created_at,
          name: row.name,
          email: row.email,
          address: row.address,
          phone: row.phone,
          items: [],
        };
      }

      if (row.product_name) {
        ordersMap[row.order_id].items.push({
          name: row.product_name,
          price: row.price,
          quantity: row.quantity,
          subtotal: row.subtotal,
        });
      }
    });

    res.json(Object.values(ordersMap));
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ message: "DB Error" });
  }
});

// Update order status
app.post('/admin/orders/:id/status', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

  const orderId = req.params.id;
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'canceled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  try {
    if (status === 'canceled') {
      const [orders] = await db.query('SELECT payment_status, stripe_session_id FROM orders WHERE id = ? AND deleted_at IS NULL', [orderId]);
      if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

      const order = orders[0];

      if (order.payment_status === 'paid' && order.stripe_session_id) {
        try {
          const stripeSession = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
          if (stripeSession.payment_intent) {
            await stripe.refunds.create({ payment_intent: stripeSession.payment_intent });
          }
        } catch (stripeErr) {
          console.error('Stripe refund failed:', stripeErr.message);
        }
        await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', ['refunded', orderId]);
      }

      const [items] = await db.query('SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', [orderId]);
      for (const item of items) {
        await db.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ? AND deleted_at IS NULL', [status, orderId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Soft-delete order
app.delete('/admin/orders/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const [result] = await db.query('UPDATE orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete order' });
  }
});

// Admin Product CRUD
app.get('/admin/products', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const [results] = await db.query('SELECT id, title, image, price, stock_quantity, is_active, created_at FROM products ORDER BY id ASC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load products' });
  }
});

app.post('/admin/products', upload.single('image'), async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const { title, price, stock_quantity } = req.body;
    if (!title || !price) return res.status(400).json({ success: false, message: 'Title and price are required' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Product image is required' });

    const imagePath = 'images/' + req.file.filename;
    const stock = parseInt(stock_quantity) || 100;

    const [result] = await db.query(
      'INSERT INTO products (title, image, price, stock_quantity) VALUES (?, ?, ?, ?)',
      [title, imagePath, parseFloat(price), stock]
    );
    res.json({ success: true, product: { id: result.insertId, title, image: imagePath, price: parseFloat(price), stock_quantity: stock, is_active: 1 } });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

app.put('/admin/products/:id', upload.single('image'), async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const { title, price, stock_quantity, is_active } = req.body;
    const productId = req.params.id;

    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });

    const updatedTitle = title || existing[0].title;
    const updatedPrice = price ? parseFloat(price) : existing[0].price;
    const updatedStock = stock_quantity !== undefined ? parseInt(stock_quantity) : existing[0].stock_quantity;
    const updatedActive = is_active !== undefined ? parseInt(is_active) : existing[0].is_active;
    const updatedImage = req.file ? 'images/' + req.file.filename : existing[0].image;

    await db.query(
      'UPDATE products SET title = ?, image = ?, price = ?, stock_quantity = ?, is_active = ? WHERE id = ?',
      [updatedTitle, updatedImage, updatedPrice, updatedStock, updatedActive, productId]
    );
    res.json({ success: true, product: { id: parseInt(productId), title: updatedTitle, image: updatedImage, price: updatedPrice, stock_quantity: updatedStock, is_active: updatedActive } });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

app.delete('/admin/products/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const [result] = await db.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to deactivate product' });
  }
});

// ── Adoption Inquiries ──────────────────────────────────────────────────────
// Public: submit an adoption inquiry (no login required)
app.post('/api/adoption-inquiries', apiLimiter, async (req, res) => {
  try {
    const { pet_name, applicant_name, applicant_email, applicant_phone, message } = req.body;
    if (!pet_name || !applicant_name || !applicant_email) {
      return res.status(400).json({ success: false, error: 'Pet name, your name, and email are required.' });
    }
    await db.query(
      'INSERT INTO adoption_inquiries (pet_name, applicant_name, applicant_email, applicant_phone, message) VALUES (?, ?, ?, ?, ?)',
      [pet_name, applicant_name, applicant_email, applicant_phone || null, message || null]
    );
    res.json({ success: true, message: 'Your inquiry has been submitted! We\'ll contact you soon.' });
  } catch (err) {
    console.error('Adoption inquiry error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit inquiry.' });
  }
});

// Admin: list all adoption inquiries
app.get('/admin/adoption-inquiries', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const [results] = await db.query('SELECT * FROM adoption_inquiries ORDER BY created_at DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load inquiries' });
  }
});

// Admin: update adoption inquiry status
app.put('/admin/adoption-inquiries/:id/status', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const [result] = await db.query('UPDATE adoption_inquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update inquiry' });
  }
});

// ── User APIs ────────────────────────────────────────────────────────────────
app.get('/api/user', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const [results] = await db.query('SELECT id, name, email, role, address, phone FROM users WHERE id = ?', [req.session.user.id]);
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load user' });
  }
});

app.post('/api/update-profile', apiLimiter, async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { name, address, phone } = req.body;
    const [results] = await db.query('SELECT name, address, phone FROM users WHERE id = ?', [req.session.user.id]);
    if (results.length === 0) return res.status(500).json({ message: 'User not found' });

    const current = results[0];
    const updatedName = name && name.trim() !== '' ? name : current.name;
    const updatedAddress = address && address.trim() !== '' ? address : current.address;
    const updatedPhone = phone && phone.trim() !== '' ? phone : current.phone;

    await db.query('UPDATE users SET name = ?, address = ?, phone = ? WHERE id = ?',
      [updatedName, updatedAddress, updatedPhone, req.session.user.id]);
    req.session.user.name = updatedName;
    res.json({ message: 'Info updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// Customer order history (excludes soft-deleted)
app.get("/api/my-orders-with-items", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });

  const sql = `
    SELECT 
      o.id AS order_id, o.total_amount, o.status, o.payment_status, o.created_at,
      o.name, o.email, o.address, o.phone,
      i.product_name, i.price, i.quantity, i.subtotal
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.order_id
    WHERE o.user_id = ? AND o.deleted_at IS NULL
    ORDER BY o.created_at DESC
  `;

  try {
    const [results] = await db.query(sql, [req.session.user.id]);
    const ordersMap = {};
    results.forEach((row) => {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          total: row.total_amount,
          status: row.status,
          payment_status: row.payment_status,
          created_at: row.created_at,
          name: row.name,
          email: row.email,
          address: row.address,
          phone: row.phone,
          items: [],
        };
      }

      ordersMap[row.order_id].items.push({
        name: row.product_name,
        price: row.price,
        quantity: row.quantity,
        subtotal: row.subtotal,
      });
    });

    res.json(Object.values(ordersMap));
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ message: "DB Error" });
  }
});

app.post('/api/change-password', authLimiter, async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });

    const [results] = await db.query('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
    if (results.length === 0) return res.status(500).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, results[0].password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update password' });
  }
});

// ── Logout ───────────────────────────────────────────────────────────────────
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── Fallback Pages ───────────────────────────────────────────────────────────
app.get('/unauthorized', (req, res) => res.sendFile(path.join(__dirname, 'public', 'unauthorized.html')));
app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'public', 'success.html')));
app.get('/cancel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cancel.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgot-password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reset-password.html')));

// 404 fallback (must be last route before global error handler)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ── Global Error Handler (must be LAST) ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
