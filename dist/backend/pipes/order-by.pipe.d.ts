import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../types/pipes.types';
export default class OrderByPipe implements PipeTransform {
    transform(value: string, metadata?: any): Pipes.Order[] | undefined;
}
//# sourceMappingURL=order-by.pipe.d.ts.map