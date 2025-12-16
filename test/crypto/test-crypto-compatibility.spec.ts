// test-cryptojs-compatibility.spec.ts
// Test untuk memverifikasi crypto-js compatible dengan Node.js crypto

import * as crypto from 'crypto';
import CryptoJS from 'crypto-js';

console.log('🧪 Testing crypto-js Compatibility with Node.js crypto\n');
console.log('='.repeat(60));

const SECRET_KEY = 'lhaz1BCQFwzOufOAVyjYplxDPmB3oQo2GYwopPFLBR8aeyj03BFMhi1rgyf6WbvC';
const TEST_DATA = [
	'aWQ6IGNvdW50KCk',
	'aWQ6IGNvdW50KCksIGdyb3VwQnk6ICh3b0lzQ2xvc2Up',
	'bWFzdGVyTWFjaGluZS51c2VyTWFpbnRlbmNlTWFjaGluZS5zb21lLm5pazogZXF1YWxzIHN0cmluZygyMDE5MDIwMDY0KQ',
	'cXR5OiBsdGUgZmllbGQocmVjUXR5KQ',
];

interface TestResult {
	data: string;
	cryptoJSSignature: string;
	nodejsSignature: string;
	match: boolean;
}

const results: TestResult[] = [];

console.log('\n🔐 TEST 1: HMAC-SHA256 Signature Generation\n');
console.log('-'.repeat(60));

for (const data of TEST_DATA) {
	console.log(`\nTest Data: ${data.substring(0, 40)}...`);

	// crypto-js HMAC
	const hmacCryptoJS = CryptoJS.HmacSHA256(data, SECRET_KEY);
	const cryptoJSBase64 = hmacCryptoJS.toString(CryptoJS.enc.Base64);
	const cryptoJSSignature = cryptoJSBase64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	// Node.js crypto HMAC
	const hmacNodejs = crypto.createHmac('sha256', SECRET_KEY);
	hmacNodejs.update(data);
	const nodejsSignature = hmacNodejs.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	const match = cryptoJSSignature === nodejsSignature;

	console.log(`crypto-js:  ${cryptoJSSignature}`);
	console.log(`Node.js:    ${nodejsSignature}`);
	console.log(`✅ Match:   ${match ? 'YES' : 'NO'}`);

	results.push({
		data,
		cryptoJSSignature,
		nodejsSignature,
		match
	});

	if (!match) {
		console.error('❌ MISMATCH DETECTED!');
		console.error('This indicates crypto-js and Node.js crypto produce different results');
		process.exit(1);
	}
}

console.log('\n' + '='.repeat(60));
console.log('📊 TEST 2: Full Encryption Cycle\n');
console.log('-'.repeat(60));

interface SecurePipePayload {
	data: string;
	signature: string;
	timestamp: number;
}

const TEST_QUERIES = [
	'id: count()',
	'createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)',
	'masterMachine.userMaintenceMachine.some.nik: equals string(2019020064)',
];

function toBase64UrlSafe(str: string): string {
	return Buffer.from(str, 'utf8')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function fromBase64UrlSafe(base64UrlSafe: string): string {
	let base64 = base64UrlSafe
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	return Buffer.from(base64, 'base64').toString('utf8');
}

function encodeWithCryptoJS(query: string, secretKey: string): string {
	const encodedData = toBase64UrlSafe(query);

	// Use crypto-js
	const hmac = CryptoJS.HmacSHA256(encodedData, secretKey);
	const signature = hmac.toString(CryptoJS.enc.Base64)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	const payload: SecurePipePayload = {
		data: encodedData,
		signature: signature,
		timestamp: Date.now(),
	};

	return toBase64UrlSafe(JSON.stringify(payload));
}

function decodeWithNodeJS(encodedQuery: string, secretKey: string): string {
	const payloadJson = fromBase64UrlSafe(encodedQuery);
	const payload: SecurePipePayload = JSON.parse(payloadJson);

	// Verify signature with Node.js crypto
	const hmac = crypto.createHmac('sha256', secretKey);
	hmac.update(payload.data);
	const expectedSignature = hmac.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

	if (payload.signature !== expectedSignature) {
		throw new Error('Invalid HMAC signature');
	}

	return fromBase64UrlSafe(payload.data);
}

for (const query of TEST_QUERIES) {
	console.log(`\nOriginal: ${query}`);

	// Encode with crypto-js (simulating frontend HTTP)
	const encoded = encodeWithCryptoJS(query, SECRET_KEY);
	console.log(`Encoded:  ${encoded.substring(0, 60)}...`);

	try {
		// Decode with Node.js crypto (simulating backend)
		const decoded = decodeWithNodeJS(encoded, SECRET_KEY);
		console.log(`Decoded:  ${decoded}`);

		const match = query === decoded;
		console.log(`✅ Round-trip: ${match ? 'SUCCESS' : 'FAILED'}`);

		if (!match) {
			console.error('❌ Round-trip failed!');
			console.error('Expected:', query);
			console.error('Got:', decoded);
			process.exit(1);
		}
	} catch (error: any) {
		console.error(`❌ Decoding failed: ${error.message}`);
		process.exit(1);
	}
}

console.log('\n' + '='.repeat(60));
console.log('🧪 TEST 3: Cross-Library Verification\n');
console.log('-'.repeat(60));

// Test that both libraries can verify each other's signatures
const testQuery = 'id: count()';
const encodedData = toBase64UrlSafe(testQuery);

console.log(`\nTest Query: ${testQuery}`);
console.log(`Encoded Data: ${encodedData}`);

// Generate signature with crypto-js
const cryptoJSSig = CryptoJS.HmacSHA256(encodedData, SECRET_KEY)
	.toString(CryptoJS.enc.Base64)
	.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=+$/, '');

// Verify with Node.js
const nodejsHmac = crypto.createHmac('sha256', SECRET_KEY);
nodejsHmac.update(encodedData);
const nodejsSig = nodejsHmac.digest('base64')
	.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=+$/, '');

const canVerify = crypto.timingSafeEqual(
	Buffer.from(cryptoJSSig),
	Buffer.from(nodejsSig)
);

console.log(`crypto-js signature: ${cryptoJSSig}`);
console.log(`Node.js signature:   ${nodejsSig}`);
console.log(`✅ Verification:     ${canVerify ? 'SUCCESS' : 'FAILED'}`);

if (!canVerify) {
	console.error('❌ Cross-library verification failed!');
	process.exit(1);
}

// ============================================
// SUMMARY
// ============================================

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED!');
console.log('='.repeat(60));

const allMatch = results.every(r => r.match);

console.log('\n📊 Test Summary:');
console.log(`✓ HMAC Compatibility: ${allMatch ? 'PASS' : 'FAIL'}`);
console.log(`✓ Full Encryption Cycle: PASS`);
console.log(`✓ Cross-Library Verification: PASS`);
console.log(`✓ Total Tests: ${results.length}`);
console.log(`✓ All Signatures Match: ${allMatch ? 'YES' : 'NO'}`);

console.log('\n📌 Conclusion:');
console.log('✅ crypto-js is 100% compatible with Node.js crypto module');
console.log('✅ Frontend (HTTP) with crypto-js can communicate with Backend (Node.js)');
console.log('✅ HMAC signatures are identical across both libraries');

console.log('\n🎉 Ready for production use!\n');
process.exit(0);