import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Pipes } from '../types/pipes.types';
import { decodePipeQuery } from '../utils/crypto.utils';

@Injectable()
export default class SelectPipe implements PipeTransform {
	/**
	 * Transforms a string into a Pipes.Select object.
	 * @param value The string to be transformed.
	 * @param metadata Optional metadata containing client IP
	 * @returns The Pipes.Select object created from the string.
	 * @throws BadRequestException if the string is null or invalid.
	 */
	transform(value: string, metadata?: any): Pipes.Select | undefined {
		if (value == null || value.trim() === '') {
			return undefined;
		}

		try {
			// ✅ Extract client IP from metadata
			const clientIp = metadata?.data?.clientIp;

			// ✅ Decode secure query
			const decodedValue = decodePipeQuery(value, clientIp);

			const selectFields = decodedValue.split(',').map((val) => val.trim());
			const select: Pipes.Select = {};

			selectFields.forEach((field) => {
				if (field.startsWith('-')) {
					select[field.replace('-', '')] = false;
				} else {
					select[field] = true;
				}
			});

			return select;
		} catch (error) {
			console.error(`Error transforming string to Pipes.Select: ${error}`);
			throw new BadRequestException('Invalid select query parameter');
		}
	}
}