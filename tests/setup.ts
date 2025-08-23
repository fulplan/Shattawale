import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../server/db';

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/ecombot_test';
  
  // Clear database
  await clearDatabase();
});

afterAll(async () => {
  // Close database connection
  await db.$disconnect();
});

beforeEach(async () => {
  // Clear database before each test
  await clearDatabase();
});

async function clearDatabase() {
  // Clear all tables in the correct order (respecting foreign keys)
  const tables = [
    'audit_logs',
    'order_items',
    'payments',
    'orders',
    'products',
    'categories',
    'coupons',
    'users',
    'admin_users'
  ];

  for (const table of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}
