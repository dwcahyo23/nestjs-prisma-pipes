"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePipesTimezone = configurePipesTimezone;
exports.getPipesTimezone = getPipesTimezone;
// src/helpers/timezone.config.ts
const timezone_service_1 = __importDefault(require("../prisma/timezone.service"));
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
function configurePipesTimezone(config) {
    timezone_service_1.default.setTimezone(config);
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
function getPipesTimezone() {
    return timezone_service_1.default.getTimezone();
}
//# sourceMappingURL=timezone.config.js.map