import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import parseObjectLiteral from '../helpers/parse-object-literal';
import delimetedStringObject from '../helpers/delimeted-string-object';
import deepMerge from '../helpers/deep-merge';
import TimezoneService from './timezone.service';
import { Pipes } from '../types/pipes.types';
import { decodePipeQuery } from '../utils/crypto.utils';

/**
 * Type definitions for better type safety
 */
type PrimitiveValue = string | number | boolean | null;
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
 * Relation filter operators (for nested queries)
 */
const RELATION_OPERATORS = ['is', 'isNot', 'some', 'every', 'none'] as const;

/**
 * Parse null value - ONLY accepts null() format
 * Returns null for valid null() format
 */
function parseStringToNull(ruleValue: string): null | undefined {
	// Must be exactly "null()" with no content inside
	if (ruleValue === 'null()') {
		return null;
	}
	// Return undefined to indicate invalid format
	return undefined;
}

/**
 * Type parsers registry for better extensibility
 */
const TYPE_PARSERS: Record<string, (value: string) => ParsedValue | undefined> = {
	int: parseStringToInt,
	date: parseStringToDate,
	datetime: parseStringToDate,
	float: parseStringToFloat,
	string: parseStringToString,
	boolean: parseStringToBoolean,
	bool: parseStringToBoolean,
	array: parseStringToArray,
	field: parseFieldReference,
	null: parseStringToNull,
};

/**
 * Extract value from parentheses
 */
function extractParenthesesContent(input: string): string | null {
	const match = /\(([^)]*)\)/.exec(input);
	return match ? match[1] : null;
}

/**
 * Parse a string to an integer
 */
function parseStringToInt(ruleValue: string): number | undefined {
	if (!ruleValue.endsWith(')') || !ruleValue.startsWith('int(')) {
		return undefined;
	}
	const content = extractParenthesesContent(ruleValue);
	return content ? parseInt(content, 10) : undefined;
}

/**
 * Parse a string to a date
 */
function parseStringToDate(ruleValue: string): string | undefined {
	const validPrefixes = ['date(', 'datetime('];
	const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));

	if (!ruleValue.endsWith(')') || !hasValidPrefix) {
		return undefined;
	}

	const content = extractParenthesesContent(ruleValue);
	if (!content) return undefined;

	const dateString = TimezoneService.addTimezoneToDateString(content);
	return new Date(dateString).toISOString();
}

/**
 * Parse a string to a float
 */
function parseStringToFloat(ruleValue: string): number | undefined {
	if (!ruleValue.endsWith(')') || !ruleValue.startsWith('float(')) {
		return undefined;
	}
	const content = extractParenthesesContent(ruleValue);
	return content ? parseFloat(content) : undefined;
}

/**
 * Parse a string to a string
 */
function parseStringToString(ruleValue: string): string | undefined {
	if (!ruleValue.endsWith(')') || !ruleValue.startsWith('string(')) {
		return undefined;
	}
	return extractParenthesesContent(ruleValue) || undefined;
}

/**
 * Parse a string to a boolean
 */
function parseStringToBoolean(ruleValue: string): boolean | undefined {
	const validPrefixes = ['boolean(', 'bool('];
	const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));

	if (!ruleValue.endsWith(')') || !hasValidPrefix) {
		return undefined;
	}

	const content = extractParenthesesContent(ruleValue);
	return content === 'true';
}

/**
 * Parse a string to an array
 */
function parseStringToArray(ruleValue: string): PrimitiveValue[] | undefined {
	if (!ruleValue.startsWith('array(')) {
		return undefined;
	}

	const match = /\(([^]+)\)/.exec(ruleValue);
	if (!match || !match[1]) {
		return [];
	}

	return match[1].split(',').map((value) => {
		const trimmedValue = value.trim();
		const parsed = parseValue(trimmedValue);
		return parsed !== undefined ? (parsed as PrimitiveValue) : trimmedValue;
	});
}

/**
 * Parse field reference for field-to-field comparison
 */
function parseFieldReference(ruleValue: string): Record<string, any> | undefined {
	if (!ruleValue.startsWith('field(') || !ruleValue.endsWith(')')) {
		return undefined;
	}

	const fieldPath = extractParenthesesContent(ruleValue);
	if (!fieldPath) {
		return undefined;
	}

	let scope: string | undefined;
	let cleanPath = fieldPath;

	if (fieldPath.startsWith('$parent.')) {
		scope = 'parent';
		cleanPath = fieldPath.substring(8);
	} else if (fieldPath.startsWith('$root.')) {
		scope = 'root';
		cleanPath = fieldPath.substring(6);
	}

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
 */
function convertToFieldReference(fieldRef: any): Record<string, any> {
	if (typeof fieldRef === 'object' && fieldRef !== null && '_ref' in fieldRef && '_isFieldRef' in fieldRef) {
		return fieldRef;
	}
	return {};
}

/**
 * Detect type from string and parse accordingly
 * Returns undefined if no valid parser found
 */
function parseValue(ruleValue: string): ParsedValue | undefined {
	// Check for typed values
	for (const [type, parser] of Object.entries(TYPE_PARSERS)) {
		if (ruleValue.startsWith(`${type}(`)) {
			return parser(ruleValue);
		}
	}

	// Check if it's the plain word "null" (without parentheses) - treat as string
	if (ruleValue === 'null') {
		return 'null'; // Return as string, not null value
	}

	// Return as-is if no type detected (implicit string)
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
 * @description Convert query string to Prisma where clause with comprehensive null handling
 * 
 * According to Prisma documentation, both formats are valid:
 * 1. Direct assignment: { field: null }
 * 2. Explicit equals: { field: { equals: null } }
 * 
 * WherePipe supports both through the null() function:
 * 
 * @example NULL checks - Direct assignment (no operator)
 * "categoryId: null()" → { categoryId: null }
 * 
 * @example NULL checks - Explicit equals
 * "categoryId: equals null()" → { categoryId: { equals: null } }
 * 
 * @example NOT NULL checks
 * "categoryId: not null()" → { categoryId: { not: null } }
 * 
 * @example Relationship NULL checks
 * "category: null()" → { category: null }  // Check if relationship exists
 * "category.name: null()" → { category: { name: null } }  // Check field in relationship
 * 
 * @example Many relationship NULL checks
 * "reviews.some.comment: null()" → { reviews: { some: { comment: null } } }
 * 
 * @see https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/null-and-undefined
 */
@Injectable()
export default class WherePipe implements PipeTransform {
	transform(value: string, metadata?: any): Pipes.Where | undefined {
		if (value == null || value === '') {
			return {};
		}

		try {
			const clientIp = metadata?.data?.clientIp;
			const decodedValue = decodePipeQuery(value, clientIp);
			const rules = parseObjectLiteral(decodedValue);
			let items: Record<string, any> = {};

			for (const rule of rules) {
				const [ruleKey, ruleValue] = rule;

				// Skip if no value provided
				if (ruleValue == null || ruleValue === '') {
					continue;
				}

				const { operator, value: rawValue } = extractOperatorAndValue(ruleValue);
				const parsedValue = parseValue(rawValue);

				// Validate null() usage - help users use correct format
				if (rawValue.includes('null') && parsedValue === undefined) {
					throw new BadRequestException(
						`Invalid null format in "${ruleKey}". Use null() not null. Examples: "field: null()" or "field: not null()"`
					);
				}

				// Skip if parsing failed completely
				if (parsedValue === undefined) {
					console.warn(`Skipping invalid value for ${ruleKey}: ${rawValue}`);
					continue;
				}

				// Determine the final value based on Prisma conventions
				let finalValue: any;

				if (operator) {
					// Has operator: always wrap in operator object
					// Examples:
					// - equals null() → { equals: null }
					// - not null() → { not: null }
					if (isFieldReference(parsedValue)) {
						finalValue = { [operator]: convertToFieldReference(parsedValue) };
					} else {
						finalValue = { [operator]: parsedValue };
					}
				} else {
					// No operator: direct assignment for simple values
					// Examples:
					// - null() → null (direct assignment)
					// - field(qty) → { equals: field_ref } (wrap field refs)
					if (isFieldReference(parsedValue)) {
						// Field references need explicit equals even without operator
						finalValue = { equals: convertToFieldReference(parsedValue) };
					} else {
						// Direct assignment for null and other simple values
						// This follows Prisma convention: { field: null } is valid
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
						items[ruleKey] = finalValue;
					}
				}
			}

			return items;
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			console.error('Error parsing query string:', error);
			throw new BadRequestException('Invalid query format');
		}
	}
}