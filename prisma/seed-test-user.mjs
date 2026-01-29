/**
 * Seed a test user for SSO verification testing
 *
 * Usage: node prisma/seed-test-user.mjs
 */

import pg from 'pg';
import { hashSync, genSaltSync } from 'bcrypt-ts-edge';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read DATABASE_URL from .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/DATABASE_URL=['"']?([^'"\n]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

const { Client } = pg;

async function main() {
  const dbUrl = process.env.DATABASE_URL || loadEnv();
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment or .env file');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl
  });

  await client.connect();

  const testEmail = 'test@ranz.org.nz';
  const testPassword = 'TestPassword123!';

  // Check if user exists
  const existing = await client.query(
    'SELECT id FROM "AuthUser" WHERE email = $1',
    [testEmail]
  );

  if (existing.rows.length > 0) {
    console.log('Test user already exists:', testEmail);
    await client.end();
    return;
  }

  // Hash password
  const salt = genSaltSync(12);
  const passwordHash = hashSync(testPassword, salt);

  // Create company first
  const companyId = randomUUID().replace(/-/g, '').slice(0, 25);
  await client.query(`
    INSERT INTO "AuthCompany" (id, name, "tradingName", status, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, NOW(), NOW())
  `, [companyId, 'RANZ Test Company', 'Test Roofers Ltd', 'ACTIVE']);

  // Create user
  const userId = randomUUID().replace(/-/g, '').slice(0, 25);
  await client.query(`
    INSERT INTO "AuthUser" (
      id, email, "passwordHash", "firstName", "lastName",
      "userType", "companyId", status, "mustChangePassword",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
  `, [
    userId,
    testEmail,
    passwordHash,
    'Test',
    'User',
    'MEMBER_COMPANY_ADMIN',
    companyId,
    'ACTIVE',
    false
  ]);

  console.log('='.repeat(50));
  console.log('Test user created successfully!');
  console.log('='.repeat(50));
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);
  console.log('User ID:', userId);
  console.log('Company:', 'RANZ Test Company');
  console.log('='.repeat(50));

  await client.end();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
