import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';

const ALGORITHM = 'RS256';

const { publicKey, privateKey } = await generateKeyPair(ALGORITHM, {
  modulusLength: 2048,
  extractable: true,
});

const privateKeyPem = await exportPKCS8(privateKey);
const publicKeyPem = await exportSPKI(publicKey);

console.log('=== PRIVATE KEY (for Quality Program only) ===');
console.log(privateKeyPem);
console.log('');
console.log('=== PUBLIC KEY (for both apps) ===');
console.log(publicKeyPem);
console.log('');
console.log('=== FOR .env.local (escaped newlines) ===');
console.log('JWT_PRIVATE_KEY="' + privateKeyPem.replace(/\n/g, '\\n') + '"');
console.log('');
console.log('JWT_PUBLIC_KEY="' + publicKeyPem.replace(/\n/g, '\\n') + '"');
