import { PipeTransform } from '@nestjs/common';
import { Pipes } from '../../index';
/**
 * OrderByPipe is a PipeTransform class that is used to transform a string into a Pipes.Select object.
 */
export default class OrderByPipe implements PipeTransform {
    /**
     * Transforms a string into a Pipes.Select object.
     * @param value The string to be transformed.
     * @returns The Pipes.Select object created from the string.
     * @throws BadRequestException if the string is null or invalid.
     */
    transform(value: string): Pipes.Select | undefined;
}
