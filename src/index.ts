// pipes/index.ts
import WherePipe from './prisma/where.pipe';
import OrderByPipe from './prisma/order-by.pipe';
import SelectPipe from './prisma/select.pipe';
import { convertFieldReferences, createFieldRefConverter } from './helpers/field-ref-converter.helper';
import { IncludePipe } from './prisma/include.pipe';
import { Pipes } from './pipes.types';
import AggregatePipe from './prisma/aggregate.pipe';
import TimezoneService, { TimezoneConfig } from './prisma/timezone.service';

/**
 * Configure timezone for all pipes
 * Call this once at app initialization
 * 
 * @example
 * ```typescript
 * import { configurePipesTimezone } from './pipes';
 * 
 * configurePipesTimezone({
 *   offset: '+07:00',
 *   name: 'Asia/Jakarta',
 * });
 * ```
 */
export function configurePipesTimezone(config: Partial<TimezoneConfig>): void {
	TimezoneService.setTimezone(config);
}

/**
 * Get current timezone configuration
 * 
 * @example
 * ```typescript
 * import { getPipesTimezone } from './pipes';
 * 
 * const timezone = getPipesTimezone();
 * console.log(timezone); // { offset: '+07:00', name: 'Asia/Jakarta', offsetHours: 7 }
 * ```
 */
export function getPipesTimezone(): TimezoneConfig {
	return TimezoneService.getTimezone();
}

// Export pipes
export {
	WherePipe,
	OrderByPipe,
	SelectPipe,
	IncludePipe,
	AggregatePipe,
	convertFieldReferences,
	createFieldRefConverter,
};

// Export types
export { Pipes };
export type { TimezoneConfig };

// Export timezone service for advanced usage
export { TimezoneService };