export namespace Pipes {
	// ============================================
	// TIMEZONE CONFIGURATION
	// ============================================

	/**
	 * Timezone configuration for date operations
	 * Configure once at app initialization:
	 * 
	 * @example
	 * ```typescript
	 * import { configurePipesTimezone } from './pipes';
	 * 
	 * configurePipesTimezone({
	 *   offset: '+07:00',
	 *   name: 'Asia/Jakarta',
	 * });
	 * ```
	 */
	export interface TimezoneConfig {
		offset: string;      // e.g., '+07:00'
		name: string;        // e.g., 'Asia/Jakarta'
		offsetHours: number; // e.g., 7
	}

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
	 * Field reference scope for cross-table comparison
	 */
	export type FieldRefScope = 'parent' | 'root';

	/**
	 * Field reference object for field-to-field comparison
	 * 
	 * @example
	 * // Same table reference
	 * { _ref: 'recQty', _isFieldRef: true }
	 * 
	 * @example
	 * // Parent table reference
	 * { _ref: 'createdAt', _isFieldRef: true, _scope: 'parent' }
	 * 
	 * @example
	 * // Root table reference
	 * { _ref: 'orderDate', _isFieldRef: true, _scope: 'root' }
	 */
	export interface FieldReference {
		_ref: string;
		_isFieldRef: true;
		_scope?: FieldRefScope;
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
	// FIELD REFERENCE HELPER TYPES
	// ============================================

	/**
	 * Context for field reference resolution
	 */
	export interface FieldRefContext {
		/** Current model being queried */
		currentModel: string;
		/** Parent model context (1 level up) */
		parentModel?: string;
		/** Parent model fields */
		parentFields?: any;
		/** Root model context (top level) */
		rootModel?: string;
		/** Root model fields */
		rootFields?: any;
	}

	/**
	 * Options for field reference converter
	 */
	export interface FieldRefConverterOptions {
		/** Enable debug logging */
		debug?: boolean;
		/** Throw error on unresolved field references */
		strict?: boolean;
		/** Custom field resolver function */
		customResolver?: (
			ref: string,
			scope: FieldRefScope | undefined,
			context: FieldRefContext
		) => any;
	}

	/**
	 * Field reference validation result
	 */
	export interface FieldRefValidationResult {
		valid: boolean;
		errors: string[];
		warnings: string[];
	}

	/**
	 * Extracted field reference information
	 */
	export interface ExtractedFieldRef {
		path: string;
		ref: string;
		scope?: FieldRefScope;
		context: string;
	}


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
	export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'heatmap' | 'radar' | 'funnel' | 'gauge' | 'mixed' | 'donut';

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
		alias?: string;
	}

	/**
	 * Chart configuration with advanced options
	 */
	export interface ChartConfig {
		type: ChartType;
		groupField?: string;        // Field to use for chart categories
		dateField?: string;         // For time series charts
		interval?: TimeInterval;    // Time interval for time series
		year?: number;
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
		useManualAggregation: boolean;
		isTimeSeries: boolean;
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