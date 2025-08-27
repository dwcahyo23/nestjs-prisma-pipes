import { PipeTransform, Injectable } from '@nestjs/common';

export declare namespace IncludePipe {
	export type Include = Record<string, any>;
}

@Injectable()
export class IncludePipe implements PipeTransform {
	transform(value?: string): IncludePipe.Include | undefined {
		if (!value) return undefined;

		const strValue = value.trim().replace(/\s+/g, '');
		if (!strValue) return undefined;

		const parts = this.splitTopLevel(strValue, ',');

		const include: Record<string, any> = {};

		for (const part of parts) {
			const selectMatch = part.match(/^(.*?)\.select:\((.*?)\)$/);

			let pathPart: string;
			let fields: string[] | null = null;

			if (selectMatch) {
				pathPart = selectMatch[1];
				fields = selectMatch[2].split(',').filter(Boolean);
			} else {
				pathPart = part;
			}

			const pathKeys = pathPart.split('.').filter(Boolean);

			if (fields && fields.length > 0) {
				this.assignNestedInclude(include, pathKeys, {
					select: fields.reduce((acc, field) => {
						acc[field] = true;
						return acc;
					}, {} as Record<string, boolean>),
				});
			} else {
				this.assignNestedInclude(include, pathKeys, true);
			}
		}

		return include;
	}

	private assignNestedInclude(
		obj: any,
		keys: string[],
		value: true | { select: Record<string, boolean> },
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
