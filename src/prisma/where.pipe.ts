import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import parseObjectLiteral from '../helpers/parse-object-literal';
import { Pipes } from 'src/pipes.types';
import delimetedStringObject from '../helpers/delimeted-string-object';
import deepMerge from '../helpers/deep-merge';
import TimezoneService from './timezone.service';

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
	field: parseFieldReference,
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
	if (!content) return '';

	// ✅ Use TimezoneService to add timezone
	const dateString = TimezoneService.addTimezoneToDateString(content);

	return new Date(dateString).toISOString();
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
 * 
 * @example 
 * Simple field: field(recQty) → { _ref: 'recQty', _isFieldRef: true }
 * 
 * @example
 * Nested relation field: field(user.balance) → { _ref: 'user.balance', _isFieldRef: true }
 * 
 * @example
 * Cross-table comparison (NEW):
 * field($parent.createdAt) → { _ref: '$parent.createdAt', _isFieldRef: true, _scope: 'parent' }
 * field($root.orderDate) → { _ref: '$root.orderDate', _isFieldRef: true, _scope: 'root' }
 */
function parseFieldReference(ruleValue: string): Record<string, any> {
	if (!ruleValue.startsWith('field(') || !ruleValue.endsWith(')')) {
		return {};
	}

	const fieldPath = extractParenthesesContent(ruleValue);
	if (!fieldPath) {
		return {};
	}

	// Check for special scope markers
	let scope: string | undefined;
	let cleanPath = fieldPath;

	if (fieldPath.startsWith('$parent.')) {
		scope = 'parent';
		cleanPath = fieldPath.substring(8); // Remove '$parent.'
	} else if (fieldPath.startsWith('$root.')) {
		scope = 'root';
		cleanPath = fieldPath.substring(6); // Remove '$root.'
	}

	// Return a special object that marks this as a field reference
	const result: Record<string, any> = {
		_ref: cleanPath,
		_isFieldRef: true
	};

	if (scope) {
		result._scope = scope;
	}

	return result;
}

/**
 * Check if a value is a field reference
 */
function isFieldReference(value: any): boolean {
	return typeof value === 'object' && value !== null && '_isFieldRef' in value && value._isFieldRef === true;
}

/**
 * Convert field reference to a format that can be identified by service layer
 * Returns the field reference object that service layer should convert to prisma.model.fields.fieldName
 */
function convertToFieldReference(fieldRef: any): Record<string, any> {
	// Type guard to ensure we have a field reference object
	if (typeof fieldRef === 'object' && fieldRef !== null && '_ref' in fieldRef && '_isFieldRef' in fieldRef) {
		return fieldRef; // Return the whole object so service can identify it
	}
	// Fallback: return empty object if not a valid field reference
	return {};
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
 * @description Convert a string with field-to-field comparison support
 * 
 * @example Basic comparison
 * "id: int(1), firstName: banana" → { id: 1, firstName: "banana" }
 * 
 * @example Date range
 * "createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)" 
 * → { createdAt: { gte: "2024-01-01T00:00:00.000Z", lte: "2024-12-31T00:00:00.000Z" } }
 * 
 * @example Same-table field comparison
 * "qty: lte field(recQty)" → { qty: { lte: { _ref: "recQty", _isFieldRef: true } } }
 * 
 * @example Cross-table comparison (NEW)
 * "mesin.some.userMesin.some.createdAt: lte field($parent.createdAt)"
 * → {
 *     mesin: {
 *       some: {
 *         userMesin: {
 *           some: {
 *             createdAt: { 
 *               lte: { _ref: "createdAt", _isFieldRef: true, _scope: "parent" } 
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * 
 * This enables: userMesin.createdAt <= workorder.createdAt
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