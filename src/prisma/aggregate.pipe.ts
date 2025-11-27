import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import parseObjectLiteral from '../helpers/parse-object-literal';
import { Pipes } from 'src/pipes.types';


/**
 * Supported aggregation functions
 */
const AGGREGATE_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count'] as const;
type AggregateFunction = typeof AGGREGATE_FUNCTIONS[number];

/**
 * Parse aggregate function with parameters
 */
function parseAggregateFunction(value: string): {
	function: AggregateFunction;
	params: string[];
} | null {
	if (!value || typeof value !== 'string') return null;
	const match = /^(sum|avg|min|max|count)(?:\(([^)]*)\))?$/i.exec(value.trim());

	if (!match) return null;

	const [, func, paramsStr] = match;
	const params = paramsStr
		? paramsStr.split(',').map(p => p.trim()).filter(Boolean)
		: [];

	return {
		function: func.toLowerCase() as AggregateFunction,
		params,
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
 * Parse chart configuration
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

	const chartTypes: Pipes.ChartType[] = ['bar', 'line', 'pie', 'area', 'donut'];

	if (chartTypes.includes(value.toLowerCase() as Pipes.ChartType)) {
		return { type: value.toLowerCase() as Pipes.ChartType };
	}

	// Pattern baru: mendukung interval:year
	const match = /^(bar|line|pie|area|donut)\(([^,)]+)(?:,\s*([^):]+)(?::(\d+))?)?\)$/i.exec(value.trim());

	if (!match) return null;

	const [, type, firstParam, intervalPart, yearPart] = match;
	const chartType = type.toLowerCase() as Pipes.ChartType;

	const timeIntervals = ['day', 'month', 'year'];
	const interval = intervalPart?.toLowerCase().trim();
	const year = yearPart ? parseInt(yearPart, 10) : undefined;

	if (interval && timeIntervals.includes(interval)) {
		return {
			type: chartType,
			dateField: firstParam.trim(),
			interval: interval as Pipes.TimeInterval,
			year,
		};
	}

	const options: any = { type: chartType, groupField: firstParam.trim() };

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
	const keys = path.split('.');
	let value = obj;

	for (const key of keys) {
		if (value == null) return null;
		value = value[key];
	}

	return value;
}



/**
 * Perform manual aggregation with relationships
 * This is the solution for Prisma's limitation with groupBy + relations
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

	// Merge select and include
	const queryOptions: any = { where };

	if (Object.keys(scalarSelect).length > 0) {
		queryOptions.select = { ...scalarSelect };
	}

	if (Object.keys(relationInclude).length > 0) {
		if (queryOptions.select) {
			// If we have select, we need to merge include into it
			Object.keys(relationInclude).forEach(key => {
				queryOptions.select[key] = relationInclude[key];
			});
		} else {
			queryOptions.include = relationInclude;
		}
	}

	// Fetch data with optimized query
	const allData = await prismaModel.findMany(queryOptions);

	// Step 2: Group data manually
	const groups = new Map<string, any[]>();

	for (const item of allData) {
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
			const { relation, field: fieldName } = field.includes('.')
				? parseRelationshipPath(field)
				: { relation: '', field };

			if (relation) {
				// Store as nested object for consistency
				if (!result[relation]) {
					result[relation] = {};
				}
				result[relation][fieldName] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
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

		// Direct year string
		if (/^\d{4}$/.test(str)) {
			year = parseInt(str, 10);
		}
		// Try parse as date
		else {
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
 * Generate time series labels - FIXED untuk year interval
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
			// ✅ FIX: Hanya generate untuk 1 tahun saja
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
				// Generate 5 tahun ke belakang dari tahun yang ditentukan
				for (let i = 4; i >= 0; i--) {
					labels.push((specifiedYear - i).toString());
				}
			} else if (yearRange) {
				// ✅ FIX: Generate dari minYear sampai maxYear
				for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) {
					labels.push(y.toString());
				}
			} else {
				// Fallback: 5 tahun terakhir
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
			// Expected: "2024" or Date
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
			// Expected: "01", "1", "January", "Jan", or Date
			let month: number | null = null;

			// Numeric month
			if (/^\d{1,2}$/.test(str)) {
				month = parseInt(str, 10);
			}
			// Text month
			else {
				const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
					'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
				const monthIndex = monthNames.findIndex(m =>
					str.toLowerCase().startsWith(m)
				);
				if (monthIndex >= 0) {
					month = monthIndex + 1;
				}
			}

			// Try as full date
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
			// Expected: "15", "2024-01-15", or Date
			// For day interval, we need full date context

			// Try as full date first
			const date = new Date(str);
			if (!isNaN(date.getTime())) {
				const year = date.getUTCFullYear();
				const month = String(date.getUTCMonth() + 1).padStart(2, '0');
				const day = String(date.getUTCDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			}

			// If just day number, need context
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
 * Enhanced getTimeKey that handles string dates
 */
function getTimeKeyEnhanced(
	value: Date | string | number,
	interval: Pipes.TimeInterval,
	contextYear?: number,
	contextMonth?: number
): string {
	// Handle Date object
	if (value instanceof Date) {
		return getTimeKey(value, interval);
	}

	// Handle string/number
	const result = parseStringToTimeKey(value, interval, contextYear, contextMonth);
	if (result) return result;

	// Fallback: try to parse as date
	try {
		const date = new Date(value);
		if (!isNaN(date.getTime())) {
			return getTimeKey(date, interval);
		}
	} catch { }

	// Last resort: return as string
	return String(value ?? 'null');
}

/**
 * Transform data to chart series format
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
			name: `${agg.function}(${agg.field})`,
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

	// TIME SERIES CHART - ENHANCED
	if (chartConfig?.dateField && chartConfig?.interval) {
		const nonDateGroupFields = groupBy?.filter(field => field !== chartConfig.dateField) || [];
		const hasGrouping = nonDateGroupFields.length > 0;

		// Extract year range dari data aktual
		const yearRange = extractYearRangeFromData(
			dataArray,
			chartConfig.dateField,
			chartConfig.interval
		);

		// Generate labels berdasarkan data aktual
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
				const groupValue = String(getNestedValue(item, groupField) ?? 'null');

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
					const seriesName = `${groupValue} - ${func}(${field})`;

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
			const seriesName = `${func}(${field})`;

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

	// GROUPED (non-time-series) CHART
	if (groupBy && groupBy.length > 0) {
		const categoryField = chartConfig?.groupField || groupBy[0];

		const categories = dataArray.map(item => {
			const val = getNestedValue(item, categoryField);
			if (val instanceof Date) {
				return getTimeKey(val, 'day');
			}
			return String(val ?? 'null');
		});

		const series = aggregates.map((agg: Pipes.AggregateSpec) => {
			const { function: func, field } = agg;
			const seriesName = `${func}(${field})`;

			const seriesData = dataArray.map(item => {
				if (func === 'count') {
					return typeof item._count === 'number' ? item._count : (item._count?.[field] || item._count || 0);
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
		const seriesName = `${func}(${field})`;

		const seriesData = dataArray.map(item => {
			if (func === 'count') {
				return typeof item._count === 'number' ? item._count : (item._count?.[field] || item._count || 0);
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
 * FIXED: Manual aggregation untuk TIME SERIES dengan year filtering
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
	// Step 1: Fetch semua data dengan select minimal
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

	// // ✅ DEBUG: Log data sebelum filter
	// console.log('Total data fetched:', allData.length);
	// console.log('Year to filter:', year);

	// ✅ FIX: Filter data berdasarkan year jika ditentukan
	let filteredData = allData;
	if (year) {
		filteredData = allData.filter((item: any) => {
			const dateValue = getNestedValue(item, dateField);
			if (!dateValue) return false;

			try {
				// Handle string format "Jan 2025", "2025", atau Date object
				const str = String(dateValue).trim();

				// Check if it's already in "MMM YYYY" format
				if (/^[A-Za-z]{3}\s\d{4}$/.test(str)) {
					const yearMatch = str.match(/\d{4}$/);
					return yearMatch ? parseInt(yearMatch[0], 10) === year : false;
				}

				// Check if it's just a year "2025"
				if (/^\d{4}$/.test(str)) {
					return parseInt(str, 10) === year;
				}

				// Try parsing as date
				const date = new Date(dateValue);
				if (isNaN(date.getTime())) return false;
				return date.getUTCFullYear() === year;
			} catch {
				return false;
			}
		});
	}

	// ✅ DEBUG: Log data setelah filter
	// console.log('Filtered data count:', filteredData.length);

	// Step 2: Extract year range untuk generate labels
	const yearRange = year
		? { minYear: year, maxYear: year }
		: extractYearRangeFromData(filteredData, dateField, interval);

	// Step 3: Group data by (groupBy fields + time interval)
	const groups = new Map<string, any[]>();

	for (const item of filteredData) {
		const dateValue = getNestedValue(item, dateField);
		if (!dateValue) continue;

		// Generate time key dari dateValue
		const timeKey = getTimeKeyEnhanced(dateValue, interval, yearRange?.minYear);

		// Generate group key dari groupBy fields
		const groupKey = groupBy.length > 0
			? groupBy.map(field => {
				const value = getNestedValue(item, field);
				return String(value ?? 'null');
			}).join('|||')
			: 'default';

		// Combine group + time key
		const compositeKey = `${groupKey}|||${timeKey}`;

		if (!groups.has(compositeKey)) {
			groups.set(compositeKey, []);
		}
		groups.get(compositeKey)!.push(item);
	}

	// Step 4: Calculate aggregates untuk setiap group
	const results: any[] = [];

	for (const [compositeKey, items] of groups.entries()) {
		const result: any = {};
		const parts = compositeKey.split('|||');
		const timeKey = parts.pop()!;
		const groupKeyParts = parts.join('|||').split('|||');

		// Add groupBy fields ke result
		if (groupBy.length > 0) {
			groupBy.forEach((field, idx) => {
				const { relation, field: fieldName } = field.includes('.')
					? parseRelationshipPath(field)
					: { relation: '', field };

				if (relation) {
					if (!result[relation]) {
						result[relation] = {};
					}
					result[relation][fieldName] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
				} else {
					result[field] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
				}
			});
		}

		// Add time key ke result
		result[dateField] = timeKey;

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

	// Add scalar fields from allFields
	for (const field of allFields) {
		if (!field.includes('.')) {
			select[field] = true;
		}
	}

	// Add scalar fields from aggregates
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

// ... (semua fungsi helper time series yang sama)
// getTimeKey, getTimeKeyEnhanced, extractYearRangeFromData, 
// generateTimeSeriesLabelsEnhanced, parseStringToTimeKey, dll.

/**
 * Aggregate Pipe - FIXED untuk time series tanpa groupBy datetime
 */
@Injectable()
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

				if (val) {
					const aggFunc = parseAggregateFunction(val);
					if (aggFunc) {
						aggregates.push({
							field: key,
							function: aggFunc.function,
							params: aggFunc.params,
						});
					}
				}
			}

			if (aggregates.length === 0) {
				throw new BadRequestException('At least one aggregate function is required');
			}

			// ✅ KEY FIX: Deteksi time series chart
			const isTimeSeriesChart = !!(chartConfig?.dateField && chartConfig?.interval);

			if (isTimeSeriesChart) {
				// TIME SERIES: Gunakan manual aggregation, JANGAN tambahkan dateField ke groupBy
				const finalGroupBy = groupByFields.filter(f => f !== chartConfig!.dateField);

				return {
					prismaQuery: null as any,
					aggregates,
					groupBy: finalGroupBy, // ✅ groupBy TANPA dateField
					isGrouped: true,
					chartConfig,
					useManualAggregation: true,
					isTimeSeries: true, // ✅ Flag baru
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
	 * Execute aggregate query - FIXED dengan time series support
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
				aggregateConfig.chartConfig.year, // ✅ Pass year parameter
				where
			);

			// // ✅ DEBUG: Log untuk memverifikasi data
			// console.log('Execute result count:', result.length);
			// if (result.length > 0) {
			// 	console.log('Sample data:', result[0]);
			// }

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
					name: `${agg.function}(${agg.field})`,
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
				const seriesName = `${func}(${field})`;

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