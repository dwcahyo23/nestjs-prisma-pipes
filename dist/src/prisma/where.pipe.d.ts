import { PipeTransform } from '@nestjs/common';
import { Pipes } from 'src/pipes.types';
export default class WherePipe implements PipeTransform {
    transform(value: string): Pipes.Where | undefined;
}
