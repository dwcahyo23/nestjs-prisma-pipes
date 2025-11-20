export namespace Pipes {
	// ============================================
	// WHERE PIPE TYPES
	// ============================================

	/**
	 * Prisma filter operators
	 */
	export type FilterOperator =
		| 'lt'
		| 'lte'
		| 'gt'
		| 'gte'
		| 'equals'
		| 'not'
		| 'contains'
		| 'startsWith'
		| 'endsWith'
		| 'every'
		| 'some'
		| 'none'
		| 'in'
		| 'has'
		| 'hasEvery'
		| 'hasSome';

	/**
	 * Field reference object for field-to-field comparison
	 */
	export interface FieldReference {
		_ref: string;
		_isFieldRef: true;
	}

	/**
	 * Filter value types
	 */
	export type FilterValue =
		| string
		| number
		| boolean
		| Date
		| null
		| undefined
		| FieldReference
		| FilterValue[]
		| { [K in FilterOperator]?: FilterValue };

	/**
	 * Where clause object
	 */
	export type Where = {
		[key: string]: FilterValue | Where | Where[];
		AND?: Where[];
		OR?: Where[];
		NOT?: Where | Where[];
	};

	// ============================================
	// ORDER BY PIPE TYPES
	// ============================================

	/**
	 * Sort direction
	 */
	export type SortDirection = 'asc' | 'desc';

	/**
	 * Order by clause - supports nested relations
	 */
	export type OrderBy = {
		[key: string]: SortDirection | OrderBy;
	};

	/**
	 * Array of order by clauses (for multiple sort fields)
	 */
	export type Order = OrderBy[];

	// ============================================
	// SELECT PIPE TYPES
	// ============================================

	/**
	 * Select clause for choosing fields
	 */
	export type Select = {
		[key: string]: boolean | Select;
	};

	// ============================================
	// INCLUDE PIPE TYPES
	// ============================================

	/**
	 * Include clause for relations
	 */
	export interface IncludeClause {
		select?: Select;
		include?: Include;
		where?: Where;
		orderBy?: Order;
		take?: number;
		skip?: number;
	}

	/**
	 * Include object
	 */
	export type Include = {
		[key: string]: boolean | IncludeClause;
	};

	// ============================================
	// AGGREGATE PIPE TYPES
	// ============================================

	/**
	 * Supported chart types
	 */
	export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'donut';

	/**
	 * Time intervals for time series
	 */
	export type TimeInterval = 'day' | 'month' | 'year';

	/**
	 * Aggregate functions
	 */
	export type AggregateFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

	/**
	 * Single aggregate specification
	 */
	export interface AggregateSpec {
		field: string;
		function: AggregateFunction;
		params: string[];
	}

	/**
	 * Chart configuration with advanced options
	 */
	export interface ChartConfig {
		type: ChartType;
		groupField?: string;        // Field to use for chart categories
		dateField?: string;         // For time series charts
		interval?: TimeInterval;    // Time interval for time series
		stacked?: boolean;          // Stack multiple series
		horizontal?: boolean;       // Horizontal orientation (for bar charts)
	}

	/**
	 * Time series configuration (deprecated, use ChartConfig)
	 */
	export interface TimeSeriesConfig {
		dateField: string;
		interval: TimeInterval;
	}

	export type RawQueryBuilder = (
		tableName: string,
		whereClause?: Where
	) => {
		query: string;
		params: any[];
	};

	/**
	 * Aggregate configuration returned by pipe
	 */
	export interface Aggregate {
		prismaQuery: {
			by?: string[];
			_sum?: Record<string, true>;
			_avg?: Record<string, true>;
			_min?: Record<string, true>;
			_max?: Record<string, true>;
			_count?: true | Record<string, true>;
		};
		aggregates: AggregateSpec[];
		groupBy: string[];
		isGrouped: boolean;
		chartConfig?: ChartConfig;
		useRawQuery?: boolean;
		rawQueryBuilder?: (tableName: string, whereClause?: any) => { query: string; params: any[] };

		// Deprecated fields (kept for backward compatibility)
		chartType?: ChartType;
		timeSeries?: TimeSeriesConfig;
	}

	/**
	 * Chart series data structure
	 */
	export interface ChartSeries {
		categories: string[];              // X-axis labels
		series: Array<{
			name: string;                  // Series name (e.g., "sum(qty)")
			data: number[];                // Data points
		}>;
		chartType?: ChartType;             // Type of chart to render
		stacked?: boolean;                 // Whether to stack series
		horizontal?: boolean;              // Whether chart is horizontal
		raw: any[];                        // Original Prisma data
	}

	// ============================================
	// PAGINATION TYPES (Optional, commonly used)
	// ============================================

	/**
	 * Pagination configuration
	 */
	export interface Pagination {
		take?: number;
		skip?: number;
		cursor?: Record<string, any>;
	}

	// ============================================
	// COMPLETE QUERY TYPES
	// ============================================

	/**
	 * Complete Prisma query object combining all pipes
	 */
	export interface PrismaQuery {
		where?: Where;
		orderBy?: Order;
		select?: Select;
		include?: Include;
		take?: number;
		skip?: number;
		cursor?: Record<string, any>;
	}

	/**
	 * Query with aggregation
	 */
	export interface AggregateQuery extends Omit<PrismaQuery, 'select' | 'include'> {
		by?: string[];
		_sum?: Record<string, boolean>;
		_avg?: Record<string, boolean>;
		_min?: Record<string, boolean>;
		_max?: Record<string, boolean>;
		_count?: boolean | Record<string, boolean>;
	}
}