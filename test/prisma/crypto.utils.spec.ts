import { encodePipeQuery, decodePipeQuery, isSecureQuery } from '../../src/backend/utils/crypto.utils';
import { configurePipesSecurity, resetPipesSecurityConfig } from '../../src/backend/config/security.config';

describe('Crypto Utils', () => {
	const TEST_SECRET_KEY = 'test-secret-key-min-32-characters-long-for-security';
	const TEST_CLIENT_IP = '127.0.0.1';

	beforeEach(() => {
		resetPipesSecurityConfig();
	});

	afterEach(() => {
		resetPipesSecurityConfig();
	});

	describe('encodePipeQuery & decodePipeQuery', () => {
		it('should encode and decode simple string', () => {
			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
			expect(decoded).toBe(original);
		});

		it('should preserve case sensitivity', () => {
			const testCases = [
				'woAt: sum(*)',
				'createdAt: count(*)',
				'UpdatedAt: max(*)',
				'UPPERCASE: min(*)',
				'lowercase: avg(*)',
				'MixedCaSe: sum(*)',
			];

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			testCases.forEach(testCase => {
				const encoded = encodePipeQuery(testCase, TEST_SECRET_KEY);
				const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
				expect(decoded).toBe(testCase);
			});
		});

		it('should preserve special characters', () => {
			const testCases = [
				'field_name: count(*)',
				'field-name: sum(*)',
				'field.name: avg(*)',
				'field:name: max(*)',
				'field,name: min(*)',
				'field(name): count(*)',
			];

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			testCases.forEach(testCase => {
				const encoded = encodePipeQuery(testCase, TEST_SECRET_KEY);
				const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
				expect(decoded).toBe(testCase);
			});
		});

		it('should preserve Unicode characters', () => {
			const testCases = [
				'フィールド: count(*)', // Japanese
				'字段: sum(*)', // Chinese
				'поле: avg(*)', // Russian
				'حقل: max(*)', // Arabic
				'필드: min(*)', // Korean
			];

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			testCases.forEach(testCase => {
				const encoded = encodePipeQuery(testCase, TEST_SECRET_KEY);
				const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
				expect(decoded).toBe(testCase);
			});
		});

		it('should preserve emojis', () => {
			const testCases = [
				'field🎯: count(*)',
				'field❤️: sum(*)',
				'field🚀: avg(*)',
			];

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			testCases.forEach(testCase => {
				const encoded = encodePipeQuery(testCase, TEST_SECRET_KEY);
				const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
				expect(decoded).toBe(testCase);
			});
		});

		it('should handle long strings', () => {
			const longString = 'field: count(*), '.repeat(100);

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			const encoded = encodePipeQuery(longString, TEST_SECRET_KEY);
			const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
			expect(decoded).toBe(longString);
		});

		it('should handle empty string', () => {
			const original = '';

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);
			const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
			expect(decoded).toBe(original);
		});

		it('should handle whitespace', () => {
			const testCases = [
				'  leading spaces: count(*)',
				'trailing spaces: count(*)  ',
				'  both sides  : count(*)',
				'inner   spaces: count(*)',
				'\ttab: count(*)',
				'newline\n: count(*)',
			];

			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});

			testCases.forEach(testCase => {
				const encoded = encodePipeQuery(testCase, TEST_SECRET_KEY);
				const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
				expect(decoded).toBe(testCase);
			});
		});
	});

	describe('HMAC Signature Verification', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});
		});

		it('should reject tampered data', () => {
			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			// Tamper with the encoded string
			const tampered = encoded.slice(0, -10) + 'AAAAAAAAAA';

			expect(() => {
				decodePipeQuery(tampered, TEST_CLIENT_IP);
			}).toThrow();
		});

		it('should reject query with wrong secret key', () => {
			const original = 'id: count(*)';
			const wrongKey = 'wrong-secret-key-completely-different-value';
			const encoded = encodePipeQuery(original, wrongKey);

			expect(() => {
				decodePipeQuery(encoded, TEST_CLIENT_IP);
			}).toThrow();
		});

		it('should reject replayed query after key rotation', () => {
			const original = 'id: count(*)';
			const oldKey = 'old-secret-key-that-was-previously-used';
			const newKey = 'new-secret-key-after-rotation-occurred';

			const encoded = encodePipeQuery(original, oldKey);

			// Change the secret key (key rotation)
			configurePipesSecurity({
				enabled: true,
				secretKey: newKey,
				allowPlaintext: false,
			});

			expect(() => {
				decodePipeQuery(encoded, TEST_CLIENT_IP);
			}).toThrow();
		});
	});

	describe('Timestamp Validation', () => {
		it('should reject expired queries', async () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				maxAge: 100, // 100ms
			});

			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			// Wait for query to expire
			await new Promise(resolve => setTimeout(resolve, 150));

			expect(() => {
				decodePipeQuery(encoded, TEST_CLIENT_IP);
			}).toThrow(/expired/i);
		});

		it('should accept fresh queries', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				maxAge: 60000, // 1 minute
			});

			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			// Decode immediately
			const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
			expect(decoded).toBe(original);
		});

		it('should accept queries with no maxAge set', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				maxAge: undefined, // No expiration
			});

			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			// Should work regardless of time passed
			const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
			expect(decoded).toBe(original);
		});
	});

	describe('IP Whitelisting', () => {
		it('should accept requests from whitelisted IPs', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				whitelistedIPs: ['127.0.0.1', '192.168.1.100'],
			});

			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			const decoded = decodePipeQuery(encoded, '127.0.0.1');
			expect(decoded).toBe(original);
		});

		it('should reject requests from non-whitelisted IPs', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				whitelistedIPs: ['127.0.0.1', '192.168.1.100'],
			});

			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			expect(() => {
				decodePipeQuery(encoded, '10.0.0.1'); // Not whitelisted
			}).toThrow(/not whitelisted/i);
		});

		it('should accept all IPs when whitelist is empty', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				whitelistedIPs: [],
			});

			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			const decoded = decodePipeQuery(encoded, '10.0.0.1');
			expect(decoded).toBe(original);
		});
	});

	describe('Plaintext Fallback', () => {
		it('should fallback to plaintext when enabled', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: true, // ✅ Enable fallback
			});

			const plaintext = 'id: count(*)';

			// Try to decode plaintext directly (will fail, then fallback)
			const decoded = decodePipeQuery(plaintext, TEST_CLIENT_IP);
			expect(decoded).toBe(plaintext);
		});

		it('should reject plaintext when fallback disabled', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false, // ❌ No fallback
			});

			const plaintext = 'id: count(*)';

			expect(() => {
				decodePipeQuery(plaintext, TEST_CLIENT_IP);
			}).toThrow();
		});
	});

	describe('Security Disabled', () => {
		it('should return plaintext when security disabled', () => {
			configurePipesSecurity({
				enabled: false,
				secretKey: '',
				allowPlaintext: true,
			});

			const plaintext = 'id: count(*)';
			const result = decodePipeQuery(plaintext, TEST_CLIENT_IP);

			expect(result).toBe(plaintext);
		});
	});

	describe('isSecureQuery', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});
		});

		it('should identify secure queries', () => {
			const original = 'id: count(*)';
			const encoded = encodePipeQuery(original, TEST_SECRET_KEY);

			expect(isSecureQuery(encoded)).toBe(true);
		});

		it('should identify plaintext queries', () => {
			const plaintext = 'id: count(*)';

			expect(isSecureQuery(plaintext)).toBe(false);
		});

		it('should identify invalid queries', () => {
			const invalid = 'not-a-valid-base64-string!!!';

			expect(isSecureQuery(invalid)).toBe(false);
		});
	});

	describe('Edge Cases and Error Handling', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});
		});

		it('should handle null and undefined', () => {
			expect(() => {
				decodePipeQuery(null as any, TEST_CLIENT_IP);
			}).toThrow();

			expect(() => {
				decodePipeQuery(undefined as any, TEST_CLIENT_IP);
			}).toThrow();
		});

		it('should handle invalid base64', () => {
			const invalid = 'not!!!valid!!!base64!!!';

			expect(() => {
				decodePipeQuery(invalid, TEST_CLIENT_IP);
			}).toThrow();
		});

		it('should handle malformed JSON in payload', () => {
			// Create a base64 string that decodes to invalid JSON
			const malformedPayload = Buffer.from('not valid json').toString('base64')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');

			expect(() => {
				decodePipeQuery(malformedPayload, TEST_CLIENT_IP);
			}).toThrow();
		});
	});

	describe('Performance', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});
		});

		it('should encode and decode efficiently', () => {
			const testString = 'field: count(*), '.repeat(50);

			const encodeStart = Date.now();
			const encoded = encodePipeQuery(testString, TEST_SECRET_KEY);
			const encodeTime = Date.now() - encodeStart;

			const decodeStart = Date.now();
			const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
			const decodeTime = Date.now() - decodeStart;

			expect(decoded).toBe(testString);
			expect(encodeTime).toBeLessThan(50); // < 50ms
			expect(decodeTime).toBeLessThan(50); // < 50ms
		});

		it('should handle multiple sequential operations', () => {
			const queries = Array.from({ length: 100 }, (_, i) => `field${i}: count(*)`);

			const start = Date.now();

			queries.forEach(query => {
				const encoded = encodePipeQuery(query, TEST_SECRET_KEY);
				const decoded = decodePipeQuery(encoded, TEST_CLIENT_IP);
				expect(decoded).toBe(query);
			});

			const duration = Date.now() - start;
			expect(duration).toBeLessThan(1000); // < 1 second for 100 operations
		});
	});
});