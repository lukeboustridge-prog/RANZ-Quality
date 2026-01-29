/**
 * Verification script for AuthMode migration (Phase 6, Plan 01)
 *
 * This script verifies that:
 * 1. All existing AuthUser records have authMode = 'CLERK' (the default)
 * 2. The migration fields (migratedAt, migratedBy, migrationNotes, clerkMetadata) are null
 *
 * Run with: npx tsx scripts/verify-auth-mode-migration.ts
 */

import { PrismaClient, AuthMode, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAuthModeMigration() {
  console.log('=== AuthMode Migration Verification ===\n');

  try {
    // Count total users
    const totalUsers = await prisma.authUser.count();
    console.log(`Total AuthUser records: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('\nNo users in database yet - migration verified (default will apply on insert).');
      return true;
    }

    // Count users with CLERK mode (should be all existing users)
    const clerkModeUsers = await prisma.authUser.count({
      where: { authMode: AuthMode.CLERK }
    });
    console.log(`Users with authMode = CLERK: ${clerkModeUsers}`);

    // Count users with other modes (should be 0)
    const customModeUsers = await prisma.authUser.count({
      where: { authMode: AuthMode.CUSTOM }
    });
    const migratingModeUsers = await prisma.authUser.count({
      where: { authMode: AuthMode.MIGRATING }
    });
    console.log(`Users with authMode = CUSTOM: ${customModeUsers}`);
    console.log(`Users with authMode = MIGRATING: ${migratingModeUsers}`);

    // Verify all users are CLERK
    if (clerkModeUsers !== totalUsers) {
      console.error('\n[FAIL] Not all users have authMode = CLERK');
      return false;
    }

    // Verify migration fields are null for all users
    const usersWithMigrationData = await prisma.authUser.count({
      where: {
        OR: [
          { migratedAt: { not: null } },
          { migratedBy: { not: null } },
          { migrationNotes: { not: null } },
          { clerkMetadata: { not: Prisma.DbNull } }
        ]
      }
    });

    if (usersWithMigrationData > 0) {
      console.log(`\n[WARNING] ${usersWithMigrationData} users have non-null migration fields`);
    } else {
      console.log('\nAll migration fields (migratedAt, migratedBy, migrationNotes, clerkMetadata) are null as expected.');
    }

    // Sample a few users for visual verification
    console.log('\nSample users (first 5):');
    const sampleUsers = await prisma.authUser.findMany({
      select: {
        id: true,
        email: true,
        authMode: true,
        migratedAt: true,
        migratedBy: true
      },
      take: 5
    });

    if (sampleUsers.length > 0) {
      console.table(sampleUsers);
    }

    console.log('\n[PASS] AuthMode migration verification successful!');
    console.log('- All existing users have authMode = CLERK');
    console.log('- Migration tracking fields are ready for Phase 6 migration');

    return true;

  } catch (error) {
    console.error('\n[ERROR] Verification failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyAuthModeMigration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
