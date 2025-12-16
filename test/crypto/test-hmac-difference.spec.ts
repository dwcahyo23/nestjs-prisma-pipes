// debug-hmac-difference.ts
// Script untuk debug perbedaan HMAC antara frontend dan backend

import * as crypto from 'crypto';

const SECRET_KEY = 'lhaz1BCQFwzOufOAVyjYplxDPmB3oQo2GYwopPFLBR8aeyj03BFMhi1rgyf6WbvC';
const TEST_DATA = 'aWQ6IGNvdW50KCk';

console.log('🔍 Debugging HMAC Difference\n');
console.log('='.repeat(60));
console.log(`Secret Key: ${SECRET_KEY}`);
console.log(`Test Data: ${TEST_DATA}`);
console.log('='.repeat(60));

// ============================================
// FRONTEND IMPLEMENTATION (Pure JS)
// ============================================

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

function sha256Frontend(message: Uint8Array): Uint8Array {
	const K = [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	];

	let H = [
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	];

	const msgBytes = new Uint8Array(message);
	const msgLen = msgBytes.length;
	const bitLen = msgLen * 8;

	const paddingLen = (msgLen + 9) % 64 === 0 ? 0 : 64 - ((msgLen + 9) % 64);
	const totalLen = msgLen + 1 + paddingLen + 8;
	const padded = new Uint8Array(totalLen);

	padded.set(msgBytes, 0);
	padded[msgLen] = 0x80;

	for (let i = 0; i < 8; i++) {
		padded[totalLen - 8 + i] = (bitLen >>> ((7 - i) * 8)) & 0xff;
	}

	for (let chunk = 0; chunk < padded.length; chunk += 64) {
		const W: number[] = new Array(64);

		for (let i = 0; i < 16; i++) {
			W[i] = (padded[chunk + i * 4] << 24) |
				(padded[chunk + i * 4 + 1] << 16) |
				(padded[chunk + i * 4 + 2] << 8) |
				(padded[chunk + i * 4 + 3]);
		}

		for (let i = 16; i < 64; i++) {
			const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
			const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
			W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
		}

		let [a, b, c, d, e, f, g, h] = H;

		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ ((~e) & g);
			const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;

			h = g; g = f; f = e; e = (d + temp1) | 0;
			d = c; c = b; b = a; a = (temp1 + temp2) | 0;
		}

		H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
		H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
		H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
		H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
	}

	const result = new Uint8Array(32);
	for (let i = 0; i < 8; i++) {
		result[i * 4] = (H[i] >>> 24) & 0xff;
		result[i * 4 + 1] = (H[i] >>> 16) & 0xff;
		result[i * 4 + 2] = (H[i] >>> 8) & 0xff;
		result[i * 4 + 3] = H[i] & 0xff;
	}

	return result;
}

function hmacSha256Frontend(key: string, message: string): Uint8Array {
	const blockSize = 64;
	const encoder = new TextEncoder();

	console.log('\n📊 Frontend HMAC Steps:');
	console.log('1. Key encoding...');
	let keyBytes: Uint8Array = encoder.encode(key);
	console.log(`   Key length: ${keyBytes.length} bytes`);
	console.log(`   Key first 10 bytes: ${Array.from(keyBytes.slice(0, 10))}`);

	if (keyBytes.length > blockSize) {
		console.log('   Key > blockSize, hashing key...');
		keyBytes = new Uint8Array(sha256Frontend(keyBytes).buffer);
		console.log(`   Hashed key length: ${keyBytes.length} bytes`);
	}

	const paddedKey = new Uint8Array(blockSize);
	paddedKey.set(keyBytes);

	const iKeyPad = new Uint8Array(blockSize);
	const oKeyPad = new Uint8Array(blockSize);

	for (let i = 0; i < blockSize; i++) {
		iKeyPad[i] = paddedKey[i] ^ 0x36;
		oKeyPad[i] = paddedKey[i] ^ 0x5c;
	}

	console.log(`   iKeyPad first 10 bytes: ${Array.from(iKeyPad.slice(0, 10))}`);
	console.log(`   oKeyPad first 10 bytes: ${Array.from(oKeyPad.slice(0, 10))}`);

	console.log('2. Message encoding...');
	const messageBytes = encoder.encode(message);
	console.log(`   Message length: ${messageBytes.length} bytes`);
	console.log(`   Message bytes: ${Array.from(messageBytes)}`);

	console.log('3. Inner hash...');
	const innerInput = new Uint8Array(blockSize + messageBytes.length);
	innerInput.set(iKeyPad, 0);
	innerInput.set(messageBytes, blockSize);
	const innerHash = sha256Frontend(innerInput);
	console.log(`   Inner hash: ${Array.from(innerHash.slice(0, 10))}...`);

	console.log('4. Outer hash...');
	const outerInput = new Uint8Array(blockSize + 32);
	outerInput.set(oKeyPad, 0);
	outerInput.set(new Uint8Array(innerHash.buffer), blockSize);
	const result = sha256Frontend(outerInput);
	console.log(`   Final hash: ${Array.from(result.slice(0, 10))}...`);

	return result;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return Buffer.from(binary, 'binary').toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

// ============================================
// BACKEND IMPLEMENTATION (Node.js)
// ============================================

console.log('\n📊 Backend HMAC Steps:');
console.log('Using Node.js crypto.createHmac()...');

const hmacBackend = crypto.createHmac('sha256', SECRET_KEY);
hmacBackend.update(TEST_DATA);
const backendSignature = hmacBackend.digest('base64')
	.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=+$/, '');

// Also create detailed backend for comparison
const hmacBackendDebug = crypto.createHmac('sha256', SECRET_KEY);

// Get raw bytes for comparison
const keyBuffer = Buffer.from(SECRET_KEY, 'utf8');
console.log(`   Key length: ${keyBuffer.length} bytes`);
console.log(`   Key first 10 bytes: ${Array.from(keyBuffer.slice(0, 10))}`);

const dataBuffer = Buffer.from(TEST_DATA, 'utf8');
console.log(`   Data length: ${dataBuffer.length} bytes`);
console.log(`   Data bytes: ${Array.from(dataBuffer)}`);

hmacBackendDebug.update(TEST_DATA);
const backendRawBytes = hmacBackendDebug.digest();
console.log(`   Final hash: ${Array.from(backendRawBytes.slice(0, 10))}...`);

// ============================================
// GENERATE AND COMPARE
// ============================================

console.log('\n='.repeat(60));
console.log('🔐 HMAC Signature Comparison');
console.log('='.repeat(60));

const frontendHash = hmacSha256Frontend(SECRET_KEY, TEST_DATA);
const frontendSignature = uint8ArrayToBase64Url(frontendHash);

console.log(`\nFrontend: ${frontendSignature}`);
console.log(`Backend:  ${backendSignature}`);
console.log(`\n✅ Match: ${frontendSignature === backendSignature ? 'YES' : 'NO'}`);

if (frontendSignature !== backendSignature) {
	console.log('\n🔍 Byte-by-byte comparison:');
	const frontendBytes = Array.from(frontendHash);
	const backendBytes = Array.from(backendRawBytes);

	console.log('\nFirst 32 bytes:');
	for (let i = 0; i < 32; i++) {
		const match = frontendBytes[i] === backendBytes[i] ? '✓' : '✗';
		console.log(`  [${i.toString().padStart(2, '0')}] Frontend: ${frontendBytes[i].toString().padStart(3, ' ')} | Backend: ${backendBytes[i].toString().padStart(3, ' ')} ${match}`);
	}

	// Find first mismatch
	const firstMismatch = frontendBytes.findIndex((byte, i) => byte !== backendBytes[i]);
	if (firstMismatch !== -1) {
		console.log(`\n❌ First mismatch at byte ${firstMismatch}`);
	}
}