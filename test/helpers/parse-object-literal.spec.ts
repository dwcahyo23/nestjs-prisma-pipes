import parseObjectLiteral from '../../src/backend/helpers/parse-object-literal';

describe('parseObjectLiteral', () => {
	it('should parse a string with one key-value pair', () => {
		const input = 'a: 1';
		const expectedOutput = [['a', '1']];
		const actualOutput = parseObjectLiteral(input);
		expect(actualOutput).toEqual(expectedOutput);
	});

	it('should parse a string with multiple key-value pairs', () => {
		const input = 'a: 1, b: 2, c: 3';
		const expectedOutput = [['a', '1'], ['b', '2'], ['c', '3']];
		const actualOutput = parseObjectLiteral(input);
		expect(actualOutput).toEqual(expectedOutput);
	});

	it('should parse a string with a single-quoted value', () => {
		const input = 'a: \'1\'';
		const expectedOutput = [['a', '\'1\'']];
		const actualOutput = parseObjectLiteral(input);
		expect(actualOutput).toEqual(expectedOutput);
	});

	it('should parse a string with a double-quoted value', () => {
		const input = 'a: "1"';
		const expectedOutput = [['a', '"1"']];
		const actualOutput = parseObjectLiteral(input);
		expect(actualOutput).toEqual(expectedOutput);
	});

	it('should show output for groupBy query', () => {
		const input = 'qty: sum(), groupBy(category)';
		const result = parseObjectLiteral(input);

		console.log('Input:', input);
		console.log('Output:', JSON.stringify(result, null, 2));

		result.forEach(([key, val], index) => {
			console.log(`[${index}] key="${key}", val="${val}", val===undefined: ${val === undefined}`);
		});
	});

	it('should show output for multiple groupBy', () => {
		const input = 'qty: sum(), groupBy(category, region)';
		const result = parseObjectLiteral(input);

		console.log('\nInput:', input);
		console.log('Output:', JSON.stringify(result, null, 2));

		result.forEach(([key, val], index) => {
			console.log(`[${index}] key="${key}", val="${val}", val===undefined: ${val === undefined}`);
		});
	});

	it('should show output for nested groupBy', () => {
		const input = 'qty: sum(), groupBy(marketingMasterCategory.category)';
		const result = parseObjectLiteral(input);

		console.log('\nInput:', input);
		console.log('Output:', JSON.stringify(result, null, 2));

		result.forEach(([key, val], index) => {
			console.log(`[${index}] key="${key}", val="${val}", val===undefined: ${val === undefined}`);
		});
	});
});
