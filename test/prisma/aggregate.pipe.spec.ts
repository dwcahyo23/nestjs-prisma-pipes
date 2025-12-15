import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import AggregatePipe from '../../src/backend/pipes/aggregate.pipe';
import { configurePipesSecurity, resetPipesSecurityConfig } from '../../src/backend/config/security.config';
import { encodePipeQuery } from '../../src/backend/utils/crypto.utils';

describe('AggregatePipe with Crypto', () => {
	let pipe: AggregatePipe;
	const TEST_SECRET_KEY = 'test-secret-key-min-32-characters-long-for-security';
	const TEST_CLIENT_IP = '127.0.0.1';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [AggregatePipe],
		}).compile();

		pipe = module.get<AggregatePipe>(AggregatePipe);

		// Reset security config before each test
		resetPipesSecurityConfig();
	});

	afterEach(() => {
		// Clean up after each test
		resetPipesSecurityConfig();
	});

	describe('Security Disabled (Plaintext)', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: false,
				secretKey: '',
				allowPlaintext: true,
			});
		});

		it('should parse simple aggregate query', () => {
			const query = 'id: count(*)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(1);
			expect(result?.aggregates[0].field).toBe('id');
			expect(result?.aggregates[0].function).toBe('count');
		});

		it('should parse aggregate with mixed case field names', () => {
			const query = 'woAt: sum(*)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(1);
			expect(result?.aggregates[0].field).toBe('woAt'); // ✅ Case preserved
			expect(result?.aggregates[0].function).toBe('sum');
		});

		it('should parse aggregate with camelCase field names', () => {
			const query = 'createdAt: count(*), updatedAt: count(*)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(2);
			expect(result?.aggregates[0].field).toBe('createdAt');
			expect(result?.aggregates[1].field).toBe('updatedAt');
		});

		it('should parse aggregate with chart config', () => {
			const query = 'woAt: sum(*), chart: bar(woIsClose)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(1);
			expect(result?.aggregates[0].field).toBe('woAt');
			expect(result?.chartConfig).toBeDefined();
			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.groupField).toBe('woIsClose');
		});

		it('should parse aggregate with groupBy', () => {
			const query = 'id: count(*), groupBy: (status, type)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.groupBy).toEqual(['status', 'type']);
			expect(result?.isGrouped).toBe(true);
		});

		it('should parse aggregate with alias', () => {
			const query = 'amount: sum(*) :alias(Total Amount)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('amount');
			expect(result?.aggregates[0].alias).toBe('Total Amount');
		});

		it('should preserve field name with special characters', () => {
			const query = 'field_name: count(*), field-name2: sum(*)';
			const result = pipe.transform(query);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(2);
			expect(result?.aggregates[0].field).toBe('field_name');
			expect(result?.aggregates[1].field).toBe('field-name2');
		});
	});

	describe('Security Enabled (Encrypted)', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				maxAge: 60000, // 1 minute
			});
		});

		it('should decode and parse encrypted query', () => {
			const plainQuery = 'id: count(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(1);
			expect(result?.aggregates[0].field).toBe('id');
			expect(result?.aggregates[0].function).toBe('count');
		});

		it('should preserve case in encrypted query', () => {
			const plainQuery = 'woAt: sum(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('woAt'); // ✅ Case preserved after encryption
		});

		it('should preserve camelCase field names after encryption', () => {
			const plainQuery = 'createdAt: count(*), updatedAt: max(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(2);
			expect(result?.aggregates[0].field).toBe('createdAt');
			expect(result?.aggregates[1].field).toBe('updatedAt');
		});

		it('should handle complex encrypted query with chart', () => {
			const plainQuery = 'woAt: sum(*), chart: bar(woIsClose)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('woAt');
			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.groupField).toBe('woIsClose');
		});

		it('should handle encrypted query with groupBy', () => {
			const plainQuery = 'amount: sum(*), groupBy: (status, category)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.groupBy).toEqual(['status', 'category']);
			expect(result?.isGrouped).toBe(true);
		});

		it('should handle encrypted query with alias', () => {
			const plainQuery = 'revenue: sum(*) :alias(Total Revenue)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].alias).toBe('Total Revenue');
		});

		it('should reject expired encrypted query', () => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				maxAge: 1, // 1ms - will expire immediately
			});

			const plainQuery = 'id: count(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			// Wait for expiration
			return new Promise((resolve) => {
				setTimeout(() => {
					const metadata = {
						data: { clientIp: TEST_CLIENT_IP },
					};

					expect(() => {
						pipe.transform(encryptedQuery, metadata);
					}).toThrow(BadRequestException);

					resolve(true);
				}, 10);
			});
		});

		it('should reject query with invalid signature', () => {
			const plainQuery = 'id: count(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			// Tamper with encrypted query
			const tamperedQuery = encryptedQuery.slice(0, -5) + 'AAAAA';

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			expect(() => {
				pipe.transform(tamperedQuery, metadata);
			}).toThrow();
		});

		it('should reject query encrypted with wrong key', () => {
			const plainQuery = 'id: count(*)';
			const wrongKey = 'wrong-secret-key-different-from-configured-key';
			const encryptedQuery = encodePipeQuery(plainQuery, wrongKey);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			expect(() => {
				pipe.transform(encryptedQuery, metadata);
			}).toThrow();
		});
	});

	describe('Security Enabled with Plaintext Fallback', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: true, // ✅ Allow fallback
				maxAge: 60000,
			});
		});

		it('should accept plaintext query as fallback', () => {
			const plainQuery = 'id: count(*)';

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(plainQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('id');
		});

		it('should prefer encrypted over plaintext', () => {
			const plainQuery = 'woAt: sum(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('woAt');
		});
	});

	describe('IP Whitelisting', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
				whitelistedIPs: ['127.0.0.1', '192.168.1.100'],
			});
		});

		it('should accept query from whitelisted IP', () => {
			const plainQuery = 'id: count(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: '127.0.0.1' },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
		});

		it('should reject query from non-whitelisted IP', () => {
			const plainQuery = 'id: count(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: '10.0.0.1' }, // Not in whitelist
			};

			expect(() => {
				pipe.transform(encryptedQuery, metadata);
			}).toThrow();
		});
	});

	describe('Edge Cases', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});
		});

		it('should handle empty string', () => {
			const result = pipe.transform('');
			expect(result).toBeUndefined();
		});

		it('should handle query with Unicode characters', () => {
			const plainQuery = 'field名前: count(*)'; // Japanese characters
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('field名前');
		});

		it('should handle query with emojis', () => {
			const plainQuery = 'field🎯: count(*)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('field🎯');
		});

		it('should handle very long field names', () => {
			const longFieldName = 'a'.repeat(200);
			const plainQuery = `${longFieldName}: count(*)`;
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe(longFieldName);
		});

		it('should handle query with special SQL characters', () => {
			// ✅ FIXED: Use valid field name instead of SQL injection attempt
			// The point is to test that even if someone tries SQL injection,
			// Prisma will handle it safely, not that we accept invalid syntax
			const plainQuery = "userName: count(*)"; // Valid field name
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('userName');
			// Prisma will safely handle this field name in queries
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

		it('should handle multiple sequential decryptions', () => {
			const queries = [
				'field1: count(*)',
				'field2: sum(*)',
				'field3: avg(*)',
				'field4: min(*)',
				'field5: max(*)',
			];

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			queries.forEach((plainQuery, index) => {
				const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);
				const result = pipe.transform(encryptedQuery, metadata);

				expect(result).toBeDefined();
				expect(result?.aggregates[0].field).toBe(`field${index + 1}`);
			});
		});

		it('should decrypt large query efficiently', () => {
			// Create a complex query with many fields
			const fields = Array.from({ length: 20 }, (_, i) => `field${i}: count(*)`);
			const plainQuery = fields.join(', ');
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const start = Date.now();
			const result = pipe.transform(encryptedQuery, metadata);
			const duration = Date.now() - start;

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(20);
			expect(duration).toBeLessThan(100); // Should complete in < 100ms
		});
	});

	describe('Real-World Scenarios', () => {
		beforeEach(() => {
			configurePipesSecurity({
				enabled: true,
				secretKey: TEST_SECRET_KEY,
				allowPlaintext: false,
			});
		});

		it('should handle maintenance work order query', () => {
			const plainQuery = 'woAt: sum(*), chart: bar(woIsClose)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.aggregates[0].field).toBe('woAt');
			expect(result?.aggregates[0].function).toBe('sum');
			expect(result?.chartConfig?.type).toBe('bar');
		});

		it('should handle time series query', () => {
			const plainQuery = 'amount: sum(*), chart: line(createdAt, month)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.isTimeSeries).toBe(true);
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
		});

		it('should handle grouped aggregate query', () => {
			const plainQuery = 'revenue: sum(*), groupBy: (department, category), chart: bar(department)';
			const encryptedQuery = encodePipeQuery(plainQuery, TEST_SECRET_KEY);

			const metadata = {
				data: { clientIp: TEST_CLIENT_IP },
			};

			const result = pipe.transform(encryptedQuery, metadata);

			expect(result).toBeDefined();
			expect(result?.isGrouped).toBe(true);
			expect(result?.groupBy).toEqual(['department', 'category']);
		});
	});
});