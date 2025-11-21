export declare namespace Pipes {
    type FilterOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'equals' | 'not' | 'contains' | 'startsWith' | 'endsWith' | 'every' | 'some' | 'none' | 'in' | 'has' | 'hasEvery' | 'hasSome';
    interface FieldReference {
        _ref: string;
        _isFieldRef: true;
    }
    type FilterValue = string | number | boolean | Date | null | undefined | FieldReference | FilterValue[] | {
        [K in FilterOperator]?: FilterValue;
    };
    type Where = {
        [key: string]: FilterValue | Where | Where[];
        AND?: Where[];
        OR?: Where[];
        NOT?: Where | Where[];
    };
    type SortDirection = 'asc' | 'desc';
    type OrderBy = {
        [key: string]: SortDirection | OrderBy;
    };
    type Order = OrderBy[];
    type Select = {
        [key: string]: boolean | Select;
    };
    interface IncludeClause {
        select?: Select;
        include?: Include;
        where?: Where;
        orderBy?: Order;
        take?: number;
        skip?: number;
    }
    type Include = {
        [key: string]: boolean | IncludeClause;
    };
    type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'donut';
    type TimeInterval = 'day' | 'month' | 'year';
    type AggregateFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';
    interface AggregateSpec {
        field: string;
        function: AggregateFunction;
        params: string[];
    }
    interface ChartConfig {
        type: ChartType;
        groupField?: string;
        dateField?: string;
        interval?: TimeInterval;
        stacked?: boolean;
        horizontal?: boolean;
    }
    interface TimeSeriesConfig {
        dateField: string;
        interval: TimeInterval;
    }
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
        rawQueryBuilder?: (tableName: string, whereClause?: any) => {
            query: string;
            params: any[];
        };
        chartType?: ChartType;
        timeSeries?: TimeSeriesConfig;
    }
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
    interface Pagination {
        take?: number;
        skip?: number;
        cursor?: Record<string, any>;
    }
    interface PrismaQuery {
        where?: Where;
        orderBy?: Order;
        select?: Select;
        include?: Include;
        take?: number;
        skip?: number;
        cursor?: Record<string, any>;
    }
    interface AggregateQuery extends Omit<PrismaQuery, 'select' | 'include'> {
        by?: string[];
        _sum?: Record<string, boolean>;
        _avg?: Record<string, boolean>;
        _min?: Record<string, boolean>;
        _max?: Record<string, boolean>;
        _count?: boolean | Record<string, boolean>;
    }
}
