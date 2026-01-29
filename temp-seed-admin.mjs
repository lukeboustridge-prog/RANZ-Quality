import pg from 'pg';
import { hashSync, genSaltSync } from 'bcrypt-ts-edge';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

const { Client } = pg;

// Read DATABASE_URL from .env.local
function loadEnv() {
  try {
    const content = readFileSync('.env.local', 'utf-8');
    const match = content.match(/DATABASE_URL=['"']?([^'"\n]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || loadEnv();
  if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const testEmail = 'admin@ranz.org.nz';
  const testPassword = 'AdminPassword123!';

  const existing = await client.query(
    'SELECT id FROM "AuthUser" WHERE email = $1',
    [testEmail]
  );

  if (existing.rows.length > 0) {
    console.log('Admin user already exists:', testEmail);
    console.log('Password:', testPassword);
    await client.end();
    return;
  }

  const salt = genSaltSync(12);
  const passwordHash = hashSync(testPassword, salt);

  const userId = randomUUID().replace(/-/g, '').slice(0, 25);
  await client.query(`
    INSERT INTO "AuthUser" (
      id, email, "passwordHash", "firstName", "lastName",
      "userType", status, "mustChangePassword",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
  `, [userId, testEmail, passwordHash, 'Admin', 'User', 'RANZ_ADMIN', 'ACTIVE', false]);

  console.log('RANZ_ADMIN user created!');
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);
  await client.end();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
