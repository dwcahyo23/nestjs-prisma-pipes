import { Pipes } from '../pipes.types';
export interface FieldRefContext {
    currentModel: string;
    parentModel?: string;
    parentFields?: any;
    rootModel?: string;
    rootFields?: any;
}
export interface FieldRefConverterOptions {
    debug?: boolean;
    strict?: boolean;
    customResolver?: (ref: string, scope: string | undefined, context: FieldRefContext) => any;
}
export declare function isFieldReference(value: any): value is Pipes.FieldReference;
export interface FieldRefInfo {
    ref: string;
    scope?: 'parent' | 'root';
    isFieldRef: true;
}
export declare function extractFieldRefInfo(value: any): FieldRefInfo | null;
export declare function resolveFieldReference(fieldRef: any, prisma: any, context: FieldRefContext, options?: FieldRefConverterOptions): any;
export declare function convertFieldReferences(whereClause: any, prisma: any, context: FieldRefContext, options?: FieldRefConverterOptions): any;
export declare function initFieldRefContext(prisma: any, modelName: string): FieldRefContext;
export declare function createFieldRefConverter(prisma: any, modelName: string, options?: FieldRefConverterOptions): (whereClause: any) => any;
export declare function convertWhereClause(whereClause: any, prisma: any, modelName: string, options?: FieldRefConverterOptions): any;
export interface FieldRefValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateFieldReferences(whereClause: any, prisma: any, modelName: string): FieldRefValidationResult;
export interface ExtractedFieldRef {
    path: string;
    ref: string;
    scope?: 'parent' | 'root';
    context: string;
}
export declare function extractAllFieldReferences(whereClause: any, currentModel?: string): ExtractedFieldRef[];
