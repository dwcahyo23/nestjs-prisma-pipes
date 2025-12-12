import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import parseObjectLiteral from '../helpers/parse-object-literal';
import { Pipes } from 'src/pipes.types';
import TimezoneService from './timezone.service';
import { AggregateSpec } from 'src';


/**
 * Supported aggregation functions
 */
const AGGREGATE_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count'] as const;
type AggregateFunction = typeof AGGREGATE_FUNCTIONS[number];


/**
 * Get time key with timezone awareness
 */
function getTimeKeyWithTimezone(date: Date, interval: Pipes.TimeInterval): string {
	const localDate = TimezoneService.utcToLocal(date);

	switch (interval) {
		case 'day': {
			const year = localDate.getUTCFullYear();
			const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
			const day = String(localDate.getUTCDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		}
		case 'month': {
			const normalized = new Date(Date.UTC(
				localDate.getUTCFullYear(),
				localDate.getUTCMonth(),
				1
			));
			return normalized.toLocaleString('en-US', {
				month: 'short',
				year: 'numeric',
				timeZone: 'UTC'
			});
		}
		case 'year':
			return localDate.getUTCFullYear().toString();
	}
}


/**
 * ✅ FIXED: Parse aggregate function with alias support
 * Now handles nested relationships correctly
 */
function parseAggregateFunction(value: string): {
	function: AggregateFunction;
	params: string[];
	alias?: string;
} | null {
	if (!value || typeof value !== 'string') return null;

	// ✅ FIX: Split by :alias( more carefully
	// Handle cases where field might contain dots (relationships)
	const aliasPattern = /:alias\s*\(/i;
	const aliasIndex = value.search(aliasPattern);

	let funcPart = value.trim();
	let alias: string | undefined;

	if (aliasIndex !== -1) {
		funcPart = value.substring(0, aliasIndex).trim();

		// Extract alias content between parentheses
		const aliasStartIndex = value.indexOf('(', aliasIndex);
		if (aliasStartIndex !== -1) {
			let parenCount = 1;
			let aliasEndIndex = aliasStartIndex + 1;

			// Find matching closing parenthesis
			while (aliasEndIndex < value.length && parenCount > 0) {
				if (value[aliasEndIndex] === '(') parenCount++;
				else if (value[aliasEndIndex] === ')') parenCount--;
				aliasEndIndex++;
			}

			if (parenCount === 0) {
				alias = value.substring(aliasStartIndex + 1, aliasEndIndex - 1).trim();
			}
		}
	}

	// Parse function and parameters
	const match = /^(sum|avg|min|max|count)(?:\(([^)]*)\))?$/i.exec(funcPart);
	if (!match) return null;

	const [, func, paramsStr] = match;
	const params = paramsStr
		? paramsStr.split(',').map(p => p.trim()).filter(Boolean)
		: [];

	return {
		function: func.toLowerCase() as AggregateFunction,
		params,
		alias,
	};
}

/**
 * Parse groupBy configuration
 */
function parseGroupBy(value: string): string[] | null {
	if (!value || typeof value !== 'string') return null;

	const trimmed = value.trim();

	// Must be wrapped in parentheses
	if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
		return null;
	}

	const fields = trimmed.slice(1, -1);
	if (!fields.trim()) return null;

	return fields.split(',').map(f => f.trim()).filter(Boolean);
}

/**
 * Check if any groupBy field contains a relationship (has ".")
 */
function hasRelationshipInGroupBy(groupBy: string[]): boolean {
	return groupBy.some(field => field.includes('.'));
}


/**
 * ✅ UPDATED: Parse chart configuration with all chart types
 * Supports: bar, line, pie, scatter, area, heatmap, radar, funnel, gauge, mixed, donut
 */
/**
 * ✅ FIXED: Parse chart configuration
 */
function parseChartConfig(value: string): {
	type: Pipes.ChartType;
	groupField?: string;
	dateField?: string;
	interval?: Pipes.TimeInterval;
	year?: number;
	stacked?: boolean;
	horizontal?: boolean;
} | null {
	if (!value || typeof value !== 'string') return null;

	// ✅ All 11 chart types
	const chartTypes: Pipes.ChartType[] = [
		'bar',
		'line',
		'pie',
		'scatter',
		'area',
		'heatmap',
		'radar',
		'funnel',
		'gauge',
		'mixed',
		'donut'
	];

	const trimmedValue = value.toLowerCase().trim();

	// Check 1: Without parentheses
	if (chartTypes.includes(trimmedValue as Pipes.ChartType)) {
		return { type: trimmedValue as Pipes.ChartType };
	}

	// Check 2: Empty parentheses
	const emptyParenMatch = /^(bar|line|pie|scatter|area|heatmap|radar|funnel|gauge|mixed|donut)\(\s*\)$/i.exec(trimmedValue);
	if (emptyParenMatch) {
		return { type: emptyParenMatch[1].toLowerCase() as Pipes.ChartType };
	}

	// Check 3: With parameters
	const match = /^(bar|line|pie|scatter|area|heatmap|radar|funnel|gauge|mixed|donut)\(([^,)]+)(?:,\s*([^):]+)(?::(\d+))?)?\)$/i.exec(trimmedValue);

	if (!match) return null;

	const [, type, firstParam, intervalPart, yearPart] = match;
	const chartType = type.toLowerCase() as Pipes.ChartType;

	const timeIntervals = ['day', 'month', 'year'];
	const interval = intervalPart?.toLowerCase().trim();
	const year = yearPart ? parseInt(yearPart, 10) : undefined;

	// Time series
	if (interval && timeIntervals.includes(interval)) {
		return {
			type: chartType,
			dateField: firstParam.trim(),
			interval: interval as Pipes.TimeInterval,
			year,
		};
	}

	// Regular chart with groupField
	const options: any = { type: chartType, groupField: firstParam.trim() };

	// Additional options
	if (intervalPart) {
		const option = intervalPart.toLowerCase().trim();
		if (option === 'stacked') {
			options.stacked = true;
		} else if (option === 'horizontal') {
			options.horizontal = true;
		}
	}

	return options;
}

/**
 * Generate time series labels
 */
function generateTimeSeriesLabels(interval: Pipes.TimeInterval, year?: number): string[] {
	const currentYear = year || new Date().getFullYear();
	const labels: string[] = [];

	switch (interval) {
		case 'day':
			for (let m = 0; m < 12; m++) {
				const daysInMonth = new Date(Date.UTC(currentYear, m + 1, 0)).getUTCDate();
				for (let d = 1; d <= daysInMonth; d++) {
					const month = String(m + 1).padStart(2, '0');
					const day = String(d).padStart(2, '0');
					labels.push(`${currentYear}-${month}-${day}`);
				}
			}
			break;
		case 'month':
			for (let i = 0; i < 12; i++) {
				const date = new Date(Date.UTC(currentYear, i, 1));
				labels.push(date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }));
			}
			break;
		case 'year':
			for (let i = 4; i >= 0; i--) {
				labels.push((currentYear - i).toString());
			}
			break;
	}

	return labels;
}

/**
 * Get time key from date
 */
function getTimeKey(date: Date | string, interval: Pipes.TimeInterval): string {
	const d = date instanceof Date ? date : new Date(date);

	switch (interval) {
		case 'day': {
			const year = d.getUTCFullYear();
			const month = String(d.getUTCMonth() + 1).padStart(2, '0');
			const day = String(d.getUTCDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		}
		case 'month': {
			const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
			return normalized.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
		}
		case 'year':
			return d.getUTCFullYear().toString();
	}
}


/**
 * Get nested property value
 */
function getNestedValue(obj: any, path: string): any {
	if (!path) return obj;

	const keys = path.split('.');
	let value = obj;

	for (const key of keys) {
		if (value == null) return null;
		value = value[key];

		// Handle array relationships - return null if we hit an array
		if (Array.isArray(value)) {
			return null;
		}
	}

	return value;
}

function extractDisplayValue(value: any, fieldPath?: string): string {
	if (value === null || value === undefined) {
		return 'null';
	}

	if (typeof value !== 'object') {
		return String(value);
	}

	if (value instanceof Date) {
		return getTimeKey(value, 'day');
	}

	// ✅ CRITICAL FIX: Navigate from root object using full fieldPath
	if (fieldPath && fieldPath.includes('.')) {
		// fieldPath is the FULL path from root, so we need to navigate from value (which is root)
		const pathValue = getNestedValue(value, fieldPath);

		if (pathValue !== null && pathValue !== undefined) {
			if (typeof pathValue !== 'object') {
				return String(pathValue);
			}
			if (pathValue instanceof Date) {
				return getTimeKey(pathValue, 'day');
			}
		}
	}

	// Fallback logic...
	let current: any = value;
	let depth = 0;

	while (current != null && typeof current === 'object' && !Array.isArray(current) && !(current instanceof Date) && depth < 10) {
		const keys = Object.keys(current).filter(k => !k.startsWith('_'));
		if (keys.length === 0) break;
		if (keys.length === 1) {
			current = current[keys[0]];
			depth++;
		} else {
			break;
		}
	}

	if (current !== value && typeof current !== 'object') {
		return String(current);
	}

	return JSON.stringify(value);
}


function flattenArrayRelationships(
	data: any[],
	groupByFields: string[]
): any[] {
	const arrayFields = groupByFields.filter(field => field.includes('.'));

	if (arrayFields.length === 0) {
		return data;
	}

	const flattened: any[] = [];

	for (const item of data) {
		// Find which groupBy field is an array relationship
		const arrayRelationField = arrayFields.find(field => {
			const relationName = field.split('.')[0];
			const value = item[relationName];
			return Array.isArray(value);
		});

		if (arrayRelationField) {
			const relationName = arrayRelationField.split('.')[0];
			const arrayValue = item[relationName];

			if (Array.isArray(arrayValue) && arrayValue.length > 0) {
				// Create one record per array item
				for (const arrayItem of arrayValue) {
					const flattenedItem = { ...item };
					// Replace array with single item
					flattenedItem[relationName] = arrayItem;
					flattened.push(flattenedItem);
				}
			} else {
				// No array items, skip or keep as null
				const flattenedItem = { ...item };
				flattenedItem[relationName] = null;
				flattened.push(flattenedItem);
			}
		} else {
			flattened.push(item);
		}
	}

	return flattened;
}


/**
 * Enhanced manual aggregate with array relationship support
 */
async function manualAggregateWithRelationships(
	prismaModel: any,
	aggregates: Pipes.AggregateSpec[],
	groupBy: string[],
	where?: any
): Promise<any[]> {
	// Step 1: Build optimized select and include
	const scalarSelect = buildSelectForFields(groupBy, aggregates);
	const relationInclude = buildIncludeForRelationships(groupBy, aggregates);

	const queryOptions: any = { where };

	if (Object.keys(scalarSelect).length > 0) {
		queryOptions.select = { ...scalarSelect };
	}

	if (Object.keys(relationInclude).length > 0) {
		if (queryOptions.select) {
			Object.keys(relationInclude).forEach(key => {
				queryOptions.select[key] = relationInclude[key];
			});
		} else {
			queryOptions.include = relationInclude;
		}
	}

	// Fetch data with optimized query
	const allData = await prismaModel.findMany(queryOptions);

	// ✅ NEW: Flatten array relationships before grouping
	const flattenedData = flattenArrayRelationships(allData, groupBy);

	// Step 2: Group data manually
	const groups = new Map<string, any[]>();

	for (const item of flattenedData) {
		// Build group key from groupBy fields
		const groupKey = groupBy.map(field => {
			const value = getNestedValue(item, field);
			return String(value ?? 'null');
		}).join('|||');

		if (!groups.has(groupKey)) {
			groups.set(groupKey, []);
		}
		groups.get(groupKey)!.push(item);
	}

	// Step 3: Calculate aggregates for each group
	const results: any[] = [];

	for (const [groupKey, items] of groups.entries()) {
		const result: any = {};

		// Add group by fields to result
		const groupKeyParts = groupKey.split('|||');
		groupBy.forEach((field, idx) => {
			if (field.includes('.')) {
				const parts = field.split('.');
				let current = result;

				// Navigate/create nested structure up to the last part
				for (let i = 0; i < parts.length - 1; i++) {
					if (!current[parts[i]]) {
						current[parts[i]] = {};
					}
					current = current[parts[i]];
				}

				// Set the final value
				const lastPart = parts[parts.length - 1];
				current[lastPart] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
			} else {
				result[field] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
			}
		});

		// Calculate aggregates
		for (const agg of aggregates) {
			const { function: func, field } = agg;
			const funcKey = `_${func}`;

			if (func === 'count') {
				result._count = result._count || {};
				result._count[field] = items.length;
			} else {
				result[funcKey] = result[funcKey] || {};

				const values = items
					.map(item => getNestedValue(item, field))
					.filter(v => v != null && typeof v === 'number');

				switch (func) {
					case 'sum':
						result[funcKey][field] = values.reduce((acc, v) => acc + v, 0);
						break;
					case 'avg':
						result[funcKey][field] = values.length > 0
							? values.reduce((acc, v) => acc + v, 0) / values.length
							: 0;
						break;
					case 'min':
						result[funcKey][field] = values.length > 0 ? Math.min(...values) : 0;
						break;
					case 'max':
						result[funcKey][field] = values.length > 0 ? Math.max(...values) : 0;
						break;
				}
			}
		}

		results.push(result);
	}

	return results;
}


/**
 * Enhanced manual aggregate for time series with array relationship support
 */
async function manualAggregateForTimeSeries(
	prismaModel: any,
	aggregates: Pipes.AggregateSpec[],
	groupBy: string[],
	dateField: string,
	interval: Pipes.TimeInterval,
	year: number | undefined,
	where?: any
): Promise<any[]> {
	// Step 1: Fetch data
	const scalarSelect = buildSelectForFields([...groupBy, dateField], aggregates);
	const relationInclude = buildIncludeForRelationships([...groupBy, dateField], aggregates);

	const queryOptions: any = { where };

	if (Object.keys(scalarSelect).length > 0) {
		queryOptions.select = { ...scalarSelect };
	}

	if (Object.keys(relationInclude).length > 0) {
		if (queryOptions.select) {
			Object.keys(relationInclude).forEach(key => {
				queryOptions.select[key] = relationInclude[key];
			});
		} else {
			queryOptions.include = relationInclude;
		}
	}

	const allData = await prismaModel.findMany(queryOptions);

	// ✅ Filter by year if specified
	let filteredData = allData;
	if (year) {
		filteredData = allData.filter((item: any) => {
			const dateValue = getNestedValue(item, dateField);
			if (!dateValue) return false;

			try {
				const str = String(dateValue).trim();

				if (/^[A-Za-z]{3}\s\d{4}$/.test(str)) {
					const yearMatch = str.match(/\d{4}$/);
					return yearMatch ? parseInt(yearMatch[0], 10) === year : false;
				}

				if (/^\d{4}$/.test(str)) {
					return parseInt(str, 10) === year;
				}

				const date = new Date(dateValue);
				if (isNaN(date.getTime())) return false;
				return date.getUTCFullYear() === year;
			} catch {
				return false;
			}
		});
	}

	// ✅ NEW: Flatten array relationships
	const flattenedData = flattenArrayRelationships(filteredData, groupBy);

	// Step 2: Extract year range
	const yearRange = year
		? { minYear: year, maxYear: year }
		: extractYearRangeFromData(flattenedData, dateField, interval);

	// Step 3: Group data
	const groups = new Map<string, any[]>();

	for (const item of flattenedData) {
		const dateValue = getNestedValue(item, dateField);
		if (!dateValue) continue;

		const timeKey = getTimeKeyEnhanced(dateValue, interval, yearRange?.minYear);

		const groupKey = groupBy.length > 0
			? groupBy.map(field => {
				const value = getNestedValue(item, field);
				return String(value ?? 'null');
			}).join('|||')
			: 'default';

		const compositeKey = `${groupKey}|||${timeKey}`;

		if (!groups.has(compositeKey)) {
			groups.set(compositeKey, []);
		}
		groups.get(compositeKey)!.push(item);
	}

	// Step 4: Calculate aggregates
	const results: any[] = [];

	for (const [compositeKey, items] of groups.entries()) {
		const result: any = {};
		const parts = compositeKey.split('|||');
		const timeKey = parts.pop()!;
		const groupKeyParts = parts.join('|||').split('|||');

		if (groupBy.length > 0) {
			groupBy.forEach((field, idx) => {
				if (field.includes('.')) {
					const fieldParts = field.split('.');
					let current = result;

					// Navigate/create nested structure up to the last part
					for (let i = 0; i < fieldParts.length - 1; i++) {
						if (!current[fieldParts[i]]) {
							current[fieldParts[i]] = {};
						}
						current = current[fieldParts[i]];
					}

					// Set the final value
					const lastPart = fieldParts[fieldParts.length - 1];
					current[lastPart] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
				} else {
					result[field] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
				}
			});
		}

		result[dateField] = timeKey;

		for (const agg of aggregates) {
			const { function: func, field } = agg;
			const funcKey = `_${func}`;

			if (func === 'count') {
				result._count = result._count || {};
				result._count[field] = items.length;
			} else {
				result[funcKey] = result[funcKey] || {};

				const values = items
					.map(item => getNestedValue(item, field))
					.filter(v => v != null && typeof v === 'number');

				switch (func) {
					case 'sum':
						result[funcKey][field] = values.reduce((acc, v) => acc + v, 0);
						break;
					case 'avg':
						result[funcKey][field] = values.length > 0
							? values.reduce((acc, v) => acc + v, 0) / values.length
							: 0;
						break;
					case 'min':
						result[funcKey][field] = values.length > 0 ? Math.min(...values) : 0;
						break;
					case 'max':
						result[funcKey][field] = values.length > 0 ? Math.max(...values) : 0;
						break;
				}
			}
		}

		results.push(result);
	}

	return results;
}

/**
 * Detect date field format type
 */
function detectDateFieldType(value: any): 'date' | 'year' | 'month' | 'day' | 'unknown' {
	if (!value) return 'unknown';

	const str = String(value).trim();

	// Try parsing as full date
	const dateTest = new Date(str);
	if (!isNaN(dateTest.getTime()) && str.includes('-')) {
		return 'date';
	}

	// Check if it's a 4-digit year
	if (/^\d{4}$/.test(str)) {
		return 'year';
	}

	// Check if it's a month (01-12 or January-December)
	if (/^(0?[1-9]|1[0-2])$/.test(str) ||
		/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(str)) {
		return 'month';
	}

	// Check if it's a day (01-31)
	if (/^(0?[1-9]|[12]\d|3[01])$/.test(str)) {
		return 'day';
	}

	return 'unknown';
}

/**
 * Extract year range from actual data
 */
function extractYearRangeFromData(
	dataArray: any[],
	dateField: string,
	interval: Pipes.TimeInterval
): { minYear: number; maxYear: number } | null {
	if (!dataArray || dataArray.length === 0) return null;

	const years: number[] = [];

	for (const item of dataArray) {
		const value = getNestedValue(item, dateField);
		if (!value) continue;

		const str = String(value).trim();
		let year: number | null = null;

		if (/^[A-Za-z]{3}\s\d{4}$/.test(str)) {
			const yearMatch = str.match(/\d{4}$/);
			if (yearMatch) {
				year = parseInt(yearMatch[0], 10);
			}
		} else if (/^\d{4}$/.test(str)) {
			year = parseInt(str, 10);
		} else {
			try {
				const date = new Date(str);
				if (!isNaN(date.getTime())) {
					year = date.getUTCFullYear();
				}
			} catch { }
		}

		if (year && year >= 1900 && year <= 2100) {
			years.push(year);
		}
	}

	if (years.length === 0) return null;

	return {
		minYear: Math.min(...years),
		maxYear: Math.max(...years)
	};
}

/**
 * Generate time series labels
 */
function generateTimeSeriesLabelsEnhanced(
	interval: Pipes.TimeInterval,
	yearRange?: { minYear: number; maxYear: number },
	specifiedYear?: number
): string[] {
	const labels: string[] = [];
	const currentYear = new Date().getFullYear();

	switch (interval) {
		case 'day': {
			const year = specifiedYear || yearRange?.minYear || currentYear;
			for (let m = 0; m < 12; m++) {
				const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
				for (let d = 1; d <= daysInMonth; d++) {
					const month = String(m + 1).padStart(2, '0');
					const day = String(d).padStart(2, '0');
					labels.push(`${year}-${month}-${day}`);
				}
			}
			break;
		}

		case 'month': {
			const year = specifiedYear || yearRange?.minYear || currentYear;
			for (let i = 0; i < 12; i++) {
				const date = new Date(Date.UTC(year, i, 1));
				labels.push(date.toLocaleString('en-US', {
					month: 'short',
					year: 'numeric',
					timeZone: 'UTC'
				}));
			}
			break;
		}

		case 'year': {
			if (specifiedYear) {
				for (let i = 4; i >= 0; i--) {
					labels.push((specifiedYear - i).toString());
				}
			} else if (yearRange) {
				for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) {
					labels.push(y.toString());
				}
			} else {
				for (let i = 4; i >= 0; i--) {
					labels.push((currentYear - i).toString());
				}
			}
			break;
		}
	}

	return labels;
}

/**
 * Parse string value to standardized format based on interval
 */
function parseStringToTimeKey(
	value: any,
	interval: Pipes.TimeInterval,
	contextYear?: number,
	contextMonth?: number
): string | null {
	if (!value) return null;

	const str = String(value).trim();
	const currentYear = contextYear || new Date().getFullYear();

	switch (interval) {
		case 'year': {
			if (/^\d{4}$/.test(str)) {
				return str;
			}
			const date = new Date(str);
			if (!isNaN(date.getTime())) {
				return date.getUTCFullYear().toString();
			}
			return null;
		}

		case 'month': {
			let month: number | null = null;

			if (/^\d{1,2}$/.test(str)) {
				month = parseInt(str, 10);
			} else {
				const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
					'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
				const monthIndex = monthNames.findIndex(m =>
					str.toLowerCase().startsWith(m)
				);
				if (monthIndex >= 0) {
					month = monthIndex + 1;
				}
			}

			if (month === null) {
				const date = new Date(str);
				if (!isNaN(date.getTime())) {
					month = date.getUTCMonth() + 1;
				}
			}

			if (month !== null && month >= 1 && month <= 12) {
				const date = new Date(Date.UTC(currentYear, month - 1, 1));
				return date.toLocaleString('en-US', {
					month: 'short',
					year: 'numeric',
					timeZone: 'UTC'
				});
			}

			return null;
		}
		case 'day': {
			const date = new Date(str);
			if (!isNaN(date.getTime())) {
				const year = date.getUTCFullYear();
				const month = String(date.getUTCMonth() + 1).padStart(2, '0');
				const day = String(date.getUTCDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			}

			if (/^\d{1,2}$/.test(str)) {
				const day = parseInt(str, 10);
				if (day >= 1 && day <= 31 && contextMonth) {
					const monthStr = String(contextMonth).padStart(2, '0');
					const dayStr = String(day).padStart(2, '0');
					return `${currentYear}-${monthStr}-${dayStr}`;
				}
			}

			return null;
		}
	}
}

/**
 * Enhanced getTimeKey that handles string dates with timezone awareness
 */
function getTimeKeyEnhanced(
	value: Date | string | number,
	interval: Pipes.TimeInterval,
	contextYear?: number,
	contextMonth?: number
): string {
	if (value instanceof Date) {
		return getTimeKeyWithTimezone(value, interval);
	}

	const result = parseStringToTimeKey(value, interval, contextYear, contextMonth);
	if (result) return result;

	try {
		const dateString = TimezoneService.addTimezoneToDateString(String(value));
		const date = new Date(dateString);
		if (!isNaN(date.getTime())) {
			return getTimeKeyWithTimezone(date, interval);
		}
	} catch { }

	return String(value ?? 'null');
}

/**
 * ✅ UPDATED: Get series name with proper alias handling
 */
function getSeriesName(agg: Pipes.AggregateSpec, groupValue?: string): string {
	// ✅ Priority 1: Use alias if provided
	if (agg.alias) {
		return groupValue ? `${groupValue} - ${agg.alias}` : agg.alias;
	}

	// ✅ Priority 2: Use default format
	const defaultName = `${agg.function}(${agg.field})`;
	return groupValue ? `${groupValue} - ${defaultName}` : defaultName;
}

/**
 * ✅ UPDATED: transformToChartSeries - use getSeriesName consistently
 */
function transformToChartSeries(
	data: any[],
	aggregates: Pipes.AggregateSpec[],
	chartConfig?: Pipes.ChartConfig,
	groupBy?: string[],
): Pipes.ChartSeries {
	const dataArray = Array.isArray(data) ? data : [];

	// Empty data handling
	if (!dataArray || dataArray.length === 0) {
		const series = aggregates.map(agg => ({
			name: getSeriesName(agg), // ✅ Use helper
			data: [0],
		}));

		return {
			categories: ['Total'],
			series,
			chartType: chartConfig?.type,
			stacked: chartConfig?.stacked,
			horizontal: chartConfig?.horizontal,
			raw: [],
		};
	}

	// TIME SERIES CHART
	if (chartConfig?.dateField && chartConfig?.interval) {
		const nonDateGroupFields = groupBy?.filter(field => field !== chartConfig.dateField) || [];
		const hasGrouping = nonDateGroupFields.length > 0;

		const yearRange = extractYearRangeFromData(
			dataArray,
			chartConfig.dateField,
			chartConfig.interval
		);

		const timeLabels = generateTimeSeriesLabelsEnhanced(
			chartConfig.interval,
			yearRange || undefined,
			chartConfig.year
		);

		// GROUPED TIME SERIES
		if (hasGrouping) {
			const groupField = chartConfig.groupField || nonDateGroupFields[0];
			const groupedDataMap = new Map<string, Map<string, any[]>>();

			dataArray.forEach(item => {
				const dateValue = getNestedValue(item, chartConfig.dateField!);
				const groupValue = extractDisplayValue(getNestedValue(item, groupField), groupField);

				if (dateValue) {
					const timeKey = getTimeKeyEnhanced(
						dateValue,
						chartConfig.interval!,
						chartConfig.year || yearRange?.minYear
					);

					if (!groupedDataMap.has(groupValue)) {
						groupedDataMap.set(groupValue, new Map());
					}

					const timeMap = groupedDataMap.get(groupValue)!;
					if (!timeMap.has(timeKey)) {
						timeMap.set(timeKey, []);
					}
					timeMap.get(timeKey)!.push(item);
				}
			});

			const series: Array<{ name: string; data: number[] }> = [];

			groupedDataMap.forEach((timeMap, groupValue) => {
				aggregates.forEach((agg: Pipes.AggregateSpec) => {
					const { function: func, field } = agg;
					// ✅ Use helper with group value
					const seriesName = getSeriesName(agg, groupValue);

					const seriesData = timeLabels.map(label => {
						const items = timeMap.get(label);
						if (!items || items.length === 0) return 0;

						if (func === 'count') {
							return items.reduce((acc, it) => {
								const val = typeof it._count === 'number'
									? it._count
									: (it._count?.[field] || it._count || 0);
								return acc + (typeof val === 'number' ? val : 0);
							}, 0);
						}

						return items.reduce((acc, it) => {
							const val = it[`_${func}`]?.[field] || 0;
							return acc + (typeof val === 'number' ? val : 0);
						}, 0);
					});

					series.push({ name: seriesName, data: seriesData });
				});
			});

			return {
				categories: timeLabels,
				series,
				chartType: chartConfig.type,
				stacked: chartConfig.stacked,
				horizontal: chartConfig.horizontal,
				raw: dataArray,
			};
		}

		// REGULAR TIME SERIES
		const dataMap = new Map<string, any[]>();

		dataArray.forEach(item => {
			const dateValue = getNestedValue(item, chartConfig.dateField!);
			if (dateValue) {
				const key = getTimeKeyEnhanced(
					dateValue,
					chartConfig.interval!,
					yearRange?.minYear
				);
				if (!dataMap.has(key)) {
					dataMap.set(key, []);
				}
				dataMap.get(key)!.push(item);
			}
		});

		const series = aggregates.map((agg: Pipes.AggregateSpec) => {
			const { function: func, field } = agg;
			// ✅ Use helper
			const seriesName = getSeriesName(agg);

			const seriesData = timeLabels.map(label => {
				const items = dataMap.get(label);
				if (!items || items.length === 0) return 0;

				if (func === 'count') {
					return items.reduce((acc, it) => {
						const val = typeof it._count === 'number'
							? it._count
							: (it._count?.[field] || it._count || 0);
						return acc + (typeof val === 'number' ? val : 0);
					}, 0);
				}

				return items.reduce((acc, it) => {
					const val = it[`_${func}`]?.[field] || 0;
					return acc + (typeof val === 'number' ? val : 0);
				}, 0);
			});

			return { name: seriesName, data: seriesData };
		});

		return {
			categories: timeLabels,
			series,
			chartType: chartConfig.type,
			stacked: chartConfig.stacked,
			horizontal: chartConfig.horizontal,
			raw: dataArray,
		};
	}

	// GROUPED CHART (non-time-series)
	if (groupBy && groupBy.length > 0) {
		const categoryField = chartConfig?.groupField || groupBy[0];

		const categories = dataArray.map(item => {
			// ✅ FIXED: Pass full item to extractDisplayValue
			const displayValue = extractDisplayValue(item, categoryField);
			console.log(`Extracting category from field "${categoryField}":`, displayValue); // Debug log
			return displayValue;
		});

		const series = aggregates.map((agg: Pipes.AggregateSpec) => {
			const { function: func, field } = agg;
			// ✅ Use helper
			const seriesName = getSeriesName(agg);

			const seriesData = dataArray.map(item => {
				if (func === 'count') {
					return typeof item._count === 'number'
						? item._count
						: (item._count?.[field] || item._count || 0);
				}
				return item[`_${func}`]?.[field] || 0;
			});

			return { name: seriesName, data: seriesData };
		});

		return {
			categories,
			series,
			chartType: chartConfig?.type,
			stacked: chartConfig?.stacked,
			horizontal: chartConfig?.horizontal,
			raw: dataArray,
		};
	}

	// REGULAR CHART (no grouping)
	const categories = dataArray.map((_, idx) => `Category ${idx + 1}`);

	const series = aggregates.map((agg: Pipes.AggregateSpec) => {
		const { function: func, field } = agg;
		// ✅ Use helper
		const seriesName = getSeriesName(agg);

		const seriesData = dataArray.map(item => {
			if (func === 'count') {
				return typeof item._count === 'number'
					? item._count
					: (item._count?.[field] || item._count || 0);
			}
			return item[`_${func}`]?.[field] || 0;
		});

		return { name: seriesName, data: seriesData };
	});

	return {
		categories,
		series,
		chartType: chartConfig?.type,
		stacked: chartConfig?.stacked,
		horizontal: chartConfig?.horizontal,
		raw: dataArray,
	};
}



/**
 * Parse relationship path into relation name and field
 */
function parseRelationshipPath(path: string): { relation: string; field: string } {
	const parts = path.split('.');
	const field = parts.pop()!;
	const relation = parts.join('.');
	return { relation, field };
}


/**
 * Build select object for scalar fields
 */
function buildSelectForFields(
	allFields: string[],
	aggregates: Pipes.AggregateSpec[]
): Record<string, any> {
	const select: Record<string, any> = {};

	for (const field of allFields) {
		if (!field.includes('.')) {
			select[field] = true;
		}
	}

	for (const agg of aggregates) {
		if (!agg.field.includes('.')) {
			select[agg.field] = true;
		}
	}

	return select;
}

/**
 * Build include object for relationships
 */
function buildIncludeForRelationships(
	allFields: string[],
	aggregates: Pipes.AggregateSpec[]
): Record<string, any> {
	const include: Record<string, any> = {};

	const relationPaths = [
		...allFields.filter(f => f.includes('.')),
		...aggregates.filter(agg => agg.field.includes('.')).map(agg => agg.field)
	];

	for (const path of relationPaths) {
		const { relation, field } = parseRelationshipPath(path);
		const parts = relation.split('.');
		let current = include;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];

			if (i === parts.length - 1) {
				if (!current[part]) {
					// ✅ Default to include all for array relationships
					current[part] = { select: {} };
				}
				if (typeof current[part] === 'object' && 'select' in current[part]) {
					current[part].select[field] = true;
				}
			} else {
				if (!current[part]) {
					current[part] = { include: {} };
				}
				if (typeof current[part] === 'object' && 'include' in current[part]) {
					current = current[part].include;
				}
			}
		}
	}

	return include;
}


/**
 * ✅ CRITICAL FIX: Update AggregatePipe transform to properly store alias
 */
export default class AggregatePipe implements PipeTransform {
	transform(value: string): Pipes.Aggregate | undefined {
		if (!value || value.trim() === '') return undefined;

		try {
			const parsed = parseObjectLiteral(value);

			if (!parsed || parsed.length === 0) {
				throw new BadRequestException('Invalid aggregate query format');
			}

			const aggregates: Pipes.AggregateSpec[] = [];
			let chartConfig: Pipes.ChartConfig | undefined;
			let groupByFields: string[] = [];

			for (const [key, val] of parsed) {
				if (key.toLowerCase() === 'chart' && val) {
					const config = parseChartConfig(val);
					if (config) {
						chartConfig = config;
						continue;
					}
				}

				if (key.toLowerCase() === 'groupby') {
					if (val) {
						const fields = parseGroupBy(val);
						if (fields && fields.length > 0) {
							groupByFields = fields;
							continue;
						} else {
							throw new BadRequestException(
								'Invalid groupBy format. Use: groupBy: (field) or groupBy: (field1, field2)'
							);
						}
					} else {
						throw new BadRequestException(
							'groupBy requires fields. Use: groupBy: (field) or groupBy: (field1, field2)'
						);
					}
				}

				// ✅ Parse aggregate with alias
				if (val) {
					const aggFunc = parseAggregateFunction(val);
					if (aggFunc) {
						aggregates.push({
							field: key,
							function: aggFunc.function,
							params: aggFunc.params,
							alias: aggFunc.alias, // ✅ Store alias
						});
					}
				}
			}

			if (aggregates.length === 0) {
				throw new BadRequestException('At least one aggregate function is required');
			}

			const isTimeSeriesChart = !!(chartConfig?.dateField && chartConfig?.interval);

			if (isTimeSeriesChart) {
				const finalGroupBy = groupByFields.filter(f => f !== chartConfig!.dateField);

				return {
					prismaQuery: null as any,
					aggregates,
					groupBy: finalGroupBy,
					isGrouped: true,
					chartConfig,
					useManualAggregation: true,
					isTimeSeries: true,
				};
			}

			// NON-TIME-SERIES: Logic yang sama seperti sebelumnya
			let finalGroupBy: string[] = [];
			if (groupByFields.length > 0) {
				finalGroupBy = groupByFields;
			} else if (chartConfig?.groupField) {
				finalGroupBy = [chartConfig.groupField];
			}

			const isGrouped = finalGroupBy.length > 0;
			const hasRelationship = isGrouped && finalGroupBy.some(f => f.includes('.'));

			if (isGrouped) {
				if (hasRelationship) {
					return {
						prismaQuery: null as any,
						aggregates,
						groupBy: finalGroupBy,
						isGrouped: true,
						chartConfig,
						useManualAggregation: true,
						isTimeSeries: false,
					};
				}

				const prismaQuery = buildPrismaAggregate(aggregates);
				return {
					prismaQuery: {
						by: finalGroupBy,
						...prismaQuery,
					},
					aggregates,
					groupBy: finalGroupBy,
					isGrouped: true,
					chartConfig,
					useManualAggregation: false,
					isTimeSeries: false,
				};
			}

			const prismaQuery = buildPrismaAggregate(aggregates);
			return {
				prismaQuery,
				aggregates,
				groupBy: [],
				isGrouped: false,
				chartConfig,
				useManualAggregation: false,
				isTimeSeries: false,
			};
		} catch (error) {
			if (error instanceof BadRequestException) throw error;
			console.error('Error parsing aggregate query:', error);
			throw new BadRequestException('Invalid aggregate query format');
		}
	}

	/**
	 * Execute aggregate query
	 */
	static async execute(
		prismaModel: any,
		aggregateConfig: Pipes.Aggregate,
		where?: any
	): Promise<any> {
		// ✅ TIME SERIES: Pass year parameter ke manual aggregation
		if (aggregateConfig.isTimeSeries && aggregateConfig.chartConfig?.dateField) {
			const result = await manualAggregateForTimeSeries(
				prismaModel,
				aggregateConfig.aggregates,
				aggregateConfig.groupBy,
				aggregateConfig.chartConfig.dateField,
				aggregateConfig.chartConfig.interval!,
				aggregateConfig.chartConfig.year,
				where
			);

			return result;
		}

		// Manual aggregation untuk relationships (non-time-series)
		if (aggregateConfig.useManualAggregation) {
			return manualAggregateWithRelationships(
				prismaModel,
				aggregateConfig.aggregates,
				aggregateConfig.groupBy,
				where
			);
		}

		// Prisma native aggregation
		if (aggregateConfig.isGrouped) {
			return prismaModel.groupBy({
				...aggregateConfig.prismaQuery,
				where,
			});
		}

		return prismaModel.aggregate({
			...aggregateConfig.prismaQuery,
			where,
		});
	}

	/**
	 * Transform to chart series - sama seperti sebelumnya
	 */
	static toChartSeries(
		data: any[] | any,
		aggregateConfig: Pipes.Aggregate,
	): Pipes.ChartSeries {
		if (!aggregateConfig.isGrouped) {
			if (!data || (Array.isArray(data) && data.length === 0)) {
				const series = aggregateConfig.aggregates.map((agg: Pipes.AggregateSpec) => ({
					name: getSeriesName(agg), // ✅ Use helper with alias
					data: [0],
				}));

				return {
					categories: ['Total'],
					series,
					chartType: aggregateConfig.chartConfig?.type,
					stacked: aggregateConfig.chartConfig?.stacked,
					horizontal: aggregateConfig.chartConfig?.horizontal,
					raw: [],
				};
			}

			const series = aggregateConfig.aggregates.map((agg: Pipes.AggregateSpec) => {
				const { function: func, field } = agg;
				const seriesName = getSeriesName(agg);

				let dataValue = 0;
				if (func === 'count') {
					if (typeof data._count === 'number') {
						dataValue = data._count;
					} else {
						dataValue = data._count?.[field] || data._count || 0;
					}
				} else {
					dataValue = data[`_${func}`]?.[field] || 0;
				}

				return { name: seriesName, data: [dataValue] };
			});

			return {
				categories: ['Total'],
				series,
				chartType: aggregateConfig.chartConfig?.type,
				stacked: aggregateConfig.chartConfig?.stacked,
				horizontal: aggregateConfig.chartConfig?.horizontal,
				raw: Array.isArray(data) ? data : [data],
			};
		}

		const dataArray = Array.isArray(data) ? data : [data];
		return transformToChartSeries(
			dataArray,
			aggregateConfig.aggregates,
			aggregateConfig.chartConfig,
			aggregateConfig.groupBy
		);
	}
}

/**
 * Build Prisma aggregate object
 */
function buildPrismaAggregate(aggregates: Pipes.AggregateSpec[]): Record<string, any> {
	const aggregateObj: Record<string, any> = {};

	for (const agg of aggregates) {
		const { function: func, field, params } = agg;
		const funcKey = `_${func}`;

		if (func === 'count') {
			if (!params || params.length === 0 || params[0] === '*') {
				aggregateObj._count = true;
			} else {
				aggregateObj._count = aggregateObj._count || {};
				aggregateObj._count[field] = true;
			}
		} else {
			aggregateObj[funcKey] = aggregateObj[funcKey] || {};
			aggregateObj[funcKey][field] = true;
		}
	}

	return aggregateObj;
}

// Export fungsi manual aggregation
export { manualAggregateWithRelationships, manualAggregateForTimeSeries };