// src/helpers/timezone.config.ts
import TimezoneService from '../pipes/timezone.service';
import { Pipes } from 'src/backend/types/pipes.types';

/**
 * Configure timezone for all pipes
 * Call this once at app initialization
 * 
 * @example
 * ```typescript
 * import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';
 * 
 * configurePipesTimezone({
 *   offset: '+07:00',
 *   name: 'Asia/Jakarta',
 * });
 * ```
 */
export function configurePipesTimezone(config: Partial<Pipes.TimezoneConfig>): void {
	TimezoneService.setTimezone(config);
}

/**
 * Get current timezone configuration
 * 
 * @example
 * ```typescript
 * import { getPipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';
 * 
 * const timezone = getPipesTimezone();
 * console.log(timezone); // { offset: '+07:00', name: 'Asia/Jakarta', offsetHours: 7 }
 * ```
 */
export function getPipesTimezone(): Pipes.TimezoneConfig {
	return TimezoneService.getTimezone();
}