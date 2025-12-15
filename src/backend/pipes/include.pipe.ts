import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { decodePipeQuery } from '../utils/crypto.utils';

export declare namespace IncludePipe {
	export type Include = Record<string, any>;
}

@Injectable()
export class IncludePipe implements PipeTransform {
	transform(value?: string, metadata?: any): IncludePipe.Include | undefined {
		if (!value) return undefined;

		try {
			// ✅ Extract client IP from metadata
			const clientIp = metadata?.data?.clientIp;

			// ✅ Decode secure query
			const decodedValue = decodePipeQuery(value, clientIp);

			const strValue = decodedValue.trim().replace(/\s+/g, '');
			if (!strValue) return undefined;

			const parts = this.splitTopLevel(strValue, ',');

			const include: Record<string, any> = {};

			for (const part of parts) {
				this.parseIncludePart(include, part);
			}

			return include;
		} catch (error) {
			console.error('Error parsing include:', error);
			throw new BadRequestException('Invalid include query parameter');
		}
	}

	private parseIncludePart(obj: any, part: string) {
		const selectMatch = part.match(/^(.*?)\.select:\((.*)\)$/);

		if (selectMatch) {
			const pathPart = selectMatch[1];
			const fieldsStr = selectMatch[2];

			const pathKeys = pathPart.split('.').filter(Boolean);

			const fields = this.parseFields(fieldsStr);

			this.assignNestedInclude(obj, pathKeys, { select: fields });
		} else {
			const pathKeys = part.split('.').filter(Boolean);
			this.assignNestedInclude(obj, pathKeys, true);
		}
	}

	private parseFields(fieldsStr: string): Record<string, any> {
		const fields: Record<string, any> = {};
		const parts = this.splitTopLevel(fieldsStr, ',');

		for (const part of parts) {
			// cek nested select di field
			const nestedSelectMatch = part.match(/^(.*?)\.select:\((.*)\)$/);
			if (nestedSelectMatch) {
				const key = nestedSelectMatch[1];
				const nestedFields = this.parseFields(nestedSelectMatch[2]);
				fields[key] = { select: nestedFields };
			} else {
				fields[part] = true;
			}
		}

		return fields;
	}

	private assignNestedInclude(
		obj: any,
		keys: string[],
		value: true | { select: Record<string, any> },
	) {
		const [first, ...rest] = keys;
		if (!obj[first]) obj[first] = {};

		if (rest.length === 0) {
			obj[first] = value;
		} else {
			if (obj[first] === true) obj[first] = {};
			if (!obj[first].include) obj[first].include = {};
			this.assignNestedInclude(obj[first].include, rest, value);
		}
	}

	private splitTopLevel(str: string, delimiter: string) {
		let depth = 0;
		const result: string[] = [];
		let current = '';

		for (const char of str) {
			if (char === '(') depth++;
			if (char === ')') depth--;
			if (char === delimiter && depth === 0) {
				result.push(current);
				current = '';
			} else {
				current += char;
			}
		}
		if (current) result.push(current);

		return result;
	}
}