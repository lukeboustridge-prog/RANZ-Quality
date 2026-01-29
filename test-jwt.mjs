import { importPKCS8, SignJWT } from 'jose';
import { readFileSync } from 'fs';

// Read .env.local
const content = readFileSync('.env.local', 'utf-8');
const match = content.match(/JWT_PRIVATE_KEY="([^"]+)"/s);

if (!match) {
  console.error('Could not find JWT_PRIVATE_KEY in .env.local');
  process.exit(1);
}

const rawKey = match[1];
console.log('Raw key length:', rawKey.length);
console.log('Has \\n escapes:', rawKey.includes('\\n'));

// Replace escaped newlines
const normalizedKey = rawKey.replace(/\\n/g, '\n');
console.log('Normalized key length:', normalizedKey.length);
console.log('Starts with:', normalizedKey.substring(0, 30));

try {
  const key = await importPKCS8(normalizedKey, 'RS256');
  console.log('Key imported successfully!');
  console.log('Key type:', key.type);

  // Try to sign a token
  console.log('\nSigning a test token...');
  const token = await new SignJWT({
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'MEMBER_COMPANY_ADMIN',
    sessionId: 'test-session',
    type: 'access',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setIssuer('ranz-quality-program')
    .setAudience('ranz-apps')
    .setExpirationTime('8h')
    .setJti(crypto.randomUUID())
    .sign(key);

  console.log('Token signed successfully!');
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 50));
} catch (error) {
  console.error('Failed:', error.message);
  console.error(error.stack);
}
