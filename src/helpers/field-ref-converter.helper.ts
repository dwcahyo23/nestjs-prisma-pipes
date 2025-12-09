// helpers/field-ref-converter.helper.ts
import { Pipes } from '../pipes.types';

/**
 * Context for field reference resolution
 */
export interface FieldRefContext {
	/** Current model being queried */
	currentModel: string;
	/** Parent model context (1 level up) */
	parentModel?: string;
	/** Parent model fields */
	parentFields?: any;
	/** Root model context (top level) */
	rootModel?: string;
	/** Root model fields */
	rootFields?: any;
}

/**
 * Options for field reference converter
 */
export interface FieldRefConverterOptions {
	/** Enable debug logging */
	debug?: boolean;
	/** Throw error on unresolved field references */
	strict?: boolean;
	/** Custom field resolver */
	customResolver?: (ref: string, scope: string | undefined, context: FieldRefContext) => any;
}

/**
 * Check if a value is a field reference
 * 
 * @example
 * isFieldReference({ _ref: 'createdAt', _isFieldRef: true }) // true
 * isFieldReference('normal string') // false
 */
export function isFieldReference(value: any): value is Pipes.FieldReference {
	return (
		typeof value === 'object' &&
		value !== null &&
		'_isFieldRef' in value &&
		value._isFieldRef === true &&
		'_ref' in value
	);
}

/**
 * Extract field reference info
 */
export interface FieldRefInfo {
	ref: string;
	scope?: 'parent' | 'root';
	isFieldRef: true;
}

export function extractFieldRefInfo(value: any): FieldRefInfo | null {
	if (!isFieldReference(value)) {
		return null;
	}

	return {
		ref: value._ref,
		scope: value._scope as 'parent' | 'root' | undefined,
		isFieldRef: true,
	};
}

/**
 * Resolve field reference to Prisma field
 * 
 * @param fieldRef - Field reference object
 * @param prisma - PrismaClient instance
 * @param context - Context for resolution
 * @param options - Converter options
 * @returns Resolved Prisma field or original value
 */
export function resolveFieldReference(
	fieldRef: any,
	prisma: any,
	context: FieldRefContext,
	options: FieldRefConverterOptions = {}
): any {
	const info = extractFieldRefInfo(fieldRef);
	if (!info) {
		return fieldRef;
	}

	const { ref, scope } = info;
	const { debug, strict, customResolver } = options;

	// Use custom resolver if provided
	if (customResolver) {
		try {
			const resolved = customResolver(ref, scope, context);
			if (resolved !== undefined) {
				return resolved;
			}
		} catch (error) {
			if (debug) {
				console.warn('Custom resolver failed:', error);
			}
		}
	}

	// Resolve based on scope
	let resolvedField: any;

	if (scope === 'parent' && context.parentFields) {
		// Reference to parent model field
		resolvedField = context.parentFields[ref];

		if (debug && resolvedField) {
			console.log(`Resolved $parent.${ref} in ${context.parentModel}`);
		}
	} else if (scope === 'root' && context.rootFields) {
		// Reference to root model field
		resolvedField = context.rootFields[ref];

		if (debug && resolvedField) {
			console.log(`Resolved $root.${ref} in ${context.rootModel}`);
		}
	} else {
		// Reference to current model field
		const currentFields = prisma[context.currentModel]?.fields;
		if (currentFields) {
			resolvedField = currentFields[ref];

			if (debug && resolvedField) {
				console.log(`Resolved ${ref} in ${context.currentModel}`);
			}
		}
	}

	// Handle unresolved field
	if (!resolvedField) {
		const scopeStr = scope ? `$${scope}.` : '';
		const message = `Field reference not resolved: ${scopeStr}${ref} in model ${context.currentModel}`;

		if (strict) {
			throw new Error(message);
		}

		if (debug) {
			console.warn(message);
		}

		// Return original field ref for service layer to handle
		return fieldRef;
	}

	return resolvedField;
}

/**
 * Convert field references in where clause recursively
 * 
 * @param whereClause - Where clause with field references
 * @param prisma - PrismaClient instance
 * @param context - Context for resolution
 * @param options - Converter options
 * @returns Where clause with resolved field references
 */
export function convertFieldReferences(
	whereClause: any,
	prisma: any,
	context: FieldRefContext,
	options: FieldRefConverterOptions = {}
): any {
	if (!whereClause || typeof whereClause !== 'object') {
		return whereClause;
	}

	// Handle arrays (for AND, OR, NOT)
	if (Array.isArray(whereClause)) {
		return whereClause.map((item) =>
			convertFieldReferences(item, prisma, context, options)
		);
	}

	// Handle field reference
	if (isFieldReference(whereClause)) {
		return resolveFieldReference(whereClause, prisma, context, options);
	}

	// Recursively process object properties
	const result: any = {};

	for (const [key, value] of Object.entries(whereClause)) {
		// Special handling for relation filters (some, every, none, is)
		if (['some', 'every', 'none', 'is'].includes(key)) {
			// Update context: parent becomes current model
			const newContext: FieldRefContext = {
				...context,
				parentModel: context.currentModel,
				parentFields: prisma[context.currentModel]?.fields,
			};

			result[key] = convertFieldReferences(value, prisma, newContext, options);
		}
		// Special handling for logical operators (AND, OR, NOT)
		else if (['AND', 'OR', 'NOT'].includes(key)) {
			result[key] = convertFieldReferences(value, prisma, context, options);
		}
		// Regular field
		else if (typeof value === 'object' && value !== null) {
			result[key] = convertFieldReferences(value, prisma, context, options);
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Initialize context for field reference conversion
 * 
 * @param prisma - PrismaClient instance
 * @param modelName - Root model name
 * @returns Initial context
 * 
 * @example
 * const context = initFieldRefContext(prisma, 'workorder');
 */
export function initFieldRefContext(
	prisma: any,
	modelName: string
): FieldRefContext {
	return {
		currentModel: modelName,
		rootModel: modelName,
		rootFields: prisma[modelName]?.fields,
	};
}

/**
 * Create a field reference converter for a specific model
 * 
 * @param prisma - PrismaClient instance
 * @param modelName - Model name
 * @param options - Converter options
 * @returns Converter function
 * 
 * @example
 * const convertWorkorderWhere = createFieldRefConverter(prisma, 'workorder');
 * const resolvedWhere = convertWorkorderWhere(where);
 */
export function createFieldRefConverter(
	prisma: any,
	modelName: string,
	options: FieldRefConverterOptions = {}
) {
	return (whereClause: any): any => {
		const context = initFieldRefContext(prisma, modelName);
		return convertFieldReferences(whereClause, prisma, context, options);
	};
}

/**
 * Convenience function: Convert where clause with field references
 * 
 * @param whereClause - Where clause from WherePipe
 * @param prisma - PrismaClient instance
 * @param modelName - Model name
 * @param options - Converter options
 * @returns Resolved where clause
 * 
 * @example
 * // Basic usage
 * const resolved = convertWhereClause(where, prisma, 'workorder');
 * 
 * @example
 * // With debug logging
 * const resolved = convertWhereClause(where, prisma, 'workorder', { debug: true });
 * 
 * @example
 * // Strict mode (throws on unresolved)
 * const resolved = convertWhereClause(where, prisma, 'workorder', { strict: true });
 */
export function convertWhereClause(
	whereClause: any,
	prisma: any,
	modelName: string,
	options: FieldRefConverterOptions = {}
): any {
	const context = initFieldRefContext(prisma, modelName);
	return convertFieldReferences(whereClause, prisma, context, options);
}

/**
 * Validate that all field references in where clause are resolvable
 * 
 * @param whereClause - Where clause to validate
 * @param prisma - PrismaClient instance
 * @param modelName - Model name
 * @returns Validation result
 * 
 * @example
 * const validation = validateFieldReferences(where, prisma, 'workorder');
 * if (!validation.valid) {
 *   console.error('Invalid field references:', validation.errors);
 * }
 */
export interface FieldRefValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export function validateFieldReferences(
	whereClause: any,
	prisma: any,
	modelName: string
): FieldRefValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	function validate(obj: any, context: FieldRefContext, path: string = ''): void {
		if (!obj || typeof obj !== 'object') {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach((item, idx) => validate(item, context, `${path}[${idx}]`));
			return;
		}

		if (isFieldReference(obj)) {
			const info = extractFieldRefInfo(obj);
			if (!info) return;

			const { ref, scope } = info;
			let fieldExists = false;

			if (scope === 'parent' && context.parentFields) {
				fieldExists = ref in context.parentFields;
			} else if (scope === 'root' && context.rootFields) {
				fieldExists = ref in context.rootFields;
			} else {
				const currentFields = prisma[context.currentModel]?.fields;
				fieldExists = currentFields && ref in currentFields;
			}

			if (!fieldExists) {
				const scopeStr = scope ? `$${scope}.` : '';
				errors.push(
					`Field reference at '${path}': ${scopeStr}${ref} not found in model ${context.currentModel}`
				);
			}
			return;
		}

		for (const [key, value] of Object.entries(obj)) {
			const newPath = path ? `${path}.${key}` : key;

			if (['some', 'every', 'none', 'is'].includes(key)) {
				const newContext: FieldRefContext = {
					...context,
					parentModel: context.currentModel,
					parentFields: prisma[context.currentModel]?.fields,
				};
				validate(value, newContext, newPath);
			} else {
				validate(value, context, newPath);
			}
		}
	}

	const context = initFieldRefContext(prisma, modelName);
	validate(whereClause, context);

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Extract all field references from where clause
 * Useful for debugging and analysis
 * 
 * @param whereClause - Where clause to analyze
 * @returns Array of field reference info
 * 
 * @example
 * const refs = extractAllFieldReferences(where);
 * console.log('Found field references:', refs);
 */
export interface ExtractedFieldRef {
	path: string;
	ref: string;
	scope?: 'parent' | 'root';
	context: string;
}

export function extractAllFieldReferences(
	whereClause: any,
	currentModel = 'unknown'
): ExtractedFieldRef[] {
	const references: ExtractedFieldRef[] = [];

	function extract(obj: any, context: string, path: string = ''): void {
		if (!obj || typeof obj !== 'object') {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach((item, idx) => extract(item, context, `${path}[${idx}]`));
			return;
		}

		if (isFieldReference(obj)) {
			const info = extractFieldRefInfo(obj);
			if (info) {
				references.push({
					path: path || 'root',
					ref: info.ref,
					scope: info.scope,
					context,
				});
			}
			return;
		}

		for (const [key, value] of Object.entries(obj)) {
			const newPath = path ? `${path}.${key}` : key;
			extract(value, context, newPath);
		}
	}

	extract(whereClause, currentModel);
	return references;
}