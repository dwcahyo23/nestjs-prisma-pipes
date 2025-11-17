/**
 * Helper utility to convert field references from WherePipe to Prisma field references
 * 
 * Usage in your service:
 * ```typescript
 * import { convertFieldReferences } from './helpers/field-ref-converter';
 * 
 * const where = convertFieldReferences(whereFromPipe, this.prisma.yourModel);
 * const result = await this.prisma.yourModel.findMany({ where });
 * ```
 */

/**
 * Check if a value is a field reference from WherePipe
 */
function isFieldReference(value: any): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		'_isFieldRef' in value &&
		value._isFieldRef === true &&
		'_ref' in value
	);
}

/**
 * Recursively convert field references in a where object
 * @param obj - The where object from WherePipe
 * @param modelDelegate - The Prisma model delegate (e.g., prisma.user)
 * @returns The converted where object with proper Prisma field references
 */
export function convertFieldReferences(obj: any, modelDelegate: any): any {
	if (obj == null || typeof obj !== 'object') {
		return obj;
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => convertFieldReferences(item, modelDelegate));
	}

	// Handle field reference objects
	if (isFieldReference(obj)) {
		const fieldPath = obj._ref;

		// Handle nested field paths (e.g., "user.balance")
		if (fieldPath.includes('.')) {
			// For nested paths, we need to handle them differently
			// This is for cases like: balance: { gte: field(user.minBalance) }
			// Prisma might not support this directly, so we keep it as-is
			// and let Prisma handle the error or the user should use joins
			return obj;
		}

		// Convert to Prisma field reference
		// e.g., field(recQty) -> prisma.marketingSPB.fields.recQty
		if (modelDelegate && modelDelegate.fields && modelDelegate.fields[fieldPath]) {
			return modelDelegate.fields[fieldPath];
		}

		// If field doesn't exist, return original (will cause Prisma error with clear message)
		return obj;
	}

	// Recursively process object properties
	const result: any = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = convertFieldReferences(value, modelDelegate);
	}

	return result;
}

/**
 * Type-safe wrapper for convertFieldReferences
 * This provides better TypeScript support
 */
export function createFieldRefConverter<T>(modelDelegate: T) {
	return (where: any) => convertFieldReferences(where, modelDelegate);
}

// Example usage:
/*
@Injectable()
export class MarketingSPBService {
	constructor(private prisma: PrismaService) {}

	async findMany(whereFromPipe: any) {
		// Convert field references before passing to Prisma
		const where = convertFieldReferences(whereFromPipe, this.prisma.marketingSPB);
		
		return this.prisma.marketingSPB.findMany({ where });
	}

	// Or create a reusable converter
	private convertWhere = createFieldRefConverter(this.prisma.marketingSPB);

	async findManyAlt(whereFromPipe: any) {
		const where = this.convertWhere(whereFromPipe);
		return this.prisma.marketingSPB.findMany({ where });
	}
}
*/