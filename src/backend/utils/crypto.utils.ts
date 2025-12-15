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
// Main Decode Function - Fixed
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

	try {
		// ✅ CRITICAL FIX: Use proper UTF-8 decoding
		const payloadJson = fromBase64UrlSafe(encodedQuery);

		// ✅ Debug log
		// console.log('🔓 Decoding payload JSON length:', payloadJson.length);

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

		// ✅ Decode the actual data
		const decodedQuery = fromBase64UrlSafe(payload.data);

		// ✅ Debug log
		// console.log('🔓 Decoded query:', decodedQuery);

		return decodedQuery;

	} catch (error) {
		// If plaintext is allowed as fallback
		if (config.allowPlaintext) {
			console.warn('⚠️ Failed to decode secure query, using plaintext fallback');
			console.warn('⚠️ Error:', error);
			return encodedQuery;
		}

		console.error('❌ Failed to decode secure query:', error);
		throw new Error(`Invalid or expired query: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
	try {
		const payloadJson = fromBase64UrlSafe(query);
		const payload = JSON.parse(payloadJson);
		return !!(payload.data && payload.signature && payload.timestamp);
	} catch {
		return false;
	}
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