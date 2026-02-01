#!/usr/bin/env node

/**
 * Generate Ed25519 Key Pair for Platform Signing
 * 
 * Usage: node scripts/generate-keys.js
 */

import { generateKeyPair } from '../src/lib/signature.js';

console.log('Generating Ed25519 key pair for platform signing...\n');

const { privateKey, publicKey } = generateKeyPair();

console.log('✅ Key pair generated successfully!\n');
console.log('Add these to your .env.local file:\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`PLATFORM_PRIVATE_KEY="${privateKey}"`);
console.log(`PLATFORM_PUBLIC_KEY="${publicKey}"`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⚠️  SECURITY WARNING:');
console.log('   - Keep PLATFORM_PRIVATE_KEY secret and never commit to Git');
console.log('   - PLATFORM_PUBLIC_KEY can be public');
console.log('   - Backup these keys securely\n');
