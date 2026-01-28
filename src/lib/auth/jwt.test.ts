/**
 * JWT Infrastructure Test
 *
 * Run with: npx tsx src/lib/auth/jwt.test.ts
 *
 * This test:
 * 1. Generates an RSA key pair
 * 2. Sets environment variables temporarily
 * 3. Signs a test token
 * 4. Verifies the token
 * 5. Reports success/failure
 */

import { generateRSAKeyPair, signToken, verifyToken, clearKeyCache } from './jwt';
import type { JWTPayload } from './types';

async function testJWTInfrastructure() {
  console.log('Testing JWT Infrastructure...\n');

  // Step 1: Generate key pair
  console.log('1. Generating RSA-2048 key pair...');
  const { privateKey, publicKey } = await generateRSAKeyPair();
  console.log('   [OK] Key pair generated');
  console.log(`   Private key: ${privateKey.substring(0, 50)}...`);
  console.log(`   Public key: ${publicKey.substring(0, 50)}...`);

  // Step 2: Set environment variables
  console.log('\n2. Setting environment variables...');
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;
  process.env.JWT_KEY_ID = 'test-key-1';
  clearKeyCache(); // Clear cache to pick up new keys
  console.log('   [OK] Environment configured');

  // Step 3: Create test payload
  console.log('\n3. Creating test payload...');
  const testPayload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'> = {
    sub: 'test-user-123',
    email: 'test@ranz.org.nz',
    name: 'Test User',
    role: 'RANZ_STAFF',
    sessionId: 'session-456',
    type: 'access',
  };
  console.log('   [OK] Payload created:', JSON.stringify(testPayload, null, 2));

  // Step 4: Sign token
  console.log('\n4. Signing token...');
  const token = await signToken(testPayload);
  console.log('   [OK] Token signed');
  console.log(`   Token (first 100 chars): ${token.substring(0, 100)}...`);

  // Step 5: Verify token
  console.log('\n5. Verifying token...');
  const verified = await verifyToken(token);
  if (!verified) {
    throw new Error('Token verification failed!');
  }
  console.log('   [OK] Token verified successfully');
  console.log('   Verified payload:', JSON.stringify(verified, null, 2));

  // Step 6: Verify claims
  console.log('\n6. Verifying claims...');
  if (verified.sub !== testPayload.sub) throw new Error('Subject mismatch');
  if (verified.email !== testPayload.email) throw new Error('Email mismatch');
  if (verified.role !== testPayload.role) throw new Error('Role mismatch');
  if (!verified.exp) throw new Error('Missing expiration');
  if (!verified.iat) throw new Error('Missing issued at');
  console.log('   [OK] All claims verified');

  // Step 7: Check expiration
  console.log('\n7. Checking expiration...');
  const expiresIn = (verified.exp! * 1000 - Date.now()) / 1000 / 60 / 60;
  console.log(`   [OK] Token expires in ${expiresIn.toFixed(2)} hours (expected ~8)`);

  console.log('\n=== JWT Infrastructure Test PASSED ===\n');
  console.log('Generated keys for .env.local:');
  console.log('---'.repeat(20));
  console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
  console.log('');
  console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);
  console.log('---'.repeat(20));
}

testJWTInfrastructure().catch((error) => {
  console.error('\n=== JWT Infrastructure Test FAILED ===');
  console.error('Error:', error.message);
  process.exit(1);
});
