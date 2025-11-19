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
 * @example "sum()" -> { function: 'sum', params: [] }
 * @example "count(id)" -> { function: 'count', params: ['id'] }
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
 * Handles format: "(category)" or "(category, region)"
 * 
 * @example "(category)" -> ['category']
 * @example "(category, region)" -> ['category', 'region']
 * @example "(marketingMasterCategory.category)" -> ['marketingMasterCategory.category']
 */
function parseGroupBy(value: string): string[] | null {
	if (!value || typeof value !== 'string') return null;

	const trimmed = value.trim();

	// Must be wrapped in parentheses
	if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
		return null;
	}

	const fields = trimmed.slice(1, -1); // Remove ( and )
	if (!fields.trim()) return null;

	return fields.split(',').map(f => f.trim()).filter(Boolean);
}

/**
 * Parse chart configuration with advanced options
 * @example "bar" -> { type: 'bar' }
 * @example "bar(category)" -> { type: 'bar', groupField: 'category' }
 * @example "bar(marketingMasterCategory.category)" -> { type: 'bar', groupField: 'marketingMasterCategory.category' }
 * @example "line(createdAt, month)" -> { type: 'line', dateField: 'createdAt', interval: 'month' }
 * @example "pie(category, stacked)" -> { type: 'pie', groupField: 'category', stacked: true }
 * @example "bar(category, horizontal)" -> { type: 'bar', groupField: 'category', horizontal: true }
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

	// Simple chart type without parameters
	if (chartTypes.includes(value.toLowerCase() as Pipes.ChartType)) {
		return { type: value.toLowerCase() as Pipes.ChartType };
	}

	// Chart with parameters: bar(field) or bar(field, option)
	const match = /^(bar|line|pie|area|donut)\(([^,)]+)(?:,\s*([^)]+))?\)$/i.exec(value.trim());

	if (!match) return null;

	const [, type, firstParam, secondParam] = match;
	const chartType = type.toLowerCase() as Pipes.ChartType;

	// Check if first parameter is a time interval (time series chart)
	const timeIntervals = ['day', 'month', 'year'];
	if (timeIntervals.includes(secondParam?.toLowerCase())) {
		return {
			type: chartType,
			dateField: firstParam.trim(),
			interval: secondParam.toLowerCase() as Pipes.TimeInterval,
		};
	}

	// Check for chart options (stacked, horizontal, etc.)
	const options: any = { type: chartType, groupField: firstParam.trim() };

	if (secondParam) {
		const option = secondParam.toLowerCase().trim();
		if (option === 'stacked') {
			options.stacked = true;
		} else if (option === 'horizontal') {
			options.horizontal = true;
		} else if (timeIntervals.includes(option)) {
			// If second param is interval, first param is dateField
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
			// Generate all days in a year: YYYY-MM-DD
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
			// Last 5 years
			for (let i = 4; i >= 0; i--) {
				labels.push((currentYear - i).toString());
			}
			break;
	}

	return labels;
}

/**
 * Get time key from date - normalize dates to match label format
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

	// Time series chart with optional grouping
	if (chartConfig?.dateField && chartConfig?.interval) {
		// Check if there's a non-date groupBy field (for grouped time series)
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

		// Grouped time series: separate series per group (e.g., per category)
		if (hasGrouping) {
			const groupField = chartConfig.groupField || nonDateGroupFields[0];

			// Create a map: groupValue -> timeKey -> data items
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

			// Create series: one per aggregate per group
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

		// Regular time series (no grouping)
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
		// Determine which field to use for categories
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
 * @description Parse aggregate query string with flexible grouping and advanced chart options
 *
 * Format: aggregate=field1: sum(), field2: count(), groupBy: (field), chart: type(options)
 *
 * Examples:
 * 
 * 1. Basic aggregation (no grouping):
 *    aggregate=qty: sum(), recQty: sum()
 *
 * 2. Grouped aggregation (sum per category):
 *    aggregate=qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category)
 *
 * 3. Multiple groupBy fields:
 *    aggregate=qty: sum(), groupBy: (category, region)
 *
 * 4. Grouped with simple bar chart:
 *    aggregate=qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category), chart: bar
 *
 * 5. Chart with explicit groupField:
 *    aggregate=qty: sum(), recQty: sum(), groupBy: (category, region), chart: bar(category)
 *
 * 6. Horizontal bar chart:
 *    aggregate=qty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category, horizontal)
 *
 * 7. Time series line chart:
 *     aggregate=revenue: sum(), chart: line(createdAt, month)
 *
 * 8. GROUPED TIME SERIES - trend per category over time:
 *     aggregate=qty: sum(), groupBy: (marketingMasterCategory.category, createdAt), chart: line(createdAt, month)
 *
 * @returns Prisma aggregate config with groupBy and chart visualization support
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
				// Handle chart configuration
				if (key.toLowerCase() === 'chart' && val) {
					const config = parseChartConfig(val);
					if (config) {
						chartConfig = config;
						continue;
					}
				}

				// Handle groupBy configuration
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

				// Handle aggregate functions
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

			const prismaQuery = buildPrismaAggregate(aggregates);

			// Determine groupBy priority:
			// 1. Explicit groupBy: (fields) takes precedence
			// 2. Chart's groupField if specified
			// 3. Chart's dateField for time series
			let finalGroupBy: string[] = [];
			if (groupByFields.length > 0) {
				finalGroupBy = groupByFields;
			} else if (chartConfig?.groupField) {
				finalGroupBy = [chartConfig.groupField];
			} else if (chartConfig?.dateField) {
				finalGroupBy = [chartConfig.dateField];
			}

			const isGrouped = finalGroupBy.length > 0;

			if (isGrouped) {
				return {
					prismaQuery: {
						by: finalGroupBy,
						...prismaQuery,
					},
					aggregates,
					groupBy: finalGroupBy,
					isGrouped: true,
					chartConfig,
				};
			}

			return {
				prismaQuery,
				aggregates,
				groupBy: [],
				isGrouped: false,
				chartConfig,
			};
		} catch (error) {
			if (error instanceof BadRequestException) throw error;
			console.error('Error parsing aggregate query:', error);
			throw new BadRequestException('Invalid aggregate query format');
		}
	}

	/**
	 * Transform Prisma result to chart-ready format
	 */
	static toChartSeries(
		data: any[] | any,
		aggregateConfig: Pipes.Aggregate,
	): Pipes.ChartSeries {
		// Handle non-grouped aggregate
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

		// Handle grouped aggregate
		const dataArray = Array.isArray(data) ? data : [data];
		return transformToChartSeries(
			dataArray,
			aggregateConfig.aggregates,
			aggregateConfig.chartConfig,
			aggregateConfig.groupBy
		);
	}
}