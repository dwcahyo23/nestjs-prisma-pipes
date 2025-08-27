import { Test } from '@nestjs/testing';
import { IncludePipe } from '../../src/prisma/include.pipe';

describe('IncludeTransformPipe', () => {
	let pipe: IncludePipe;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [IncludePipe],
		}).compile();

		pipe = moduleRef.get<IncludePipe>(IncludePipe);
	});

	it('should return undefined if value is undefined', () => {
		expect(pipe.transform(undefined)).toBeUndefined();
	});

	it('should return undefined if value is empty string', () => {
		expect(pipe.transform('   ')).toBeUndefined();
	});

	it('should parse flat includes', () => {
		const result = pipe.transform('author,comments');
		expect(result).toEqual({
			author: true,
			comments: true,
		});
	});

	it('should parse nested includes', () => {
		const result = pipe.transform('comments.author');
		expect(result).toEqual({
			comments: { include: { author: true } },
		});
	});

	it('should parse select fields', () => {
		const result = pipe.transform('author.select:(id,name)');
		expect(result).toEqual({
			author: { select: { id: true, name: true } },
		});
	});

	it('should parse nested includes with select', () => {
		const result = pipe.transform('comments.author.select:(id)');
		expect(result).toEqual({
			comments: {
				include: {
					author: { select: { id: true } },
				},
			},
		});
	});

	it('should parse mixed includes and selects', () => {
		const result = pipe.transform(
			'author.select:(id,name),comments,comments.author.select:(id)'
		);
		expect(result).toEqual({
			author: { select: { id: true, name: true } },
			comments: {
				include: {
					author: { select: { id: true } },
				},
			},
		});
	});
});
