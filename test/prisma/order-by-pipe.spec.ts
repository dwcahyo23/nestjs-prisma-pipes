import { Test } from '@nestjs/testing';
import OrderByPipe from '../../src/prisma/order-by.pipe';

describe('Order by pipe', () => {
	let pipe: OrderByPipe;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [OrderByPipe],
		}).compile();

		pipe = moduleRef.get<OrderByPipe>(OrderByPipe);
	});

	it('should convert value like "name:asc, address:desc" to { name: "asc", address: "desc" }', () => {
		const value = 'name:asc, address:desc';
		const result = pipe.transform(value);
		expect(result).toEqual({
			address: 'desc',
			name: 'asc',
		});
	});

	it('should convert values correctly when input contains a space before "asc" or "desc" ("name: asc, address: desc")', () => {
		const value = 'name: asc, address: desc';
		const result = pipe.transform(value);
		expect(result).toEqual({
			name: 'asc',
			address: 'desc',
		});
	});

	it('should return undefined if value is empty', () => {
		const value = '';
		const result = pipe.transform(value);
		expect(result).toBeUndefined();
	});

	it('should return values to lower case', () => {
		expect.assertions(1);
		const value = 'name:ASC, address:DESC';
		const result = pipe.transform(value);
		expect(result).toEqual({
			address: 'desc',
			name: 'asc',
		});
	});

	it('should throw an error if params not arc & desc', () => {
		const value = 'name:name, address:address';
		try {
			pipe.transform(value);
		} catch (e) {
			expect(e).toBeTruthy();
		}
	});

	it('should handle single-level nested key like "user.name:asc"', () => {
		const value = 'user.name:asc';
		const result = pipe.transform(value);
		expect(result).toEqual({
			user: {
				name: 'asc',
			},
		});
	});

	it('should handle multi-level nested key like "user.profile.name:desc"', () => {
		const value = 'user.profile.name:desc';
		const result = pipe.transform(value);
		expect(result).toEqual({
			user: {
				profile: {
					name: 'desc',
				},
			},
		});
	});

	it('should handle multiple nested keys like "user.profile.name:asc,posts.comments.createdAt:desc"', () => {
		const value = 'user.profile.name:asc,posts.comments.createdAt:desc';
		const result = pipe.transform(value);
		expect(result).toEqual({
			user: {
				profile: {
					name: 'asc',
				},
			},
			posts: {
				comments: {
					createdAt: 'desc',
				},
			},
		});
	});

	it('should throw error on conflicting nested key', () => {
		// first rule makes user = "asc", second rule tries to make it an object
		const value = 'user:asc,user.profile.name:desc';
		expect(() => pipe.transform(value)).toThrow();
	});


	it('should be defined', () => {
		expect(pipe).toBeDefined();
	});
});
