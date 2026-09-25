// Runs before each test file — set env vars for test database
process.env.DB_NAME = 'koti_test';
process.env.DB_PORT = process.env.DB_PORT || '3307';
process.env.SESSION_SECRET = 'test-session-secret-1234567890';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
process.env.PORT = '0'; // Let OS assign a random port
