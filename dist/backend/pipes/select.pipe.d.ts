import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../types/pipes.types';
export default class SelectPipe implements PipeTransform {
    transform(value: string, metadata?: any): Pipes.Select | undefined;
}
//# sourceMappingURL=select.pipe.d.ts.map