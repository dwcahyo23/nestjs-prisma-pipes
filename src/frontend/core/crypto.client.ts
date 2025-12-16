// src/frontend/core/crypto.client.ts
// SOLUTION: Use crypto-js library for HTTP compatibility
// This ensures 100% compatibility with Node.js crypto

import CryptoJS from 'crypto-js';

interface SecurePipePayload {
	data: string;
	signature: string;
	timestamp: number;
}

// ============================================
// Environment Detection
// ============================================
const IS_SECURE_CONTEXT = typeof window !== 'undefined' && window.isSecureContext;
const HAS_WEB_CRYPTO = typeof crypto !== 'undefined' && !!crypto.subtle;
const FORCE_PURE_JS = !IS_SECURE_CONTEXT;

if (FORCE_PURE_JS && typeof window !== 'undefined') {
	console.warn('⚠️ Running in non-secure context (HTTP), using crypto-js library');
}

// ============================================
// Base64 URL-Safe Encoding/Decoding
// ============================================

function toBase64UrlSafe(str: string): string {
	const utf8Bytes = new TextEncoder().encode(str);
	let binary = '';
	utf8Bytes.forEach(byte => {
		binary += String.fromCharCode(byte);
	});
	const base64 = btoa(binary);
	return base64
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
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

// ============================================
// HMAC Generation with crypto-js (for HTTP)
// ============================================

/**
 * Generate HMAC using crypto-js library
 * ✅ 100% compatible with Node.js crypto.createHmac()
 */
function generateHmacCryptoJS(data: string, secretKey: string): string {
	// Generate HMAC-SHA256
	const hmac = CryptoJS.HmacSHA256(data, secretKey);

	// Convert to base64
	const base64 = hmac.toString(CryptoJS.enc.Base64);

	// Convert to base64url (URL-safe)
	return base64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/**
 * Generate HMAC using Web Crypto API (for HTTPS)
 * ✅ Native browser implementation
 */
async function generateHmacWebCrypto(data: string, secretKey: string): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secretKey);
	const dataBuffer = encoder.encode(data);

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);

	// Convert to base64url
	const bytes = new Uint8Array(signature);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/**
 * Auto-detect and use appropriate HMAC method
 */
async function generateHmacSignature(data: string, secretKey: string): Promise<string> {
	// Use crypto-js if in non-secure context (HTTP)
	if (FORCE_PURE_JS) {
		return generateHmacCryptoJS(data, secretKey);
	}

	// Try Web Crypto API first (faster on HTTPS)
	if (HAS_WEB_CRYPTO) {
		try {
			return await generateHmacWebCrypto(data, secretKey);
		} catch (error) {
			console.warn('⚠️ Web Crypto API failed, falling back to crypto-js');
			return generateHmacCryptoJS(data, secretKey);
		}
	}

	// Fallback to crypto-js
	return generateHmacCryptoJS(data, secretKey);
}

// ============================================
// Main Export
// ============================================

/**
 * Encode query with HMAC signature
 * Works on both HTTP and HTTPS
 */
export async function encodeClientPipeQuery(
	query: string,
	secretKey: string
): Promise<string> {
	const encodedData = toBase64UrlSafe(query);
	const signature = await generateHmacSignature(encodedData, secretKey);

	const payload: SecurePipePayload = {
		data: encodedData,
		signature: signature,
		timestamp: Date.now(),
	};

	const payloadJson = JSON.stringify(payload);
	return toBase64UrlSafe(payloadJson);
}

/**
 * Decode query (for local verification)
 */
export async function decodeClientPipeQuery(
	encodedQuery: string,
	secretKey: string
): Promise<string> {
	const payloadJson = fromBase64UrlSafe(encodedQuery);
	const payload: SecurePipePayload = JSON.parse(payloadJson);

	// Verify signature
	const expectedSignature = await generateHmacSignature(payload.data, secretKey);

	if (payload.signature !== expectedSignature) {
		throw new Error('Invalid HMAC signature');
	}

	return fromBase64UrlSafe(payload.data);
}

// ============================================
// Utility exports
// ============================================

export function isCryptoAvailable(): {
	isSecureContext: boolean;
	hasWebCrypto: boolean;
	usingCryptoJS: boolean;
	mode: 'web-crypto' | 'crypto-js' | 'hybrid';
} {
	let mode: 'web-crypto' | 'crypto-js' | 'hybrid' = 'hybrid';

	if (FORCE_PURE_JS) {
		mode = 'crypto-js';
	} else if (HAS_WEB_CRYPTO) {
		mode = 'web-crypto';
	}

	return {
		isSecureContext: IS_SECURE_CONTEXT,
		hasWebCrypto: HAS_WEB_CRYPTO,
		usingCryptoJS: FORCE_PURE_JS,
		mode
	};
}

/**
 * Test HMAC compatibility with backend
 */
export async function testHmacCompatibility(
	secretKey: string,
	testData: string
): Promise<{
	data: string;
	encoded: string;
	signature: string;
	mode: string;
}> {
	const encoded = toBase64UrlSafe(testData);
	const signature = await generateHmacSignature(encoded, secretKey);
	const mode = FORCE_PURE_JS ? 'crypto-js (HTTP)' : 'Web Crypto API (HTTPS)';

	console.log('🧪 Test HMAC Compatibility:');
	console.log('Input:', testData);
	console.log('Encoded:', encoded);
	console.log('Signature:', signature);
	console.log('Mode:', mode);

	return { data: testData, encoded, signature, mode };
}

/**
 * Compare signatures between different methods
 */
export async function compareSignatures(
	data: string,
	secretKey: string
): Promise<{
	cryptoJS: string;
	webCrypto: string | null;
	match: boolean;
}> {
	const cryptoJSSig = generateHmacCryptoJS(data, secretKey);

	let webCryptoSig: string | null = null;
	let match = false;

	if (HAS_WEB_CRYPTO) {
		try {
			webCryptoSig = await generateHmacWebCrypto(data, secretKey);
			match = cryptoJSSig === webCryptoSig;
		} catch (error) {
			console.warn('Web Crypto API not available');
		}
	}

	console.log('🔍 Signature Comparison:');
	console.log('crypto-js:', cryptoJSSig);
	console.log('Web Crypto:', webCryptoSig || 'N/A');
	console.log('Match:', match ? '✅' : '❌');

	return { cryptoJS: cryptoJSSig, webCrypto: webCryptoSig, match };
}