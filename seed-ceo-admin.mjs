import pg from 'pg';
import { hashSync, genSaltSync } from 'bcrypt-ts-edge';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

const { Client } = pg;

// Read DATABASE_URL from .env or .env.local
function loadEnv() {
  try {
    // Try .env first
    let content = readFileSync('.env', 'utf-8');
    let match = content.match(/DATABASE_URL=['"']?([^'"\n]+)/);
    if (match) return match[1];

    // Try .env.local
    content = readFileSync('.env.local', 'utf-8');
    match = content.match(/DATABASE_URL=['"']?([^'"\n]+)/);
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

  const ceoEmail = 'ceo@ranz.co.nz';
  const ceoPassword = 'RANZ-CEO-2026!';  // Change this after first login

  // Check if user already exists
  const existing = await client.query(
    'SELECT id, "userType", status FROM "AuthUser" WHERE email = $1',
    [ceoEmail]
  );

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    if (user.userType === 'RANZ_ADMIN') {
      console.log('CEO admin user already exists:', ceoEmail);
      console.log('Current status:', user.status);
    } else {
      // Upgrade to RANZ_ADMIN
      await client.query(
        'UPDATE "AuthUser" SET "userType" = $1, "updatedAt" = NOW() WHERE email = $2',
        ['RANZ_ADMIN', ceoEmail]
      );
      console.log('Upgraded existing user to RANZ_ADMIN:', ceoEmail);
    }
    await client.end();
    return;
  }

  // Create new RANZ_ADMIN user
  const salt = genSaltSync(12);
  const passwordHash = hashSync(ceoPassword, salt);

  const userId = randomUUID().replace(/-/g, '').slice(0, 25);
  await client.query(`
    INSERT INTO "AuthUser" (
      id, email, "passwordHash", "firstName", "lastName",
      "userType", status, "mustChangePassword",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
  `, [userId, ceoEmail, passwordHash, 'Luke', 'Boustridge', 'RANZ_ADMIN', 'ACTIVE', true]);

  console.log('');
  console.log('='.repeat(50));
  console.log('RANZ CEO Administrator account created!');
  console.log('='.repeat(50));
  console.log('');
  console.log('Email:    ', ceoEmail);
  console.log('Password: ', ceoPassword);
  console.log('Role:      RANZ_ADMIN (Full portal access)');
  console.log('');
  console.log('IMPORTANT: Change password after first login');
  console.log('='.repeat(50));

  await client.end();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
