import {
	BadRequestException,
	Injectable,
	PipeTransform,
} from '@nestjs/common';
import { Pipes } from 'src/pipes.types';

/**
 * Parses ?orderBy=name:asc,profile.bio:desc into:
 * [
 *   { name: 'asc' },
 *   { profile: { bio: 'desc' } }
 * ]
 */
@Injectable()
export default class OrderByPipe implements PipeTransform {
	transform(value: string): Pipes.Order[] | undefined {
		if (!value || value.trim() === '') return undefined;

		try {
			const rules = value
				.split(',')
				.map((val) => val.trim())
				.filter(Boolean);

			const orderBy: Pipes.Order[] = [];

			for (const rule of rules) {
				const [key, order] = rule.split(':').map((s) => s?.trim()) as [
					string,
					string | undefined
				];

				if (!key || !order) {
					throw new BadRequestException(
						`Invalid orderBy rule: "${rule}", must be "field:asc|desc"`
					);
				}

				const orderLower = order.toLowerCase();
				if (!['asc', 'desc'].includes(orderLower)) {
					throw new BadRequestException(
						`Invalid order direction: ${orderLower}`
					);
				}

				// Support for nested relation e.g. profile.bio
				const keys = key.split('.');
				let nested: any = {};
				let current = nested;

				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (i === keys.length - 1) {
						current[k] = orderLower;
					} else {
						current[k] = {};
						current = current[k];
					}
				}

				orderBy.push(nested);
			}

			return orderBy;
		} catch {
			throw new BadRequestException('Invalid orderBy query parameter');
		}
	}
}
