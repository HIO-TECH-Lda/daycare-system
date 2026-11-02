import mongoose from 'mongoose';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
// MONGODB_URI_TEST is set by globalSetup (in-memory MongoDB) or by the caller
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
process.env.FRONTEND_URL = 'http://localhost:3000';
// Never send real email/WhatsApp from tests, even if a local .env has credentials
// (dotenv does not override variables that are already set, even to '').
for (const key of ['SMTP_USER', 'SMTP_PASS', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'CORS_ORIGINS']) {
  process.env[key] = '';
}

// Global test setup
beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    // One database per Jest worker: test files run in parallel and each clears its data between tests
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: `daycare-test-${process.env.JEST_WORKER_ID || 1}` });
  }
});

// Global test teardown
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
});

// Clean up database between tests
beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
