import { PipeTransform } from '@nestjs/common';
import { Pipes } from 'src/pipes.types';
export default class OrderByPipe implements PipeTransform {
    transform(value: string): Pipes.Order[] | undefined;
}
//# sourceMappingURL=order-by.pipe.d.ts.map