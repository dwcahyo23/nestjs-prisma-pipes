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
 * Parse relationship path into relation name and field
 */
function parseRelationshipPath(path: string): { relation: string; field: string } {
	const parts = path.split('.');
	const field = parts.pop()!;
	const relation = parts.join('.');
	return { relation, field };
}

/**
 * Parse chart configuration
 */
function parseChartConfig(value: string): {
	type: Pipes.ChartType;
	groupField?: string;
	dateField?: string;
	interval?: Pipes.TimeInterval;
	stacked?: boolean;
	horizontal?: boolean;
} | null {
	if (!value || typeof value !== 'string') return null;

	const chartTypes: Pipes.ChartType[] = ['bar', 'line', 'pie', 'area', 'donut'];

	if (chartTypes.includes(value.toLowerCase() as Pipes.ChartType)) {
		return { type: value.toLowerCase() as Pipes.ChartType };
	}

	const match = /^(bar|line|pie|area|donut)\(([^,)]+)(?:,\s*([^)]+))?\)$/i.exec(value.trim());

	if (!match) return null;

	const [, type, firstParam, secondParam] = match;
	const chartType = type.toLowerCase() as Pipes.ChartType;

	const timeIntervals = ['day', 'month', 'year'];
	if (timeIntervals.includes(secondParam?.toLowerCase())) {
		return {
			type: chartType,
			dateField: firstParam.trim(),
			interval: secondParam.toLowerCase() as Pipes.TimeInterval,
		};
	}

	const options: any = { type: chartType, groupField: firstParam.trim() };

	if (secondParam) {
		const option = secondParam.toLowerCase().trim();
		if (option === 'stacked') {
			options.stacked = true;
		} else if (option === 'horizontal') {
			options.horizontal = true;
		} else if (timeIntervals.includes(option)) {
			options.dateField = firstParam.trim();
			options.interval = option as Pipes.TimeInterval;
			delete options.groupField;
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
 * Build Prisma aggregate object (for non-grouped queries)
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

/**
 * Build include object for fetching related data
 * This is the KEY for handling relationships in aggregation
 */
function buildIncludeForRelationships(groupBy: string[]): Record<string, any> {
	const include: Record<string, any> = {};

	for (const field of groupBy) {
		if (field.includes('.')) {
			const { relation } = parseRelationshipPath(field);

			// Build nested include structure
			const parts = relation.split('.');
			let current = include;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (i === parts.length - 1) {
					// Last part - just include it
					current[part] = true;
				} else {
					// Nested relation
					if (!current[part]) {
						current[part] = { include: {} };
					}
					current = current[part].include;
				}
			}
		}
	}

	return include;
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
	// Step 1: Fetch all data with relationships included
	const include = buildIncludeForRelationships(groupBy);

	const allData = await prismaModel.findMany({
		where,
		include: Object.keys(include).length > 0 ? include : undefined,
	});

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

	// Time series chart
	if (chartConfig?.dateField && chartConfig?.interval) {
		const nonDateGroupFields = groupBy?.filter(field => field !== chartConfig.dateField) || [];
		const hasGrouping = nonDateGroupFields.length > 0;

		let year: number | undefined;
		try {
			const dates = dataArray
				.map(item => getNestedValue(item, chartConfig.dateField!))
				.filter(Boolean)
				.map((d: any) => new Date(d));
			if (dates.length > 0) {
				const minYear = Math.min(...dates.map(d => d.getUTCFullYear()));
				year = minYear;
			}
		} catch {
			year = undefined;
		}

		const timeLabels = generateTimeSeriesLabels(chartConfig.interval, year);

		// Grouped time series
		if (hasGrouping) {
			const groupField = chartConfig.groupField || nonDateGroupFields[0];
			const groupedDataMap = new Map<string, Map<string, any[]>>();

			dataArray.forEach(item => {
				const dateValue = getNestedValue(item, chartConfig.dateField!);
				const groupValue = String(getNestedValue(item, groupField) ?? 'null');

				if (dateValue) {
					const timeKey = getTimeKey(new Date(dateValue), chartConfig.interval!);

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
								const val = typeof it._count === 'number' ? it._count : (it._count?.[field] || it._count || 0);
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

		// Regular time series
		const dataMap = new Map<string, any[]>();

		dataArray.forEach(item => {
			const dateValue = getNestedValue(item, chartConfig.dateField!);
			if (dateValue) {
				const key = getTimeKey(new Date(dateValue), chartConfig.interval!);
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
						const val = typeof it._count === 'number' ? it._count : (it._count?.[field] || it._count || 0);
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

	// Grouped (non-time-series) chart
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

	// Regular chart (no grouping)
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
 * Aggregate Pipe - Enhanced with relationship support
 * 
 * Now supports:
 * - Regular aggregation: aggregate=qty: sum(), recQty: sum()
 * - Grouped aggregation WITH relationships: aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
 * - Charts with relationships: aggregate=qty: sum(), groupBy: (marketingMasterCategory.category), chart: bar
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

			let finalGroupBy: string[] = [];
			if (groupByFields.length > 0) {
				finalGroupBy = groupByFields;
			} else if (chartConfig?.groupField) {
				finalGroupBy = [chartConfig.groupField];
			} else if (chartConfig?.dateField) {
				finalGroupBy = [chartConfig.dateField];
			}

			const isGrouped = finalGroupBy.length > 0;
			const hasRelationship = isGrouped && hasRelationshipInGroupBy(finalGroupBy);

			if (isGrouped) {
				if (hasRelationship) {
					// Use manual aggregation for relationships
					return {
						prismaQuery: null as any,
						aggregates,
						groupBy: finalGroupBy,
						isGrouped: true,
						chartConfig,
						useManualAggregation: true, // NEW FLAG
					};
				}

				// Standard Prisma groupBy (no relationships)
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
			};
		} catch (error) {
			if (error instanceof BadRequestException) throw error;
			console.error('Error parsing aggregate query:', error);
			throw new BadRequestException('Invalid aggregate query format');
		}
	}

	/**
	 * Execute aggregate query - handles both Prisma native and manual aggregation
	 */
	static async execute(
		prismaModel: any,
		aggregateConfig: Pipes.Aggregate,
		where?: any
	): Promise<any> {
		if (aggregateConfig.useManualAggregation) {
			// Use manual aggregation for relationships
			return manualAggregateWithRelationships(
				prismaModel,
				aggregateConfig.aggregates,
				aggregateConfig.groupBy,
				where
			);
		}

		// Use Prisma's native aggregation
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
	 * Transform Prisma result to chart-ready format
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

// Export the manual aggregation function for external use
export { manualAggregateWithRelationships };