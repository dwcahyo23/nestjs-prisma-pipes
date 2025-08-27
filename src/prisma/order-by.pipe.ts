import {
	BadRequestException,
	Injectable,
	PipeTransform,
} from '@nestjs/common';
import { Pipes } from 'src/pipes.types';

/**
 * OrderByPipe is a PipeTransform implementation used to validate and parse
 * the orderBy query parameter.
 */
@Injectable()
export default class OrderByPipe implements PipeTransform {
	/**
	 * Validates and parses the orderBy query parameter.
	 * @param value The orderBy query parameter.
	 * @returns The parsed orderBy query parameter.
	 * @throws BadRequestException if the orderBy query parameter is invalid.
	 */
	transform(value: string): Pipes.Order | undefined {
		if (value == null || value.trim() === '') return undefined;

		try {
			const rules = value.split(',').map((val) => val.trim()).filter(Boolean);
			const orderBy: Pipes.Order = {};

			rules.forEach((rule) => {
				const [key, order] = rule.split(':').map((s) => s?.trim()) as [
					string,
					string | undefined
				];

				if (!key || !order) {
					throw new BadRequestException(
						`Invalid orderBy rule: "${rule}", must be "field:asc|desc"`
					);
				}

				const orderLowerCase = order.toLowerCase();
				if (!['asc', 'desc'].includes(orderLowerCase)) {
					throw new BadRequestException(`Invalid order: ${orderLowerCase}`);
				}

				orderBy[key] = orderLowerCase as 'asc' | 'desc';
			});

			return orderBy;
		} catch (error) {
			// console.error(error);
			throw new BadRequestException('Invalid orderBy query parameter');
		}
	}

}
