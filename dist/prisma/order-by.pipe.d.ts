import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../../index';
/**
 * OrderByPipe is a PipeTransform implementation used to validate and parse
 * the orderBy query parameter.
 */
export default class OrderByPipe implements PipeTransform {
    /**
     * Validates and parses the orderBy query parameter.
     * @param value The orderBy query parameter.
     * @returns The parsed orderBy query parameter.
     * @throws BadRequestException if the orderBy query parameter is invalid.
     */
    transform(value: string): Pipes.Order | undefined;
}
