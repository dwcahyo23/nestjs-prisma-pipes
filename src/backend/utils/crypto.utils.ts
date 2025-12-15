import { createHmac } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { getPipesSecurityConfig } from '../config/security.config';

interface SecurePipePayload {
	data: string;
	signature: string;
	timestamp: number;
}

function generateSignature(data: string, secretKey: string): string {
	return createHmac('sha256', secretKey)
		.update(data)
		.digest('base64url');
}

function verifySignature(data: string, signature: string, secretKey: string): boolean {
	const expectedSignature = generateSignature(data, secretKey);
	return signature === expectedSignature;
}

export function encodePipeQuery(query: string): string {
	const config = getPipesSecurityConfig();

	if (!config.enabled) {
		return query;
	}

	const encodedData = Buffer.from(query, 'utf-8').toString('base64url');

	const payload: SecurePipePayload = {
		data: encodedData,
		signature: generateSignature(encodedData, config.secretKey),
		timestamp: Date.now(),
	};

	return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

export function decodePipeQuery(encodedQuery: string, clientIp?: string): string {
	const config = getPipesSecurityConfig();

	if (!config.enabled) {
		return encodedQuery;
	}

	// Check IP whitelist
	if (config.whitelistedIPs && config.whitelistedIPs.length > 0 && clientIp) {
		const normalizedIp = clientIp === '::1' ? '127.0.0.1' : clientIp;
		const isWhitelisted = config.whitelistedIPs.some(
			ip => ip === normalizedIp || ip === clientIp
		);

		if (isWhitelisted && !isSecureQuery(encodedQuery)) {
			console.log(`✅ Plaintext allowed for whitelisted IP: ${clientIp}`);
			return encodedQuery;
		}
	}

	try {
		const payloadJson = Buffer.from(encodedQuery, 'base64url').toString('utf-8');
		const payload: SecurePipePayload = JSON.parse(payloadJson);

		if (!payload.data || !payload.signature || !payload.timestamp) {
			throw new Error('Invalid payload structure');
		}

		if (!verifySignature(payload.data, payload.signature, config.secretKey)) {
			throw new BadRequestException('Invalid query signature - tampering detected');
		}

		const maxAge = config.maxAge || 3600000;
		const age = Date.now() - payload.timestamp;

		if (age > maxAge) {
			throw new BadRequestException(`Query expired (age: ${Math.round(age / 1000)}s)`);
		}

		if (age < 0) {
			throw new BadRequestException('Query timestamp is in the future');
		}

		return Buffer.from(payload.data, 'base64url').toString('utf-8');

	} catch (error) {
		if (config.allowPlaintext && !isSecureQuery(encodedQuery)) {
			console.log('⚠️  Using plaintext query (development mode)');
			return encodedQuery;
		}

		if (error instanceof BadRequestException) {
			throw error;
		}

		throw new BadRequestException('Invalid secure query format');
	}
}

export function isSecureQuery(query: string): boolean {
	try {
		const decoded = Buffer.from(query, 'base64url').toString('utf-8');
		const payload = JSON.parse(decoded);
		return 'data' in payload && 'signature' in payload && 'timestamp' in payload;
	} catch {
		return false;
	}
}

export function buildSecureUrl(
	baseUrl: string,
	params: Record<string, string | undefined>
): string {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value) {
			searchParams.append(key, encodePipeQuery(value));
		}
	}

	const queryString = searchParams.toString();
	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}