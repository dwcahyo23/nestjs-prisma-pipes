export declare namespace Pipes {
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
    interface TimezoneConfig {
        offset: string;
        name: string;
        offsetHours: number;
    }
    /**
     * Prisma filter operators
     */
    type FilterOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'equals' | 'not' | 'contains' | 'startsWith' | 'endsWith' | 'every' | 'some' | 'none' | 'in' | 'has' | 'hasEvery' | 'hasSome';
    /**
     * Field reference scope for cross-table comparison
     */
    type FieldRefScope = 'parent' | 'root';
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
    interface FieldReference {
        _ref: string;
        _isFieldRef: true;
        _scope?: FieldRefScope;
    }
    /**
     * Filter value types
     */
    type FilterValue = string | number | boolean | Date | null | undefined | FieldReference | FilterValue[] | {
        [K in FilterOperator]?: FilterValue;
    };
    /**
     * Where clause object
     */
    type Where = {
        [key: string]: FilterValue | Where | Where[];
        AND?: Where[];
        OR?: Where[];
        NOT?: Where | Where[];
    };
    /**
     * Context for field reference resolution
     */
    interface FieldRefContext {
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
    interface FieldRefConverterOptions {
        /** Enable debug logging */
        debug?: boolean;
        /** Throw error on unresolved field references */
        strict?: boolean;
        /** Custom field resolver function */
        customResolver?: (ref: string, scope: FieldRefScope | undefined, context: FieldRefContext) => any;
    }
    /**
     * Field reference validation result
     */
    interface FieldRefValidationResult {
        valid: boolean;
        errors: string[];
        warnings: string[];
    }
    /**
     * Extracted field reference information
     */
    interface ExtractedFieldRef {
        path: string;
        ref: string;
        scope?: FieldRefScope;
        context: string;
    }
    /**
     * Sort direction
     */
    type SortDirection = 'asc' | 'desc';
    /**
     * Order by clause - supports nested relations
     */
    type OrderBy = {
        [key: string]: SortDirection | OrderBy;
    };
    /**
     * Array of order by clauses (for multiple sort fields)
     */
    type Order = OrderBy[];
    /**
     * Select clause for choosing fields
     */
    type Select = {
        [key: string]: boolean | Select;
    };
    /**
     * Include clause for relations
     */
    interface IncludeClause {
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
    type Include = {
        [key: string]: boolean | IncludeClause;
    };
    /**
     * Supported chart types
     */
    type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'heatmap' | 'radar' | 'funnel' | 'gauge' | 'mixed' | 'donut';
    /**
     * Time intervals for time series
     */
    type TimeInterval = 'day' | 'month' | 'year';
    /**
     * Aggregate functions
     */
    type AggregateFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';
    /**
     * Single aggregate specification
     */
    interface AggregateSpec {
        field: string;
        function: AggregateFunction;
        params: string[];
        alias?: string;
    }
    /**
     * Chart configuration with advanced options
     */
    interface ChartConfig {
        type: ChartType;
        groupField?: string;
        dateField?: string;
        interval?: TimeInterval;
        year?: number;
        stacked?: boolean;
        horizontal?: boolean;
    }
    /**
     * Time series configuration (deprecated, use ChartConfig)
     */
    interface TimeSeriesConfig {
        dateField: string;
        interval: TimeInterval;
    }
    /**
     * Aggregate configuration returned by pipe
     */
    interface Aggregate {
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
        rawQueryBuilder?: (tableName: string, whereClause?: any) => {
            query: string;
            params: any[];
        };
        chartType?: ChartType;
        timeSeries?: TimeSeriesConfig;
    }
    /**
     * Chart series data structure
     */
    interface ChartSeries {
        categories: string[];
        series: Array<{
            name: string;
            data: number[];
        }>;
        chartType?: ChartType;
        stacked?: boolean;
        horizontal?: boolean;
        raw: any[];
    }
    /**
     * Pagination configuration
     */
    interface Pagination {
        take?: number;
        skip?: number;
        cursor?: Record<string, any>;
    }
    /**
     * Complete Prisma query object combining all pipes
     */
    interface PrismaQuery {
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
    interface AggregateQuery extends Omit<PrismaQuery, 'select' | 'include'> {
        by?: string[];
        _sum?: Record<string, boolean>;
        _avg?: Record<string, boolean>;
        _min?: Record<string, boolean>;
        _max?: Record<string, boolean>;
        _count?: boolean | Record<string, boolean>;
    }
}
//# sourceMappingURL=pipes.types.d.ts.map