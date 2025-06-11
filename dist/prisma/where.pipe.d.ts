import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../../index';
/**
 * @description Convert a string like
 * @example "id: int(1), firstName: banana" to { id: 1, firstName: "banana" }
 * */
export default class WherePipe implements PipeTransform {
    transform(value: string): Pipes.Where | undefined;
}
