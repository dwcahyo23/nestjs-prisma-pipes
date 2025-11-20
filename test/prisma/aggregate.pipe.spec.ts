import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import AggregatePipe from '../../src/prisma/aggregate.pipe';

describe('AggregatePipe', () => {
	let pipe: AggregatePipe;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [AggregatePipe],
		}).compile();

		pipe = moduleRef.get<AggregatePipe>(AggregatePipe);
	});

	// ============================================================================
	// BASIC AGGREGATION
	// ============================================================================
	describe('Basic Aggregation', () => {
		it('should parse single sum aggregate', () => {
			const result = pipe.transform('revenue: sum()');

			expect(result).toBeDefined();
			expect(result?.isGrouped).toBe(false);
			expect(result?.aggregates).toHaveLength(1);
			expect(result?.aggregates[0]).toEqual({
				field: 'revenue',
				function: 'sum',
				params: [],
			});
			expect(result?.prismaQuery).toEqual({
				_sum: { revenue: true },
			});
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse multiple aggregates', () => {
			const result = pipe.transform('revenue: sum(), orders: count(), price: avg()');

			expect(result?.aggregates).toHaveLength(3);
			expect(result?.prismaQuery).toEqual({
				_sum: { revenue: true },
				_count: true,
				_avg: { price: true },
			});
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse all aggregate functions', () => {
			const result = pipe.transform(
				'total: sum(), average: avg(), minimum: min(), maximum: max(), recordCount: count()'
			);

			expect(result?.aggregates).toHaveLength(5);
			expect(result?.prismaQuery).toEqual({
				_sum: { total: true },
				_avg: { average: true },
				_min: { minimum: true },
				_max: { maximum: true },
				_count: true,
			});
			expect(result?.useRawQuery).toBe(false);
		});
	});

	// ============================================================================
	// GROUPBY (PROPER SYNTAX: groupBy: (field))
	// ============================================================================
	describe('GroupBy', () => {
		it('should parse single groupBy field', () => {
			const result = pipe.transform('qty: sum(), groupBy: (category)');

			expect(result?.groupBy).toEqual(['category']);
			expect(result?.prismaQuery.by).toEqual(['category']);
			expect(result?.isGrouped).toBe(true);
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse multiple groupBy fields', () => {
			const result = pipe.transform('qty: sum(), groupBy: (category, region)');

			expect(result?.groupBy).toEqual(['category', 'region']);
			expect(result?.prismaQuery.by).toEqual(['category', 'region']);
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse nested groupBy fields and use raw query', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category)'
			);

			expect(result?.groupBy).toEqual(['marketingMasterCategory.category']);
			expect(result?.useRawQuery).toBe(true);
			expect(result?.rawQueryBuilder).toBeDefined();
		});

		it('should parse multiple nested paths and use raw query', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category, warehouse.region)'
			);

			expect(result?.groupBy).toEqual(['marketingMasterCategory.category', 'warehouse.region']);
			expect(result?.useRawQuery).toBe(true);
			expect(result?.rawQueryBuilder).toBeDefined();
		});

		it('should handle groupBy with whitespace', () => {
			const result = pipe.transform('qty: sum(), groupBy: ( category , region )');

			expect(result?.groupBy).toEqual(['category', 'region']);
			expect(result?.useRawQuery).toBe(false);
		});
	});

	// ============================================================================
	// CHART CONFIGURATION
	// ============================================================================
	describe('Chart Configuration', () => {
		it('should parse simple chart types', () => {
			expect(pipe.transform('revenue: sum(), chart: bar')?.chartConfig?.type).toBe('bar');
			expect(pipe.transform('revenue: sum(), chart: line')?.chartConfig?.type).toBe('line');
			expect(pipe.transform('revenue: sum(), chart: pie')?.chartConfig?.type).toBe('pie');
			expect(pipe.transform('qty: sum(), chart: donut')?.chartConfig?.type).toBe('donut');
			expect(pipe.transform('qty: sum(), chart: area')?.chartConfig?.type).toBe('area');
		});

		it('should parse chart with groupField', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (category), chart: bar(category)'
			);

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.groupField).toBe('category');
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse chart with nested path and use raw query', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category)'
			);

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.groupField).toBe('marketingMasterCategory.category');
			expect(result?.useRawQuery).toBe(true);
		});

		it('should parse chart with options', () => {
			const stacked = pipe.transform(
				'qty: sum(), groupBy: (category), chart: bar(category, stacked)'
			);
			expect(stacked?.chartConfig?.stacked).toBe(true);

			const horizontal = pipe.transform(
				'qty: sum(), groupBy: (category), chart: bar(category, horizontal)'
			);
			expect(horizontal?.chartConfig?.horizontal).toBe(true);
		});

		it('should infer groupBy from chart groupField', () => {
			const result = pipe.transform('qty: sum(), chart: bar(category)');

			expect(result?.groupBy).toEqual(['category']);
			expect(result?.isGrouped).toBe(true);
			expect(result?.useRawQuery).toBe(false);
		});
	});

	// ============================================================================
	// TIME SERIES
	// ============================================================================
	describe('Time Series', () => {
		it('should parse time series chart', () => {
			const result = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			expect(result?.chartConfig?.type).toBe('line');
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
			expect(result?.groupBy).toEqual(['createdAt']);
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse all time intervals', () => {
			expect(
				pipe.transform('qty: sum(), chart: line(createdAt, day)')?.chartConfig?.interval
			).toBe('day');
			expect(
				pipe.transform('qty: sum(), chart: line(createdAt, month)')?.chartConfig?.interval
			).toBe('month');
			expect(
				pipe.transform('qty: sum(), chart: line(createdAt, year)')?.chartConfig?.interval
			).toBe('year');
		});
	});

	// ============================================================================
	// GROUPED TIME SERIES
	// ============================================================================
	describe('Grouped Time Series', () => {
		it('should parse grouped time series', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)'
			);

			expect(result?.groupBy).toEqual(['category', 'createdAt']);
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
			expect(result?.useRawQuery).toBe(false);
		});

		it('should handle multiple aggregates with grouped time series', () => {
			const result = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)'
			);

			expect(result?.aggregates).toHaveLength(2);
			expect(result?.groupBy).toEqual(['category', 'createdAt']);
			expect(result?.useRawQuery).toBe(false);
		});

		it('should parse nested path with time series and use raw query', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category, createdAt), chart: line(createdAt, month)'
			);

			expect(result?.groupBy).toEqual(['marketingMasterCategory.category', 'createdAt']);
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.useRawQuery).toBe(true);
		});
	});

	// ============================================================================
	// RAW QUERY GENERATION
	// ============================================================================
	describe('Raw Query Generation', () => {
		it('should generate raw query for nested relationship', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category)'
			);

			expect(result?.useRawQuery).toBe(true);
			expect(result?.rawQueryBuilder).toBeDefined();

			if (result?.rawQueryBuilder) {
				const { query } = result.rawQueryBuilder('Product');
				expect(query).toContain('SELECT');
				expect(query).toContain('GROUP BY');
				expect(query).toContain('marketingMasterCategory.category');
				expect(query).toContain('SUM(main.qty)');
			}
		});

		it('should generate raw query with multiple aggregates', () => {
			const result = pipe.transform(
				'qty: sum(), recQty: avg(), groupBy: (marketingMasterCategory.category)'
			);

			if (result?.rawQueryBuilder) {
				const { query } = result.rawQueryBuilder('Product');
				expect(query).toContain('SUM(main.qty)');
				expect(query).toContain('AVG(main.recQty)');
			}
		});

		it('should generate raw query with multiple relationships', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category, warehouse.region)'
			);

			if (result?.rawQueryBuilder) {
				const { query } = result.rawQueryBuilder('Product');
				expect(query).toContain('marketingMasterCategory.category');
				expect(query).toContain('warehouse.region');
				expect(query).toContain('LEFT JOIN marketingMasterCategory');
				expect(query).toContain('LEFT JOIN warehouse');
			}
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================
	describe('Error Handling', () => {
		it('should throw for invalid syntax', () => {
			expect(() => pipe.transform('x = ???')).toThrow(BadRequestException);
		});

		it('should throw when no aggregate is provided', () => {
			expect(() => pipe.transform('chart: bar')).toThrow(BadRequestException);
		});

		it('should return undefined for empty string', () => {
			expect(pipe.transform('')).toBeUndefined();
		});

		it('should throw for invalid aggregate function', () => {
			expect(() => pipe.transform('qty: invalid()')).toThrow(BadRequestException);
		});

		it('should throw for groupBy without parentheses', () => {
			expect(() => pipe.transform('qty: sum(), groupBy: category')).toThrow(BadRequestException);
		});
	});

	// ============================================================================
	// toChartSeries - NON-GROUPED
	// ============================================================================
	describe('toChartSeries - Non-Grouped', () => {
		it('should return correct series for single aggregate', () => {
			const config = pipe.transform('qty: sum()');
			const prismaResult = { _sum: { qty: 10 } };

			const chart = AggregatePipe.toChartSeries(prismaResult, config!);

			expect(chart.categories).toEqual(['Total']);
			expect(chart.series).toHaveLength(1);
			expect(chart.series[0]).toEqual({
				name: 'sum(qty)',
				data: [10],
			});
		});

		it('should handle multiple aggregates', () => {
			const config = pipe.transform('qty: sum(), price: avg(), orders: count()');
			const prismaResult = {
				_sum: { qty: 100 },
				_avg: { price: 50.5 },
				_count: 25,
			};

			const chart = AggregatePipe.toChartSeries(prismaResult, config!);

			expect(chart.series).toHaveLength(3);
			expect(chart.series[0]).toEqual({ name: 'sum(qty)', data: [100] });
			expect(chart.series[1]).toEqual({ name: 'avg(price)', data: [50.5] });
			expect(chart.series[2]).toEqual({ name: 'count(orders)', data: [25] });
		});

		it('should handle empty data', () => {
			const config = pipe.transform('qty: sum()');
			const chart = AggregatePipe.toChartSeries([], config!);

			expect(chart.categories).toEqual(['Total']);
			expect(chart.series[0].data).toEqual([0]);
		});
	});

	// ============================================================================
	// toChartSeries - GROUPED
	// ============================================================================
	describe('toChartSeries - Grouped', () => {
		it('should group by category and produce chart series', () => {
			const config = pipe.transform('qty: sum(), groupBy: (category)');

			const data = [
				{ category: 'A', _sum: { qty: 10 } },
				{ category: 'B', _sum: { qty: 20 } },
				{ category: 'C', _sum: { qty: 15 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toEqual(['A', 'B', 'C']);
			expect(chart.series[0]).toEqual({
				name: 'sum(qty)',
				data: [10, 20, 15],
			});
		});

		it('should handle multiple aggregates with grouping', () => {
			const config = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy: (category)'
			);

			const data = [
				{ category: 'COM', _sum: { qty: 100, recQty: 90 } },
				{ category: 'O4W', _sum: { qty: 200, recQty: 180 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toEqual(['COM', 'O4W']);
			expect(chart.series).toHaveLength(2);
			expect(chart.series[0].data).toEqual([100, 200]);
			expect(chart.series[1].data).toEqual([90, 180]);
		});

		it('should handle nested groupBy field', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category)'
			);

			const data = [
				{
					marketingMasterCategory: { category: 'COM' },
					_sum: { qty: 100 },
				},
				{
					marketingMasterCategory: { category: 'O4W' },
					_sum: { qty: 200 },
				},
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toEqual(['COM', 'O4W']);
			expect(chart.series[0].data).toEqual([100, 200]);
		});

		it('should handle multiple groupBy fields', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (category, region)'
			);

			const data = [
				{ category: 'A', region: 'US', _sum: { qty: 10 } },
				{ category: 'B', region: 'EU', _sum: { qty: 20 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			// First groupBy field is used for categories
			expect(chart.categories).toEqual(['A', 'B']);
			expect(chart.series[0].data).toEqual([10, 20]);
		});
	});

	// ============================================================================
	// toChartSeries - TIME SERIES
	// ============================================================================
	describe('toChartSeries - Time Series', () => {
		it('should generate monthly time series', () => {
			const config = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			const data = [
				{ createdAt: '2024-01-15', _sum: { qty: 10 } },
				{ createdAt: '2024-02-20', _sum: { qty: 20 } },
				{ createdAt: '2024-03-10', _sum: { qty: 15 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toHaveLength(12); // 12 months
			expect(chart.series[0].data[0]).toBe(10); // Jan
			expect(chart.series[0].data[1]).toBe(20); // Feb
			expect(chart.series[0].data[2]).toBe(15); // Mar
		});

		it('should handle multiple aggregates in time series', () => {
			const config = pipe.transform(
				'qty: sum(), recQty: sum(), chart: line(createdAt, month)'
			);

			const data = [
				{ createdAt: '2024-01-15', _sum: { qty: 10, recQty: 8 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series).toHaveLength(2);
			expect(chart.series[0].name).toBe('sum(qty)');
			expect(chart.series[1].name).toBe('sum(recQty)');
		});

		it('should fill missing months with 0', () => {
			const config = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			const data = [
				{ createdAt: '2024-01-15', _sum: { qty: 10 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series[0].data[0]).toBe(10); // Jan has data
			expect(chart.series[0].data[1]).toBe(0);  // Feb is 0
			expect(chart.series[0].data[2]).toBe(0);  // Mar is 0
		});
	});

	// ============================================================================
	// toChartSeries - GROUPED TIME SERIES
	// ============================================================================
	describe('toChartSeries - Grouped Time Series', () => {
		it('should build separate series per category', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)'
			);

			const data = [
				{ category: 'A', createdAt: '2024-01-10', _sum: { qty: 5 } },
				{ category: 'A', createdAt: '2024-02-10', _sum: { qty: 7 } },
				{ category: 'B', createdAt: '2024-01-15', _sum: { qty: 10 } },
				{ category: 'B', createdAt: '2024-02-12', _sum: { qty: 12 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toHaveLength(12); // 12 months
			expect(chart.series).toHaveLength(2); // A and B

			// Check data for category A
			expect(chart.series[0].data[0]).toBe(5);  // Jan
			expect(chart.series[0].data[1]).toBe(7);  // Feb

			// Check data for category B
			expect(chart.series[1].data[0]).toBe(10); // Jan
			expect(chart.series[1].data[1]).toBe(12); // Feb
		});

		it('should handle multiple aggregates with grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)'
			);

			const data = [
				{
					category: 'COM',
					createdAt: '2024-01-10',
					_sum: { qty: 100, recQty: 90 },
				},
				{
					category: 'O4W',
					createdAt: '2024-01-15',
					_sum: { qty: 200, recQty: 180 },
				},
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			// 2 categories × 2 aggregates = 4 series
			expect(chart.series).toHaveLength(4);
			expect(chart.series[0].name).toContain('COM');
			expect(chart.series[0].name).toContain('qty');
		});

		it('should handle nested paths in grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category, createdAt), chart: line(createdAt, month)'
			);

			const data = [
				{
					marketingMasterCategory: { category: 'COM' },
					createdAt: '2024-01-10',
					_sum: { qty: 100 },
				},
				{
					marketingMasterCategory: { category: 'O4W' },
					createdAt: '2024-01-15',
					_sum: { qty: 200 },
				},
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series).toHaveLength(2);
			expect(chart.series[0].name).toContain('COM');
			expect(chart.series[1].name).toContain('O4W');
		});
	});

	// ============================================================================
	// PRISMA QUERY GENERATION
	// ============================================================================
	describe('Prisma Query Generation', () => {
		it('should generate correct query for basic aggregate', () => {
			const config = pipe.transform('qty: sum(), price: avg()');

			expect(config?.prismaQuery).toEqual({
				_sum: { qty: true },
				_avg: { price: true },
			});
			expect(config?.useRawQuery).toBe(false);
		});

		it('should generate correct query for groupBy', () => {
			const config = pipe.transform('qty: sum(), groupBy: (category)');

			expect(config?.prismaQuery).toEqual({
				by: ['category'],
				_sum: { qty: true },
			});
			expect(config?.useRawQuery).toBe(false);
		});

		it('should generate correct query for multiple groupBy', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (category, region)'
			);

			expect(config?.prismaQuery).toEqual({
				by: ['category', 'region'],
				_sum: { qty: true },
			});
			expect(config?.useRawQuery).toBe(false);
		});

		it('should generate correct query for time series', () => {
			const config = pipe.transform(
				'revenue: sum(), chart: line(createdAt, month)'
			);

			expect(config?.prismaQuery).toEqual({
				by: ['createdAt'],
				_sum: { revenue: true },
			});
			expect(config?.useRawQuery).toBe(false);
		});

		it('should generate correct query for grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)'
			);

			expect(config?.prismaQuery).toEqual({
				by: ['category', 'createdAt'],
				_sum: { qty: true },
			});
			expect(config?.useRawQuery).toBe(false);
		});

		it('should use raw query for nested paths', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category, warehouse.region)'
			);

			expect(config?.useRawQuery).toBe(true);
			expect(config?.groupBy).toEqual(['marketingMasterCategory.category', 'warehouse.region']);
			expect(config?.aggregates).toHaveLength(1);
			expect(config?.rawQueryBuilder).toBeDefined();

			// Test raw query builder
			if (config?.rawQueryBuilder) {
				const { query } = config.rawQueryBuilder('Product');
				expect(query).toContain('SELECT');
				expect(query).toContain('GROUP BY');
				expect(query).toContain('marketingMasterCategory.category');
				expect(query).toContain('warehouse.region');
			}
		});

		it('should use raw query for single nested path', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy: (marketingMasterCategory.category)'
			);

			expect(config?.useRawQuery).toBe(true);
			expect(config?.groupBy).toEqual(['marketingMasterCategory.category']);
			expect(config?.rawQueryBuilder).toBeDefined();
		});
	});

	// ============================================================================
	// REAL-WORLD SCENARIOS
	// ============================================================================
	describe('Real-World Scenarios', () => {
		it('should handle complex dashboard query with raw query', () => {
			const query = 'qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category, horizontal)';
			const result = pipe.transform(query);

			expect(result?.aggregates).toHaveLength(2);
			expect(result?.groupBy).toEqual(['marketingMasterCategory.category']);
			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.horizontal).toBe(true);

			// Should use raw query because of nested path
			expect(result?.useRawQuery).toBe(true);
			expect(result?.rawQueryBuilder).toBeDefined();

			// Test query generation
			if (result?.rawQueryBuilder) {
				const { query } = result.rawQueryBuilder('Product');
				expect(query).toContain('SUM(main.qty)');
				expect(query).toContain('SUM(main.recQty)');
			}
		});

		it('should handle trend analysis query without relationships', () => {
			const query = 'revenue: sum(), orderCount: count(), groupBy: (category, createdAt), chart: line(createdAt, month)';
			const result = pipe.transform(query);

			expect(result?.aggregates).toHaveLength(2);
			expect(result?.groupBy).toEqual(['category', 'createdAt']);
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
			expect(result?.useRawQuery).toBe(false);
			expect(result?.prismaQuery.by).toEqual(['category', 'createdAt']);
		});

		it('should handle simple metrics without grouping', () => {
			const query = 'totalRevenue: sum(), avgPrice: avg(), maxPrice: max(), minPrice: min(), itemCount: count()';
			const result = pipe.transform(query);

			expect(result?.aggregates).toHaveLength(5);
			expect(result?.isGrouped).toBe(false);
			expect(result?.groupBy).toEqual([]);
			expect(result?.useRawQuery).toBe(false);
		});
	});
});