import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../types/pipes.types';
export default class WherePipe implements PipeTransform {
    transform(value: string, metadata?: any): Pipes.Where | undefined;
}
//# sourceMappingURL=where.pipe.d.ts.map