import { Pipes } from 'src/pipes.types';
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
export declare function configurePipesTimezone(config: Partial<Pipes.TimezoneConfig>): void;
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
export declare function getPipesTimezone(): Pipes.TimezoneConfig;
//# sourceMappingURL=timezone.config.d.ts.map