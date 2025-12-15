// src/backend/utils/crypto.utils.ts

import * as crypto from 'crypto';
import { getPipesSecurityConfig } from '../config/security.config';

interface SecurePipePayload {
	data: string;
	signature: string;
	timestamp: number;
}

// ============================================
// Base64 URL-Safe Decoding (Backend)
// ============================================

/**
 * Convert base64 URL-safe format back to string
 * CRITICAL: Must match frontend encoding exactly
 */
function fromBase64UrlSafe(base64UrlSafe: string): string {
	// Restore standard base64
	let base64 = base64UrlSafe
		.replace(/-/g, '+')
		.replace(/_/g, '/');

	// Add padding if needed
	while (base64.length % 4) {
		base64 += '=';
	}

	// Decode base64 to Buffer (Node.js)
	const buffer = Buffer.from(base64, 'base64');

	// Decode as UTF-8 string
	return buffer.toString('utf8');
}

/**
 * Convert string to base64 URL-safe format (for encoding on backend if needed)
 */
function toBase64UrlSafe(str: string): string {
	// Convert string to Buffer with UTF-8 encoding
	const buffer = Buffer.from(str, 'utf8');

	// Convert to base64
	const base64 = buffer.toString('base64');

	// Make URL-safe
	return base64
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

// ============================================
// HMAC Generation/Validation
// ============================================

function generateHmacSignature(data: string, secretKey: string): string {
	const hmac = crypto.createHmac('sha256', secretKey);
	hmac.update(data);
	return hmac.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function verifyHmacSignature(
	data: string,
	signature: string,
	secretKey: string
): boolean {
	const expectedSignature = generateHmacSignature(data, secretKey);
	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature)
	);
}

// ============================================
// IP Validation
// ============================================

function isIpWhitelisted(clientIp: string | undefined, whitelistedIPs: string[]): boolean {
	if (!whitelistedIPs || whitelistedIPs.length === 0) {
		return true; // No whitelist = allow all
	}

	if (!clientIp) {
		return false; // No IP provided but whitelist exists
	}

	return whitelistedIPs.includes(clientIp);
}

// ============================================
// Query Type Detection
// ============================================

/**
 * Check if a query string is encrypted/encoded or plaintext
 */
function isEncryptedQuery(query: string): boolean {
	// Encrypted queries should be base64url (only alphanumeric, -, _)
	// and should decode to a JSON with data, signature, timestamp
	const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

	if (!base64UrlPattern.test(query)) {
		return false; // Contains invalid characters for base64url
	}

	try {
		const payloadJson = fromBase64UrlSafe(query);
		const payload = JSON.parse(payloadJson);

		// Valid encrypted payload must have these fields
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

// ============================================
// Main Decode Function - Fixed with Auto-Detection
// ============================================

export function decodePipeQuery(
	encodedQuery: string,
	clientIp?: string
): string {
	const config = getPipesSecurityConfig();

	// If security is disabled, return as-is
	if (!config.enabled) {
		return encodedQuery;
	}

	// ✅ AUTO-DETECT: Check if query is encrypted or plaintext
	const isEncrypted = isEncryptedQuery(encodedQuery);

	// If plaintext detected
	if (!isEncrypted) {
		if (config.allowPlaintext) {
			console.warn('⚠️ Plaintext query detected (encryption not enabled on client)');
			return encodedQuery;
		} else {
			throw new Error(
				'Plaintext queries not allowed. Please enable encryption on the client side.'
			);
		}
	}

	// ✅ Encrypted query - proceed with decryption
	try {
		const payloadJson = fromBase64UrlSafe(encodedQuery);
		const payload: SecurePipePayload = JSON.parse(payloadJson);

		// Validate timestamp
		if (config.maxAge) {
			const age = Date.now() - payload.timestamp;
			if (age > config.maxAge) {
				throw new Error(`Query expired (age: ${age}ms, max: ${config.maxAge}ms)`);
			}
		}

		// Validate IP if whitelist exists
		if (config.whitelistedIPs && config.whitelistedIPs.length > 0) {
			if (!isIpWhitelisted(clientIp, config.whitelistedIPs)) {
				throw new Error(`IP ${clientIp} not whitelisted`);
			}
		}

		// Verify HMAC signature
		const isValid = verifyHmacSignature(
			payload.data,
			payload.signature,
			config.secretKey
		);

		if (!isValid) {
			throw new Error('Invalid HMAC signature');
		}

		// Decode the actual data
		const decodedQuery = fromBase64UrlSafe(payload.data);

		return decodedQuery;

	} catch (error) {
		// Only use plaintext fallback if explicitly allowed
		if (config.allowPlaintext) {
			console.warn('⚠️ Failed to decode encrypted query, using plaintext fallback');
			console.warn('⚠️ Error:', error);
			return encodedQuery;
		}

		console.error('❌ Failed to decode encrypted query:', error);
		throw new Error(
			`Invalid or expired query: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

// ============================================
// Encode Function (for backend if needed)
// ============================================

export function encodePipeQuery(
	query: string,
	secretKey: string
): string {
	const encodedData = toBase64UrlSafe(query);
	const signature = generateHmacSignature(encodedData, secretKey);

	const payload: SecurePipePayload = {
		data: encodedData,
		signature: signature,
		timestamp: Date.now(),
	};

	const payloadJson = JSON.stringify(payload);
	return toBase64UrlSafe(payloadJson);
}

// ============================================
// Security Validation
// ============================================

export function isSecureQuery(query: string): boolean {
	return isEncryptedQuery(query);
}

export function buildSecureUrl(
	baseUrl: string,
	params: Record<string, string>,
	secretKey: string
): string {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value) {
			const encoded = encodePipeQuery(value, secretKey);
			searchParams.append(key, encoded);
		}
	}

	const queryString = searchParams.toString();
	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}