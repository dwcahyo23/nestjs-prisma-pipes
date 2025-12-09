// ============================================
// PIPES
// ============================================
import WherePipe from './prisma/where.pipe';
import OrderByPipe from './prisma/order-by.pipe';
import SelectPipe from './prisma/select.pipe';
import { IncludePipe } from './prisma/include.pipe';
import AggregatePipe from './prisma/aggregate.pipe';

// ============================================
// SERVICES
// ============================================
import TimezoneService from './prisma/timezone.service';

// ============================================
// HELPERS
// ============================================
import {
	convertFieldReferences,
	convertWhereClause,
	createFieldRefConverter,
	initFieldRefContext,
	isFieldReference,
	extractFieldRefInfo,
	resolveFieldReference,
	validateFieldReferences,
	extractAllFieldReferences,
} from './helpers/field-ref-converter.helper';

import {
	configurePipesTimezone,
	getPipesTimezone,
} from './helpers/timezone.config';

// ============================================
// TYPES
// ============================================
import { Pipes } from './pipes.types';

// ============================================
// EXPORTS - PIPES
// ============================================
export {
	WherePipe,
	OrderByPipe,
	SelectPipe,
	IncludePipe,
	AggregatePipe,
};

// ============================================
// EXPORTS - SERVICES
// ============================================
export {
	TimezoneService,
};

// ============================================
// EXPORTS - FIELD REFERENCE HELPERS
// ============================================

/**
 * Core field reference conversion functions
 */
export {
	convertFieldReferences,
	convertWhereClause,
	createFieldRefConverter,
	initFieldRefContext,
};

/**
 * Field reference utility functions
 */
export {
	isFieldReference,
	extractFieldRefInfo,
	resolveFieldReference,
	validateFieldReferences,
	extractAllFieldReferences,
};

// ============================================
// EXPORTS - TIMEZONE HELPERS
// ============================================
export {
	configurePipesTimezone,
	getPipesTimezone,
};

// ============================================
// EXPORTS - TYPES
// ============================================

/**
 * Main namespace containing all types
 */
export type { Pipes };

/**
 * Commonly used types (re-exported for convenience)
 */
export type {
	// Field Reference Types
	Pipes as PipesNamespace,
} from './pipes.types';

// Specific type exports for better IDE autocomplete
export type FieldReference = Pipes.FieldReference;
export type FieldRefScope = Pipes.FieldRefScope;
export type FieldRefContext = Pipes.FieldRefContext;
export type FieldRefConverterOptions = Pipes.FieldRefConverterOptions;
export type FieldRefValidationResult = Pipes.FieldRefValidationResult;
export type ExtractedFieldRef = Pipes.ExtractedFieldRef;

// Where pipe types
export type Where = Pipes.Where;
export type FilterOperator = Pipes.FilterOperator;
export type FilterValue = Pipes.FilterValue;

// Order by types
export type OrderBy = Pipes.OrderBy;
export type Order = Pipes.Order;
export type SortDirection = Pipes.SortDirection;

// Select types
export type Select = Pipes.Select;

// Include types
export type Include = Pipes.Include;
export type IncludeClause = Pipes.IncludeClause;

// Aggregate types
export type Aggregate = Pipes.Aggregate;
export type AggregateSpec = Pipes.AggregateSpec;
export type ChartConfig = Pipes.ChartConfig;
export type ChartSeries = Pipes.ChartSeries;
export type ChartType = Pipes.ChartType;
export type TimeInterval = Pipes.TimeInterval;
export type AggregateFunction = Pipes.AggregateFunction;

// Pagination types
export type Pagination = Pipes.Pagination;

// Complete query types
export type PrismaQuery = Pipes.PrismaQuery;
export type AggregateQuery = Pipes.AggregateQuery;

// Timezone types
export type TimezoneConfig = Pipes.TimezoneConfig;