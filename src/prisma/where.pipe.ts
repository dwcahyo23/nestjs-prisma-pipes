import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import parseObjectLiteral from '../helpers/parse-object-literal';
import { Pipes } from 'src/pipes.types';
import delimetedStringObject from '../helpers/delimeted-string-object';
import deepMerge from '../helpers/deep-merge';

/**
 * Type definitions for better type safety
 */
type PrimitiveValue = string | number | boolean;
type ParsedValue = PrimitiveValue | PrimitiveValue[] | Record<string, any>;

/**
 * Operators supported by the where pipe
 */
const FILTER_OPERATORS = [
	'lt', 'lte', 'gt', 'gte', 'equals', 'not',
	'contains', 'startsWith', 'endsWith',
	'every', 'some', 'none',
	'in', 'has', 'hasEvery', 'hasSome',
] as const;

type FilterOperator = typeof FILTER_OPERATORS[number];

/**
 * Type parsers registry for better extensibility
 */
const TYPE_PARSERS: Record<string, (value: string) => ParsedValue> = {
	int: parseStringToInt,
	date: parseStringToDate,
	datetime: parseStringToDate,
	float: parseStringToFloat,
	string: parseStringToString,
	boolean: parseStringToBoolean,
	bool: parseStringToBoolean,
	array: parseStringToArray,
	field: parseFieldReference, // NEW: field reference
};

/**
 * Extract value from parentheses
 */
function extractParenthesesContent(input: string): string | null {
	const match = /\(([^)]+)\)/.exec(input);
	return match ? match[1] : null;
}

/**
 * Parse a string to an integer
 */
function parseStringToInt(ruleValue: string): number {
	if (!ruleValue.endsWith(')') || !ruleValue.startsWith('int(')) {
		return 0;
	}
	const content = extractParenthesesContent(ruleValue);
	return content ? parseInt(content, 10) : 0;
}

/**
 * Parse a string to a date
 */
function parseStringToDate(ruleValue: string): string {
	const validPrefixes = ['date(', 'datetime('];
	const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));

	if (!ruleValue.endsWith(')') || !hasValidPrefix) {
		return '';
	}

	const content = extractParenthesesContent(ruleValue);
	return content ? new Date(content).toISOString() : '';
}

/**
 * Parse a string to a float
 */
function parseStringToFloat(ruleValue: string): number {
	if (!ruleValue.endsWith(')') || !ruleValue.startsWith('float(')) {
		return 0;
	}
	const content = extractParenthesesContent(ruleValue);
	return content ? parseFloat(content) : 0;
}

/**
 * Parse a string to a string
 */
function parseStringToString(ruleValue: string): string {
	if (!ruleValue.endsWith(')') || !ruleValue.startsWith('string(')) {
		return '';
	}
	return extractParenthesesContent(ruleValue) || '';
}

/**
 * Parse a string to a boolean
 */
function parseStringToBoolean(ruleValue: string): boolean {
	const validPrefixes = ['boolean(', 'bool('];
	const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));

	if (!ruleValue.endsWith(')') || !hasValidPrefix) {
		return false;
	}

	const content = extractParenthesesContent(ruleValue);
	return content === 'true';
}

/**
 * Parse a string to an array
 */
function parseStringToArray(ruleValue: string): PrimitiveValue[] {
	if (!ruleValue.startsWith('array(')) {
		return [];
	}

	const match = /\(([^]+)\)/.exec(ruleValue);
	if (!match || !match[1]) {
		return [];
	}

	return match[1].split(',').map((value) => {
		const trimmedValue = value.trim();
		return parseValue(trimmedValue) as PrimitiveValue;
	});
}

/**
 * Parse field reference for field-to-field comparison
 * @example field(recQty) → { _ref: 'recQty' }
 * @example field(user.balance) → { _ref: 'user.balance' }
 */
function parseFieldReference(ruleValue: string): Record<string, any> {
	if (!ruleValue.startsWith('field(') || !ruleValue.endsWith(')')) {
		return {};
	}

	const fieldPath = extractParenthesesContent(ruleValue);
	if (!fieldPath) {
		return {};
	}

	// Support nested field references like user.balance
	return { _ref: fieldPath };
}

/**
 * Check if a value is a field reference
 */
function isFieldReference(value: any): boolean {
	return typeof value === 'object' && value !== null && '_ref' in value;
}

/**
 * Convert field reference to Prisma field reference format
 * Prisma uses special syntax for field references in some scenarios
 */
function convertToFieldReference(fieldRef: any): string {
	// Type guard to ensure we have a field reference object
	if (typeof fieldRef === 'object' && fieldRef !== null && '_ref' in fieldRef) {
		return fieldRef._ref;
	}
	// Fallback: return empty string if not a valid field reference
	return '';
}

/**
 * Detect type from string and parse accordingly
 */
function parseValue(ruleValue: string): ParsedValue {
	// Check for typed values
	for (const [type, parser] of Object.entries(TYPE_PARSERS)) {
		if (ruleValue.startsWith(`${type}(`)) {
			return parser(ruleValue);
		}
	}

	// Return as-is if no type detected
	return ruleValue;
}

/**
 * Extract operator and value from a rule
 */
function extractOperatorAndValue(ruleValue: string): { operator: string | null; value: string } {
	for (const operator of FILTER_OPERATORS) {
		if (ruleValue.startsWith(`${operator} `)) {
			return {
				operator,
				value: ruleValue.slice(operator.length).trim(),
			};
		}
	}

	return { operator: null, value: ruleValue };
}

/**
 * @description Convert a string like
 * @example "id: int(1), firstName: banana" to { id: 1, firstName: "banana" }
 * @example "createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)" 
 *          to { createdAt: { gte: "2024-01-01T00:00:00.000Z", lte: "2024-12-31T00:00:00.000Z" } }
 * @example "qty: lte field(recQty)" to { qty: { lte: "recQty" } } // Field-to-field comparison
 */
@Injectable()
export default class WherePipe implements PipeTransform {
	transform(value: string): Pipes.Where | undefined {
		if (value == null || value === '') {
			return {};
		}

		try {
			const rules = parseObjectLiteral(value);
			let items: Record<string, any> = {};

			for (const rule of rules) {
				const [ruleKey, ruleValue] = rule;

				// Skip empty values
				if (ruleValue == null || ruleValue === '') {
					continue;
				}

				const { operator, value: rawValue } = extractOperatorAndValue(ruleValue);
				const parsedValue = parseValue(rawValue);

				// Determine the final value based on operator and field reference
				let finalValue: any;

				if (operator) {
					// Has operator: wrap in operator object
					if (isFieldReference(parsedValue)) {
						finalValue = { [operator]: convertToFieldReference(parsedValue) };
					} else {
						finalValue = { [operator]: parsedValue };
					}
				} else {
					// No operator
					if (isFieldReference(parsedValue)) {
						// Field reference without operator: wrap in equals
						finalValue = { equals: convertToFieldReference(parsedValue) };
					} else {
						// Regular value without operator: use as-is
						finalValue = parsedValue;
					}
				}

				// Handle nested keys (contains dot notation)
				if (ruleKey.indexOf('.') !== -1) {
					const delimeted = delimetedStringObject(ruleKey, finalValue);
					items = deepMerge(items, delimeted);
				} else {
					// Handle flat keys
					if (items[ruleKey] && typeof items[ruleKey] === 'object' && typeof finalValue === 'object' && !Array.isArray(finalValue) && !Array.isArray(items[ruleKey])) {
						// Merge objects (for date ranges, multiple operators on same field)
						items[ruleKey] = { ...items[ruleKey], ...finalValue };
					} else {
						// Simple assignment
						items[ruleKey] = finalValue;
					}
				}
			}

			return items;
		} catch (error) {
			console.error('Error parsing query string:', error);
			throw new BadRequestException('Invalid query format');
		}
	}
}