// test-crypto-compatibility.spec.ts
// Node.js test untuk validasi kompatibilitas frontend & backend crypto

import * as crypto from 'crypto';

// ============================================
// FRONTEND CRYPTO IMPLEMENTATION (Pure JS)
// ============================================

interface SecurePipePayload {
	data: string;
	signature: string;
	timestamp: number;
}

// Base64 URL-Safe Encoding
function toBase64UrlSafeFrontend(str: string): string {
	const utf8Bytes = new TextEncoder().encode(str);
	let binary = '';
	utf8Bytes.forEach(byte => {
		binary += String.fromCharCode(byte);
	});
	const base64 = Buffer.from(binary, 'binary').toString('base64');
	return base64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function fromBase64UrlSafeFrontend(base64UrlSafe: string): string {
	let base64 = base64UrlSafe
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	const binary = Buffer.from(base64, 'base64').toString('binary');
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

// SHA-256 Pure JS
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

	let keyBytes: Uint8Array = encoder.encode(key);

	if (keyBytes.length > blockSize) {
		keyBytes = new Uint8Array(sha256Frontend(keyBytes).buffer);
	}

	const paddedKey = new Uint8Array(blockSize);
	paddedKey.set(keyBytes);

	const iKeyPad = new Uint8Array(blockSize);
	const oKeyPad = new Uint8Array(blockSize);

	for (let i = 0; i < blockSize; i++) {
		iKeyPad[i] = paddedKey[i] ^ 0x36;
		oKeyPad[i] = paddedKey[i] ^ 0x5c;
	}

	const messageBytes = encoder.encode(message);
	const innerInput = new Uint8Array(blockSize + messageBytes.length);
	innerInput.set(iKeyPad, 0);
	innerInput.set(messageBytes, blockSize);
	const innerHash = sha256Frontend(innerInput);

	const outerInput = new Uint8Array(blockSize + 32);
	outerInput.set(oKeyPad, 0);
	outerInput.set(new Uint8Array(innerHash.buffer), blockSize);
	return sha256Frontend(outerInput);
}

function uint8ArrayToBase64UrlFrontend(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return Buffer.from(binary, 'binary').toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function generateHmacFrontend(data: string, secretKey: string): string {
	const hash = hmacSha256Frontend(secretKey, data);
	return uint8ArrayToBase64UrlFrontend(hash);
}

function encodeClientPipeQueryFrontend(query: string, secretKey: string): string {
	const encodedData = toBase64UrlSafeFrontend(query);
	const signature = generateHmacFrontend(encodedData, secretKey);

	const payload: SecurePipePayload = {
		data: encodedData,
		signature: signature,
		timestamp: Date.now(),
	};

	const payloadJson = JSON.stringify(payload);
	return toBase64UrlSafeFrontend(payloadJson);
}

// ============================================
// BACKEND CRYPTO IMPLEMENTATION (Node.js)
// ============================================

function toBase64UrlSafeBackend(str: string): string {
	const buffer = Buffer.from(str, 'utf8');
	const base64 = buffer.toString('base64');
	return base64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function fromBase64UrlSafeBackend(base64UrlSafe: string): string {
	let base64 = base64UrlSafe
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	const buffer = Buffer.from(base64, 'base64');
	return buffer.toString('utf8');
}

function generateHmacBackend(data: string, secretKey: string): string {
	const hmac = crypto.createHmac('sha256', secretKey);
	hmac.update(data);
	return hmac.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function verifyHmacBackend(data: string, signature: string, secretKey: string): boolean {
	const expectedSignature = generateHmacBackend(data, secretKey);
	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature)
	);
}

function isEncryptedQuery(query: string): boolean {
	const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
	if (!base64UrlPattern.test(query)) {
		return false;
	}

	try {
		const payloadJson = fromBase64UrlSafeBackend(query);
		const payload = JSON.parse(payloadJson);
		return !!(
			payload &&
			typeof payload === 'object' &&
			payload.data &&
			payload.signature &&
			typeof payload.timestamp === 'number'
		);
	} catch {
		return false;
	}
}

function decodePipeQueryBackend(encodedQuery: string, secretKey: string, allowPlaintext = false): string {
	const isEncrypted = isEncryptedQuery(encodedQuery);

	if (!isEncrypted) {
		if (allowPlaintext) {
			console.warn('⚠️ Plaintext query detected');
			return encodedQuery;
		} else {
			throw new Error('Plaintext queries not allowed');
		}
	}

	try {
		const payloadJson = fromBase64UrlSafeBackend(encodedQuery);
		const payload: SecurePipePayload = JSON.parse(payloadJson);

		const isValid = verifyHmacBackend(payload.data, payload.signature, secretKey);

		if (!isValid) {
			throw new Error('Invalid HMAC signature');
		}

		const decodedQuery = fromBase64UrlSafeBackend(payload.data);
		return decodedQuery;

	} catch (error) {
		if (allowPlaintext) {
			console.warn('⚠️ Failed to decode, using plaintext fallback');
			return encodedQuery;
		}
		throw error;
	}
}

// ============================================
// TEST SUITE
// ============================================

console.log('🧪 Starting Crypto Compatibility Tests\n');
console.log('='.repeat(60));

const SECRET_KEY = 'lhaz1BCQFwzOufOAVyjYplxDPmB3oQo2GYwopPFLBR8aeyj03BFMhi1rgyf6WbvC';
const TEST_QUERIES = [
	'id: count()',
	'id: count(), groupBy: (woIsClose), chart: line(woAt,month:2025)',
	'masterMachine.userMaintenceMachine.some.nik: equals string(2019020064)',
	'createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)',
	'qty: lte field(recQty)',
	'mesin.some.userMesin.some.createdAt: lte field($parent.createdAt)',
];

// ============================================
// TEST 1: Base64 URL-Safe Encoding
// ============================================
console.log('\n📋 TEST 1: Base64 URL-Safe Encoding');
console.log('-'.repeat(60));

for (const query of TEST_QUERIES) {
	const frontendEncoded = toBase64UrlSafeFrontend(query);
	const backendEncoded = toBase64UrlSafeBackend(query);
	const match = frontendEncoded === backendEncoded;

	console.log(`Query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
	console.log(`Frontend: ${frontendEncoded.substring(0, 40)}...`);
	console.log(`Backend:  ${backendEncoded.substring(0, 40)}...`);
	console.log(`✅ Match: ${match ? 'YES' : 'NO'}\n`);

	if (!match) {
		console.error('❌ FAILED: Base64 encoding mismatch!');
		process.exit(1);
	}
}

// ============================================
// TEST 2: HMAC Signature Generation
// ============================================
console.log('\n🔐 TEST 2: HMAC Signature Generation');
console.log('-'.repeat(60));

for (const query of TEST_QUERIES) {
	const encodedData = toBase64UrlSafeFrontend(query);
	const frontendSignature = generateHmacFrontend(encodedData, SECRET_KEY);
	const backendSignature = generateHmacBackend(encodedData, SECRET_KEY);
	const match = frontendSignature === backendSignature;

	console.log(`Query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
	console.log(`Frontend HMAC: ${frontendSignature}`);
	console.log(`Backend HMAC:  ${backendSignature}`);
	console.log(`✅ Match: ${match ? 'YES' : 'NO'}\n`);

	if (!match) {
		console.error('❌ FAILED: HMAC signature mismatch!');
		console.error('Encoded data:', encodedData);
		process.exit(1);
	}
}

// ============================================
// TEST 3: Full Round-Trip (HTTP Simulation)
// ============================================
console.log('\n🔄 TEST 3: Full Round-Trip - HTTP Simulation (Pure JS)');
console.log('-'.repeat(60));

for (const query of TEST_QUERIES) {
	try {
		// Frontend encodes (simulating HTTP/Pure JS)
		const encoded = encodeClientPipeQueryFrontend(query, SECRET_KEY);
		console.log(`Original: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
		console.log(`Encoded:  ${encoded.substring(0, 60)}...`);

		// Backend decodes
		const decoded = decodePipeQueryBackend(encoded, SECRET_KEY, false);
		console.log(`Decoded:  ${decoded.substring(0, 50)}${decoded.length > 50 ? '...' : ''}`);

		const match = query === decoded;
		console.log(`✅ Round-trip: ${match ? 'SUCCESS' : 'FAILED'}\n`);

		if (!match) {
			console.error('❌ FAILED: Round-trip mismatch!');
			console.error('Expected:', query);
			console.error('Got:', decoded);
			process.exit(1);
		}
	} catch (error) {
		console.error(`❌ FAILED: ${error}`);
		process.exit(1);
	}
}

// ============================================
// TEST 4: HTTPS Simulation (Web Crypto API)
// ============================================
console.log('\n🔒 TEST 4: HTTPS Simulation (Node.js crypto = Web Crypto equivalent)');
console.log('-'.repeat(60));

for (const query of TEST_QUERIES) {
	try {
		// Simulate frontend using Web Crypto API (which produces same result as Node.js)
		const encodedData = toBase64UrlSafeBackend(query);
		const signature = generateHmacBackend(encodedData, SECRET_KEY);

		const payload: SecurePipePayload = {
			data: encodedData,
			signature: signature,
			timestamp: Date.now(),
		};

		const encoded = toBase64UrlSafeBackend(JSON.stringify(payload));

		console.log(`Original: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
		console.log(`Encoded:  ${encoded.substring(0, 60)}...`);

		// Backend decodes
		const decoded = decodePipeQueryBackend(encoded, SECRET_KEY, false);
		console.log(`Decoded:  ${decoded.substring(0, 50)}${decoded.length > 50 ? '...' : ''}`);

		const match = query === decoded;
		console.log(`✅ Round-trip: ${match ? 'SUCCESS' : 'FAILED'}\n`);

		if (!match) {
			console.error('❌ FAILED: HTTPS round-trip mismatch!');
			process.exit(1);
		}
	} catch (error) {
		console.error(`❌ FAILED: ${error}`);
		process.exit(1);
	}
}

// ============================================
// TEST 5: Signature Verification
// ============================================
console.log('\n🔍 TEST 5: HMAC Signature Verification');
console.log('-'.repeat(60));

for (const query of TEST_QUERIES) {
	const encodedData = toBase64UrlSafeFrontend(query);
	const frontendSignature = generateHmacFrontend(encodedData, SECRET_KEY);

	const isValid = verifyHmacBackend(encodedData, frontendSignature, SECRET_KEY);

	console.log(`Query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
	console.log(`Signature: ${frontendSignature}`);
	console.log(`✅ Verification: ${isValid ? 'VALID' : 'INVALID'}\n`);

	if (!isValid) {
		console.error('❌ FAILED: Signature verification failed!');
		process.exit(1);
	}
}

// ============================================
// TEST 6: Invalid Signature Detection
// ============================================
console.log('\n🛡️ TEST 6: Invalid Signature Detection');
console.log('-'.repeat(60));

try {
	const query = 'id: count()';
	const encodedData = toBase64UrlSafeFrontend(query);
	const validSignature = generateHmacFrontend(encodedData, SECRET_KEY);

	// Tamper with signature
	const tamperedSignature = validSignature.substring(0, validSignature.length - 4) + 'XXXX';

	const payload: SecurePipePayload = {
		data: encodedData,
		signature: tamperedSignature,
		timestamp: Date.now(),
	};

	const encoded = toBase64UrlSafeFrontend(JSON.stringify(payload));

	console.log('Testing tampered signature...');
	console.log(`Original:  ${validSignature}`);
	console.log(`Tampered:  ${tamperedSignature}`);

	try {
		decodePipeQueryBackend(encoded, SECRET_KEY, false);
		console.error('❌ FAILED: Should have rejected tampered signature!');
		process.exit(1);
	} catch (error: any) {
		console.log(`✅ Correctly rejected: ${error.message}\n`);
	}
} catch (error) {
	console.error(`❌ FAILED: ${error}`);
	process.exit(1);
}

// ============================================
// TEST 7: Plaintext Fallback
// ============================================
console.log('\n📝 TEST 7: Plaintext Fallback');
console.log('-'.repeat(60));

const plaintextQuery = 'id: count()';
console.log(`Plaintext query: ${plaintextQuery}`);

try {
	const decoded = decodePipeQueryBackend(plaintextQuery, SECRET_KEY, true);
	console.log(`Decoded (fallback): ${decoded}`);
	console.log(`✅ Plaintext fallback: ${decoded === plaintextQuery ? 'SUCCESS' : 'FAILED'}\n`);
} catch (error) {
	console.error(`❌ FAILED: ${error}`);
	process.exit(1);
}

// ============================================
// SUMMARY
// ============================================
console.log('='.repeat(60));
console.log('✅ ALL TESTS PASSED!');
console.log('='.repeat(60));
console.log('\n📊 Test Summary:');
console.log('✓ Base64 URL-Safe Encoding: Compatible');
console.log('✓ HMAC Signature Generation: Compatible');
console.log('✓ HTTP Simulation (Pure JS): Working');
console.log('✓ HTTPS Simulation (Web Crypto): Working');
console.log('✓ Signature Verification: Working');
console.log('✓ Invalid Signature Detection: Working');
console.log('✓ Plaintext Fallback: Working');
console.log('\n🎉 Frontend (Pure JS) and Backend (Node.js) are 100% compatible!\n');