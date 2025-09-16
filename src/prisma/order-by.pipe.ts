import {
	BadRequestException,
	Injectable,
	PipeTransform,
} from '@nestjs/common';
import { Pipes } from 'src/pipes.types';

@Injectable()
export default class OrderByPipe implements PipeTransform {
	transform(value: string): Pipes.Order | undefined {
		if (value == null || value.trim() === '') return undefined;

		try {
			const rules = value
				.split(',')
				.map((val) => val.trim())
				.filter(Boolean);

			const orderBy: Pipes.Order = {};

			rules.forEach((rule) => {
				const [path, order] = rule.split(':').map((s) => s?.trim()) as [
					string,
					string | undefined,
				];

				if (!path || !order) {
					throw new BadRequestException(
						`Invalid orderBy rule: "${rule}", must be "field:asc|desc"`,
					);
				}

				const orderLowerCase = order.toLowerCase();
				if (!['asc', 'desc'].includes(orderLowerCase)) {
					throw new BadRequestException(`Invalid order: ${orderLowerCase}`);
				}

				// pecah nested path
				const keys = path.split('.');
				let current: any = orderBy;

				keys.forEach((key, index) => {
					if (index === keys.length - 1) {
						// last key → assign asc/desc
						current[key] = orderLowerCase as 'asc' | 'desc';
					} else {
						// kalau belum ada object di level ini, buat baru
						if (!current[key]) current[key] = {};
						else if (typeof current[key] !== 'object') {
							throw new BadRequestException(
								`Conflict in nested orderBy at "${key}"`,
							);
						}
						current = current[key];
					}
				});
			});

			return orderBy;
		} catch (error) {
			throw new BadRequestException('Invalid orderBy query parameter');
		}
	}
}
