import { PipeTransform } from '@nestjs/common';
import { Pipes } from 'src/pipes.types';
/**
 * @description Convert a string with field-to-field comparison support
 *
 * @example Basic comparison
 * "id: int(1), firstName: banana" → { id: 1, firstName: "banana" }
 *
 * @example Date range
 * "createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)"
 * → { createdAt: { gte: "2024-01-01T00:00:00.000Z", lte: "2024-12-31T00:00:00.000Z" } }
 *
 * @example Same-table field comparison
 * "qty: lte field(recQty)" → { qty: { lte: { _ref: "recQty", _isFieldRef: true } } }
 *
 * @example Cross-table comparison (NEW)
 * "mesin.some.userMesin.some.createdAt: lte field($parent.createdAt)"
 * → {
 *     mesin: {
 *       some: {
 *         userMesin: {
 *           some: {
 *             createdAt: {
 *               lte: { _ref: "createdAt", _isFieldRef: true, _scope: "parent" }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * This enables: userMesin.createdAt <= workorder.createdAt
 */
export default class WherePipe implements PipeTransform {
    transform(value: string): Pipes.Where | undefined;
}
//# sourceMappingURL=where.pipe.d.ts.map