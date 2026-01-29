/**
 * Seed a test user for SSO verification testing
 *
 * Usage: npx tsx prisma/seed-test-user.ts
 *
 * Prerequisites:
 * - DATABASE_URL set in .env
 * - Database schema pushed: npm run db:push
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';

const prisma = new PrismaClient();

async function main() {
  const testEmail = 'test@ranz.org.nz';
  const testPassword = 'TestPassword123!';

  // Check if user already exists
  const existing = await prisma.authUser.findUnique({
    where: { email: testEmail }
  });

  if (existing) {
    console.log('Test user already exists:', testEmail);
    return;
  }

  // Hash password using project's password utility
  const passwordHash = hashPassword(testPassword);

  // Create test company first
  const company = await prisma.authCompany.create({
    data: {
      name: 'RANZ Test Company',
      tradingName: 'Test Roofers Ltd',
      status: 'ACTIVE',
    }
  });

  // Create test user
  const user = await prisma.authUser.create({
    data: {
      email: testEmail,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      userType: 'MEMBER_OWNER',
      companyId: company.id,
      status: 'ACTIVE',
      mustChangePassword: false,
    }
  });

  console.log('='.repeat(50));
  console.log('Test user created successfully!');
  console.log('='.repeat(50));
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);
  console.log('User ID:', user.id);
  console.log('Company:', company.name);
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('Error seeding test user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
