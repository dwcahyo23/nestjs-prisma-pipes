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
export declare function isFieldReference(value: any): value is Pipes.FieldReference;
/**
 * Extract field reference info
 */
export interface FieldRefInfo {
    ref: string;
    scope?: 'parent' | 'root';
    isFieldRef: true;
}
export declare function extractFieldRefInfo(value: any): FieldRefInfo | null;
/**
 * Resolve field reference to Prisma field
 *
 * @param fieldRef - Field reference object
 * @param prisma - PrismaClient instance
 * @param context - Context for resolution
 * @param options - Converter options
 * @returns Resolved Prisma field or original value
 */
export declare function resolveFieldReference(fieldRef: any, prisma: any, context: FieldRefContext, options?: FieldRefConverterOptions): any;
/**
 * Convert field references in where clause recursively
 *
 * @param whereClause - Where clause with field references
 * @param prisma - PrismaClient instance
 * @param context - Context for resolution
 * @param options - Converter options
 * @returns Where clause with resolved field references
 */
export declare function convertFieldReferences(whereClause: any, prisma: any, context: FieldRefContext, options?: FieldRefConverterOptions): any;
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
export declare function initFieldRefContext(prisma: any, modelName: string): FieldRefContext;
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
export declare function createFieldRefConverter(prisma: any, modelName: string, options?: FieldRefConverterOptions): (whereClause: any) => any;
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
export declare function convertWhereClause(whereClause: any, prisma: any, modelName: string, options?: FieldRefConverterOptions): any;
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
export declare function validateFieldReferences(whereClause: any, prisma: any, modelName: string): FieldRefValidationResult;
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
export declare function extractAllFieldReferences(whereClause: any, currentModel?: string): ExtractedFieldRef[];
//# sourceMappingURL=field-ref-converter.helper.d.ts.map