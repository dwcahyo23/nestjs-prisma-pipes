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
 * Parse chart configuration
 * @example "bar(createdAt, month)" -> { type: 'bar', dateField: 'createdAt', interval: 'month' }
 */
function parseChartConfig(value: string): {
	type: Pipes.ChartType;
	dateField?: string;
	interval?: Pipes.TimeInterval;
} | null {
	if (!value || typeof value !== 'string') return null;

	const chartTypes: Pipes.ChartType[] = ['bar', 'line', 'pie'];

	// Simple chart type without time series
	if (chartTypes.includes(value.toLowerCase() as Pipes.ChartType)) {
		return { type: value.toLowerCase() as Pipes.ChartType };
	}

	// Chart with time series: bar(createdAt, month)
	const match = /^(bar|line|pie)\(([^,]+)(?:,\s*(day|month|year))?\)$/i.exec(value.trim());

	if (!match) return null;

	const [, type, dateField, interval] = match;

	return {
		type: type.toLowerCase() as Pipes.ChartType,
		dateField: dateField.trim(),
		interval: (interval?.toLowerCase() as Pipes.TimeInterval) || 'month',
	};
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
	chartConfig?: { type: Pipes.ChartType; dateField?: string; interval?: Pipes.TimeInterval },
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
			raw: [],
		};
	}

	// Time series chart
	if (chartConfig?.dateField && chartConfig?.interval) {
		let year: number | undefined;
		try {
			const dates = dataArray
				.map(item => item[chartConfig.dateField!])
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
		const dataMap = new Map<string, any[]>();

		dataArray.forEach(item => {
			const dateValue = item[chartConfig.dateField!];
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
			raw: dataArray,
		};
	}

	// Grouped (non-time-series) chart
	if (groupBy && groupBy.length > 0) {
		const groupField = groupBy[0];
		const categories = dataArray.map(item => {
			const val = item[groupField];
			if (val instanceof Date) {
				return getTimeKey(val, 'day');
			}
			return String(val);
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
		raw: dataArray,
	};
}

/**
 * @description Parse aggregate query string
 *
 * Format: aggregate=field1: function(params), field2: function(), chart: type(dateField, interval)
 *
 * Examples:
 * - aggregate=revenue: sum(), orders: count()
 * - aggregate=price: avg(), quantity: sum(), chart: bar(createdAt, month)
 * - aggregate=total: sum(), chart: line(orderDate, month)
 * - aggregate=amount: sum(), status: count(id), chart: pie
 *
 * Can be combined with other pipes:
 * ?where=status: string(active), createdAt: gte date(2024-01-01)&aggregate=revenue: sum(), chart: line(createdAt, month)
 *
 * @returns Prisma aggregate config and chart transformation info
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
			let chartConfig: { type: Pipes.ChartType; dateField?: string; interval?: Pipes.TimeInterval } | undefined;

			for (const [key, val] of parsed) {
				if (key === 'chart' && val) {
					const config = parseChartConfig(val);
					if (config) {
						chartConfig = config;
						continue;
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

			const prismaQuery = buildPrismaAggregate(aggregates);
			const groupBy = chartConfig?.dateField ? [chartConfig.dateField] : [];
			const isGrouped = groupBy.length > 0;

			if (isGrouped) {
				return {
					prismaQuery: {
						by: groupBy,
						...prismaQuery,
					},
					aggregates,
					groupBy,
					isGrouped: true,
					chartType: chartConfig?.type,
					timeSeries: chartConfig?.dateField ? {
						dateField: chartConfig.dateField,
						interval: chartConfig.interval || 'month',
					} : undefined,
				};
			}

			return {
				prismaQuery,
				aggregates,
				groupBy: [],
				isGrouped: false,
				chartType: chartConfig?.type,
			};
		} catch (error) {
			if (error instanceof BadRequestException) throw error;
			console.error('Error parsing aggregate query:', error);
			throw new BadRequestException('Invalid aggregate query format');
		}
	}

	/**
	 * Transform Prisma result to chart-ready format
	 *
	 * @example
	 * const config = aggregatePipe.transform(query.aggregate);
	 * const data = await prisma.model.aggregate(config.prismaQuery);
	 * const chartData = AggregatePipe.toChartSeries(data, config);
	 */
	static toChartSeries(
		data: any[] | any,
		aggregateConfig: Pipes.Aggregate,
	): Pipes.ChartSeries {
		const chartConfig = aggregateConfig.timeSeries
			? {
				type: (aggregateConfig.chartType || 'bar') as Pipes.ChartType,
				dateField: aggregateConfig.timeSeries.dateField,
				interval: aggregateConfig.timeSeries.interval,
			}
			: aggregateConfig.chartType
				? { type: aggregateConfig.chartType }
				: undefined;

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
					chartType: chartConfig?.type,
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
				chartType: chartConfig?.type,
				raw: Array.isArray(data) ? data : [data],
			};
		}

		// Handle grouped aggregate
		const dataArray = Array.isArray(data) ? data : [data];
		return transformToChartSeries(dataArray, aggregateConfig.aggregates, chartConfig, aggregateConfig.groupBy);
	}
}