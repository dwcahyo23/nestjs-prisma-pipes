import { TimezoneConfig, TimezoneService } from "src";

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