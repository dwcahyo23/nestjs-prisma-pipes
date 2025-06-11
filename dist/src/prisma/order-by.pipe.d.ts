import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../..';
export default class OrderByPipe implements PipeTransform {
    transform(value: string): Pipes.Order | undefined;
}
