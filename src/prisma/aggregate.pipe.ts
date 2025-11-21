import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import parseObjectLiteral from '../helpers/parse-object-literal';
import { Pipes } from 'src/pipes.types';

/**
 * Supported aggregation functions
 */
const AGGREGATE_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count'] as const;
type AggregateFunction = typeof AGGREGATE_FUNCTIONS[number];

/**
 * Default mapping provider (identity mapping - no transformation)
 */
class DefaultMappingProvider implements Pipes.MappingProvider {
	getTableName(modelName: string): string {
		return modelName;
	}

	getColumnName(modelName: string, fieldName: string): string {
		return fieldName;
	}

	getPrimaryKey(modelName: string): string[] {
		return ['id']; // Default assumption
	}

	getForeignKey(modelName: string, relationName: string): string[] {
		return [`${relationName}Id`]; // Default convention
	}
}

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
 * Parse relationship path into table and field
 */
function parseRelationshipPath(path: string): { relation: string; field: string } {
	const parts = path.split('.');
	const field = parts.pop()!;
	const relation = parts.join('.');
	return { relation, field };
}

/**
 * Map model relationship path to database table path
 * @example "marketingMasterCategory.category" -> "market_master_category.category"
 */
function mapRelationshipPath(
	path: string,
	mainModelName: string,
	mappingProvider: Pipes.MappingProvider,
	explicitMapping?: Map<string, string>
): string {
	// Check explicit mapping first
	if (explicitMapping?.has(path)) {
		return explicitMapping.get(path)!;
	}

	// If no dots, it's a simple field on main model
	if (!path.includes('.')) {
		return mappingProvider.getColumnName(mainModelName, path);
	}

	const parts = path.split('.');
	const field = parts.pop()!;
	const relationPath = parts.join('.');

	// Check if there's explicit mapping for the relation part
	if (explicitMapping?.has(relationPath)) {
		const mappedRelation = explicitMapping.get(relationPath)!;
		return `${mappedRelation}.${field}`;
	}

	// Auto-map using provider: Get the last relation name and map it
	const relationName = parts[parts.length - 1];
	const tableName = mappingProvider.getTableName(relationName);
	const columnName = mappingProvider.getColumnName(relationName, field);

	return `${tableName}.${columnName}`;
}

/**
 * Build SQL field expression for relationship
 */
function buildSqlFieldPath(
	path: string,
	mainModelName: string,
	mappingProvider: Pipes.MappingProvider,
	tableAlias: string = 'main',
	explicitMapping?: Map<string, string>
): string {
	if (!path.includes('.')) {
		const columnName = mappingProvider.getColumnName(mainModelName, path);
		return `${tableAlias}.${columnName}`;
	}

	const mappedPath = mapRelationshipPath(path, mainModelName, mappingProvider, explicitMapping);
	return mappedPath;
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
 * Build raw SQL query for aggregation with relationships
 */
function buildRawSqlQuery(
	tableName: string,
	mainModelName: string,
	mappingProvider: Pipes.MappingProvider,
	aggregates: Pipes.AggregateSpec[],
	groupBy: string[],
	whereClause?: any,
	explicitMapping?: Map<string, string>
): { query: string; params: any[] } {
	const params: any[] = [];

	// Map main table name
	const dbTableName = mappingProvider.getTableName(mainModelName);

	// Build SELECT clause
	const selectFields: string[] = [];
	const aggregateFields: string[] = [];

	// Add GROUP BY fields to SELECT
	groupBy.forEach((field, idx) => {
		const sqlField = buildSqlFieldPath(field, mainModelName, mappingProvider, 'main', explicitMapping);
		selectFields.push(`${sqlField} as group_${idx}`);
	});

	// Add aggregate functions to SELECT
	aggregates.forEach((agg, idx) => {
		const { function: func, field } = agg;
		const sqlField = buildSqlFieldPath(field, mainModelName, mappingProvider, 'main', explicitMapping);

		let aggExpr: string;
		switch (func) {
			case 'sum':
				aggExpr = `SUM(${sqlField})`;
				break;
			case 'avg':
				aggExpr = `AVG(${sqlField})`;
				break;
			case 'min':
				aggExpr = `MIN(${sqlField})`;
				break;
			case 'max':
				aggExpr = `MAX(${sqlField})`;
				break;
			case 'count':
				aggExpr = field === '*' ? 'COUNT(*)' : `COUNT(${sqlField})`;
				break;
			default:
				aggExpr = `SUM(${sqlField})`;
		}

		aggregateFields.push(`${aggExpr} as agg_${func}_${idx}`);
	});

	const allSelectFields = [...selectFields, ...aggregateFields].join(', ');

	// Build FROM clause with JOINs
	let fromClause = `${dbTableName} as main`;
	const joinedRelations = new Set<string>();

	groupBy.forEach(field => {
		if (field.includes('.')) {
			const parts = field.split('.');
			const relationName = parts[0];

			if (!joinedRelations.has(relationName)) {
				const relationTableName = mappingProvider.getTableName(relationName);
				const foreignKeys = mappingProvider.getForeignKey(mainModelName, relationName);
				const primaryKeys = mappingProvider.getPrimaryKey(relationName);

				// Build JOIN condition for single or composite keys
				const joinConditions = foreignKeys.map((fk, idx) => {
					const fkColumn = mappingProvider.getColumnName(mainModelName, fk);
					const pkColumn = primaryKeys[idx] || primaryKeys[0];
					return `main.${fkColumn} = ${relationName}.${pkColumn}`;
				}).join(' AND ');

				fromClause += ` LEFT JOIN ${relationTableName} as ${relationName} ON ${joinConditions}`;
				joinedRelations.add(relationName);
			}
		}
	});

	// Build WHERE clause
	let whereClauseSql = '';
	if (whereClause && Object.keys(whereClause).length > 0) {
		whereClauseSql = 'WHERE 1=1';
	}

	// Build GROUP BY clause
	const groupByClause = groupBy
		.map((field, idx) => buildSqlFieldPath(field, mainModelName, mappingProvider, 'main', explicitMapping))
		.join(', ');

	// Construct final query
	const query = `
		SELECT ${allSelectFields}
		FROM ${fromClause}
		${whereClauseSql}
		GROUP BY ${groupByClause}
		ORDER BY ${groupByClause}
	`.trim();

	return { query, params };
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

	// Grouped chart
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

	// Regular chart
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
 * @description Parse aggregate query string with table mapping support
 *
 * Format: aggregate=field1: sum(), field2: count(), groupBy: (field), groupByMapping: (table.column), chart: type
 *
 * Examples:
 * 
 * 1. With explicit mapping:
 *    aggregate=qty: sum(), groupBy: (marketingMasterCategory.category), groupByMapping: (market_master_category.category)
 *
 * 2. With auto-mapping (uses injected Pipes.MappingProvider):
 *    aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
 *
 * 3. Multiple fields mapping:
 *    aggregate=qty: sum(), groupBy: (category, region), groupByMapping: (product_category, warehouse_region)
 */
@Injectable()
export default class AggregatePipe implements PipeTransform {
	private mappingProvider: Pipes.MappingProvider;

	constructor(
		private readonly mainModelName: string,
		mappingProvider?: Pipes.MappingProvider
	) {
		this.mappingProvider = mappingProvider || new DefaultMappingProvider();
	}

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
			let groupByMapping: Map<string, string> | undefined;

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

				// Handle groupByMapping configuration
				if (key.toLowerCase() === 'groupbymapping') {
					if (val) {
						const mappingFields = parseGroupBy(val);
						if (mappingFields && mappingFields.length > 0) {
							groupByMapping = new Map();
							// Map each groupBy field to its corresponding mapping
							groupByFields.forEach((field, idx) => {
								if (mappingFields[idx]) {
									groupByMapping!.set(field, mappingFields[idx]);
								}
							});
							continue;
						} else {
							throw new BadRequestException(
								'Invalid groupByMapping format. Use: groupByMapping: (table.column) or groupByMapping: (table1.col1, table2.col2)'
							);
						}
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

			// Determine groupBy
			let finalGroupBy: string[] = [];
			if (groupByFields.length > 0) {
				finalGroupBy = groupByFields;
			} else if (chartConfig?.groupField) {
				finalGroupBy = [chartConfig.groupField];
			} else if (chartConfig?.dateField) {
				finalGroupBy = [chartConfig.dateField];
			}

			const isGrouped = finalGroupBy.length > 0;
			const useRawQuery = isGrouped && hasRelationshipInGroupBy(finalGroupBy);

			if (isGrouped) {
				if (useRawQuery) {
					return {
						prismaQuery: null as any,
						aggregates,
						groupBy: finalGroupBy,
						isGrouped: true,
						chartConfig,
						useRawQuery: true,
						rawQueryBuilder: (tableName: string, whereClause?: any) =>
							buildRawSqlQuery(
								tableName,
								this.mainModelName,
								this.mappingProvider,
								aggregates,
								finalGroupBy,
								whereClause,
								groupByMapping
							),
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
					useRawQuery: false,
				};
			}

			const prismaQuery = buildPrismaAggregate(aggregates);
			return {
				prismaQuery,
				aggregates,
				groupBy: [],
				isGrouped: false,
				chartConfig,
				useRawQuery: false,
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