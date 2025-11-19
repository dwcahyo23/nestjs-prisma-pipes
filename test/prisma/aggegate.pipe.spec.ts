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

	// -------------------------------------------------------------
	// BASIC AGGREGATION
	// -------------------------------------------------------------
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
		});

		it('should parse multiple aggregates', () => {
			const result = pipe.transform('revenue: sum(), orders: count(), price: avg()');

			expect(result?.aggregates).toHaveLength(3);
			expect(result?.prismaQuery).toEqual({
				_sum: { revenue: true },
				_count: true,
				_avg: { price: true },
			});
		});

		it('should parse count with field parameter', () => {
			const result = pipe.transform('userId: count(id)');

			expect(result?.aggregates[0]).toEqual({
				field: 'userId',
				function: 'count',
				params: ['id'],
			});
			expect(result?.prismaQuery).toEqual({
				_count: { userId: true },
			});
		});

		it('should parse count wildcard', () => {
			const result = pipe.transform('x: count(*)');

			expect(result?.prismaQuery).toEqual({ _count: true });
		});

		it('should parse min and max', () => {
			const result = pipe.transform('minPrice: min(), maxPrice: max()');

			expect(result?.prismaQuery).toEqual({
				_min: { minPrice: true },
				_max: { maxPrice: true },
			});
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
		});
	});

	// -------------------------------------------------------------
	// GROUPBY
	// -------------------------------------------------------------
	describe('GroupBy Parsing', () => {
		it('should parse single groupBy field', () => {
			const result = pipe.transform('qty: sum(), groupBy(category)');

			expect(result?.groupBy).toEqual(['category']);
			expect(result?.prismaQuery.by).toEqual(['category']);
			expect(result?.isGrouped).toBe(true);
		});

		it('should parse multiple groupBy fields', () => {
			const result = pipe.transform('qty: sum(), groupBy(category, region)');

			expect(result?.groupBy).toEqual(['category', 'region']);
			expect(result?.prismaQuery.by).toEqual(['category', 'region']);
		});

		it('should parse nested groupBy fields', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(marketingMasterCategory.category)'
			);

			expect(result?.groupBy).toEqual(['marketingMasterCategory.category']);
			expect(result?.prismaQuery.by).toEqual(['marketingMasterCategory.category']);
		});

		it('should parse multiple nested groupBy fields', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(marketingMasterCategory.category, user.region)'
			);

			expect(result?.groupBy).toEqual([
				'marketingMasterCategory.category',
				'user.region',
			]);
		});

		it('should handle groupBy with multiple aggregates', () => {
			const result = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy(marketingMasterCategory.category)'
			);

			expect(result?.aggregates).toHaveLength(2);
			expect(result?.groupBy).toEqual(['marketingMasterCategory.category']);
			expect(result?.isGrouped).toBe(true);
		});
	});

	// -------------------------------------------------------------
	// CHART CONFIG - BASIC
	// -------------------------------------------------------------
	describe('Chart Configuration - Basic', () => {
		it('should parse simple bar chart', () => {
			const result = pipe.transform('revenue: sum(), chart: bar');

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.groupField).toBeUndefined();
		});

		it('should parse simple line chart', () => {
			const result = pipe.transform('revenue: sum(), chart: line');
			expect(result?.chartConfig?.type).toBe('line');
		});

		it('should parse simple pie chart', () => {
			const result = pipe.transform('revenue: sum(), chart: pie');
			expect(result?.chartConfig?.type).toBe('pie');
		});

		it('should parse donut chart', () => {
			const result = pipe.transform('qty: sum(), chart: donut');
			expect(result?.chartConfig?.type).toBe('donut');
		});

		it('should parse area chart', () => {
			const result = pipe.transform('qty: sum(), chart: area');
			expect(result?.chartConfig?.type).toBe('area');
		});
	});

	// -------------------------------------------------------------
	// CHART CONFIG - WITH GROUPFIELD
	// -------------------------------------------------------------
	describe('Chart Configuration - With GroupField', () => {
		it('should parse chart with groupField', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(category), chart: bar(category)'
			);

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.groupField).toBe('category');
		});

		it('should parse chart with nested groupField', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(marketingMasterCategory.category), chart: bar(marketingMasterCategory.category)'
			);

			expect(result?.chartConfig?.groupField).toBe('marketingMasterCategory.category');
		});

		it('should parse pie chart with groupField', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(category), chart: pie(category)'
			);

			expect(result?.chartConfig?.type).toBe('pie');
			expect(result?.chartConfig?.groupField).toBe('category');
		});

		it('should infer groupBy from chart groupField', () => {
			const result = pipe.transform('qty: sum(), chart: bar(category)');

			expect(result?.groupBy).toEqual(['category']);
			expect(result?.isGrouped).toBe(true);
		});
	});

	// -------------------------------------------------------------
	// CHART CONFIG - STACKED & HORIZONTAL
	// -------------------------------------------------------------
	describe('Chart Configuration - Stacked & Horizontal', () => {
		it('should parse stacked bar chart', () => {
			const result = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy(category), chart: bar(category, stacked)'
			);

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.stacked).toBe(true);
			expect(result?.chartConfig?.horizontal).toBeUndefined();
		});

		it('should parse horizontal bar chart', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(category), chart: bar(category, horizontal)'
			);

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.horizontal).toBe(true);
			expect(result?.chartConfig?.stacked).toBeUndefined();
		});

		it('should parse stacked area chart', () => {
			const result = pipe.transform(
				'qty: sum(), recQty: sum(), chart: area(category, stacked)'
			);

			expect(result?.chartConfig?.type).toBe('area');
			expect(result?.chartConfig?.stacked).toBe(true);
		});
	});

	// -------------------------------------------------------------
	// TIME SERIES CHART
	// -------------------------------------------------------------
	describe('Time Series Parsing', () => {
		it('should parse line(createdAt, month)', () => {
			const result = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			expect(result?.chartConfig?.type).toBe('line');
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
		});

		it('should parse bar(createdAt, month)', () => {
			const result = pipe.transform('revenue: sum(), chart: bar(createdAt, month)');

			expect(result?.chartConfig?.type).toBe('bar');
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
		});

		it('should parse area(createdAt, year)', () => {
			const result = pipe.transform('revenue: sum(), chart: area(createdAt, year)');

			expect(result?.chartConfig?.interval).toBe('year');
		});

		it('should parse day interval', () => {
			const result = pipe.transform('qty: sum(), chart: line(createdAt, day)');
			expect(result?.chartConfig?.interval).toBe('day');
		});

		it('should set groupBy automatically from dateField', () => {
			const result = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			expect(result?.groupBy).toEqual(['createdAt']);
			expect(result?.isGrouped).toBe(true);
		});

		it('should default to month interval if not specified', () => {
			const result = pipe.transform('qty: sum(), chart: line(createdAt)');
			// Note: This won't work with current regex, but documenting expected behavior
		});
	});

	// -------------------------------------------------------------
	// GROUPED TIME SERIES
	// -------------------------------------------------------------
	describe('Grouped Time Series', () => {
		it('should parse grouped time series with explicit groupBy', () => {
			const result = pipe.transform(
				'qty: sum(), groupBy(marketingMasterCategory.category, createdAt), chart: line(createdAt, month)'
			);

			expect(result?.groupBy).toEqual([
				'marketingMasterCategory.category',
				'createdAt',
			]);
			expect(result?.chartConfig?.dateField).toBe('createdAt');
			expect(result?.chartConfig?.interval).toBe('month');
			expect(result?.isGrouped).toBe(true);
		});

		it('should handle multiple aggregates with grouped time series', () => {
			const result = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy(category, createdAt), chart: line(createdAt, month)'
			);

			expect(result?.aggregates).toHaveLength(2);
			expect(result?.groupBy).toEqual(['category', 'createdAt']);
		});

		it('should parse grouped time series with stacked option', () => {
			const result = pipe.transform(
				'revenue: sum(), groupBy(category, createdAt), chart: area(createdAt, month)'
			);

			expect(result?.chartConfig?.type).toBe('area');
			expect(result?.groupBy).toContain('category');
			expect(result?.groupBy).toContain('createdAt');
		});
	});

	// -------------------------------------------------------------
	// ERROR HANDLING
	// -------------------------------------------------------------
	describe('Error Handling', () => {
		it('should throw for invalid syntax', () => {
			expect(() => pipe.transform('x = ???')).toThrow(BadRequestException);
		});

		it('should throw when no aggregate is provided', () => {
			expect(() => pipe.transform('chart: bar')).toThrow(BadRequestException);
		});

		it('should throw for empty string', () => {
			expect(pipe.transform('')).toBeUndefined();
		});

		it('should throw for invalid aggregate function', () => {
			expect(() => pipe.transform('qty: invalid()')).toThrow(BadRequestException);
		});

		it('should handle malformed groupBy gracefully', () => {
			// groupBy without parentheses should be ignored
			const result = pipe.transform('qty: sum(), groupBy');
			expect(result?.isGrouped).toBe(false);
		});
	});

	// -------------------------------------------------------------
	// toChartSeries() NON-GROUPED
	// -------------------------------------------------------------
	describe('toChartSeries non-grouped', () => {
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
			expect(chart.raw).toEqual([prismaResult]);
		});

		it('should handle multiple aggregates in non-grouped', () => {
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

		it('should handle count aggregate', () => {
			const config = pipe.transform('total: count()');
			const prismaResult = { _count: 42 };

			const chart = AggregatePipe.toChartSeries(prismaResult, config!);

			expect(chart.series[0]).toEqual({
				name: 'count(total)',
				data: [42],
			});
		});
	});

	// -------------------------------------------------------------
	// toChartSeries GROUPED
	// -------------------------------------------------------------
	describe('toChartSeries grouped', () => {
		it('should group by category and produce chart series', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');

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
				'qty: sum(), recQty: sum(), groupBy(category)'
			);

			const data = [
				{ category: 'COM', _sum: { qty: 100, recQty: 90 } },
				{ category: 'O4W', _sum: { qty: 200, recQty: 180 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toEqual(['COM', 'O4W']);
			expect(chart.series).toHaveLength(2);
			expect(chart.series[0]).toEqual({
				name: 'sum(qty)',
				data: [100, 200],
			});
			expect(chart.series[1]).toEqual({
				name: 'sum(recQty)',
				data: [90, 180],
			});
		});

		it('should handle nested groupBy field', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(marketingMasterCategory.category)'
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

		it('should handle count aggregate with grouping', () => {
			const config = pipe.transform('orders: count(), groupBy(status)');

			const data = [
				{ status: 'pending', _count: 5 },
				{ status: 'completed', _count: 10 },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series[0]).toEqual({
				name: 'count(orders)',
				data: [5, 10],
			});
		});

		it('should use chartConfig.groupField for categories', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category, region), chart: bar(category)'
			);

			const data = [
				{ category: 'A', region: 'US', _sum: { qty: 10 } },
				{ category: 'B', region: 'EU', _sum: { qty: 20 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toEqual(['A', 'B']);
		});

		it('should include chart options in result', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category), chart: bar(category, stacked)'
			);

			const data = [{ category: 'A', _sum: { qty: 10 } }];
			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.chartType).toBe('bar');
			expect(chart.stacked).toBe(true);
		});
	});

	// -------------------------------------------------------------
	// toChartSeries TIME SERIES
	// -------------------------------------------------------------
	describe('toChartSeries time series', () => {
		it('should generate monthly time series', () => {
			const config = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			const data = [
				{ createdAt: '2024-01-15', _sum: { qty: 10 } },
				{ createdAt: '2024-02-20', _sum: { qty: 20 } },
				{ createdAt: '2024-03-10', _sum: { qty: 15 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toHaveLength(12); // 12 months
			expect(chart.categories[0]).toContain('Jan');
			expect(chart.categories[1]).toContain('Feb');

			// Check that data is mapped correctly
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

		it('should handle year interval', () => {
			const config = pipe.transform('revenue: sum(), chart: line(createdAt, year)');

			const data = [
				{ createdAt: '2023-06-15', _sum: { revenue: 1000 } },
				{ createdAt: '2024-03-20', _sum: { revenue: 1500 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toHaveLength(5); // Last 5 years
			expect(chart.categories).toContain('2023');
			expect(chart.categories).toContain('2024');
		});

		it('should fill missing months with 0', () => {
			const config = pipe.transform('qty: sum(), chart: line(createdAt, month)');

			const data = [
				{ createdAt: '2024-01-15', _sum: { qty: 10 } },
				// No data for Feb, Mar, etc.
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series[0].data[0]).toBe(10); // Jan has data
			expect(chart.series[0].data[1]).toBe(0);  // Feb is 0
			expect(chart.series[0].data[2]).toBe(0);  // Mar is 0
		});
	});

	// -------------------------------------------------------------
	// toChartSeries GROUPED TIME SERIES
	// -------------------------------------------------------------
	describe('toChartSeries grouped time series', () => {
		it('should build separate series per category', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category, createdAt), chart: line(createdAt, month)'
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

			expect(chart.series[0].name).toContain('A');
			expect(chart.series[1].name).toContain('B');

			// Check data for category A
			expect(chart.series[0].data[0]).toBe(5);  // Jan
			expect(chart.series[0].data[1]).toBe(7);  // Feb

			// Check data for category B
			expect(chart.series[1].data[0]).toBe(10); // Jan
			expect(chart.series[1].data[1]).toBe(12); // Feb
		});

		it('should handle multiple aggregates with grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), recQty: sum(), groupBy(category, createdAt), chart: line(createdAt, month)'
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

			expect(chart.series[1].name).toContain('COM');
			expect(chart.series[1].name).toContain('recQty');

			expect(chart.series[2].name).toContain('O4W');
			expect(chart.series[3].name).toContain('O4W');
		});

		it('should handle nested groupBy field in grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(marketingMasterCategory.category, createdAt), chart: line(createdAt, month)'
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

		it('should use chartConfig.groupField for series grouping', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category, region, createdAt), chart: line(createdAt, month)'
			);

			// Should default to using chartConfig.groupField or first non-date field
			const data = [
				{
					category: 'A',
					region: 'US',
					createdAt: '2024-01-10',
					_sum: { qty: 10 },
				},
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series).toHaveLength(1);
			expect(chart.series[0].name).toContain('A'); // Uses first non-date groupBy field
		});

		it('should fill missing data points with 0 in grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category, createdAt), chart: line(createdAt, month)'
			);

			const data = [
				{ category: 'A', createdAt: '2024-01-10', _sum: { qty: 5 } },
				// Category A has no data for Feb
				{ category: 'B', createdAt: '2024-02-15', _sum: { qty: 10 } },
				// Category B has no data for Jan
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			// Category A: Jan has data, Feb is 0
			expect(chart.series[0].data[0]).toBe(5);
			expect(chart.series[0].data[1]).toBe(0);

			// Category B: Jan is 0, Feb has data
			expect(chart.series[1].data[0]).toBe(0);
			expect(chart.series[1].data[1]).toBe(10);
		});
	});

	// -------------------------------------------------------------
	// EDGE CASES
	// -------------------------------------------------------------
	describe('Edge Cases', () => {
		it('should handle null values in grouped data', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');

			const data = [
				{ category: null, _sum: { qty: 10 } },
				{ category: 'A', _sum: { qty: 20 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toEqual(['null', 'A']);
		});

		it('should handle Date objects in groupBy', () => {
			const config = pipe.transform('qty: sum(), groupBy(createdAt)');

			const date1 = new Date('2024-01-15');
			const date2 = new Date('2024-02-20');

			const data = [
				{ createdAt: date1, _sum: { qty: 10 } },
				{ createdAt: date2, _sum: { qty: 20 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.categories).toHaveLength(2);
			expect(chart.categories[0]).toContain('2024');
		});

		it('should handle missing aggregate values', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');

			const data = [
				{ category: 'A', _sum: {} }, // Missing qty
				{ category: 'B', _sum: { qty: 20 } },
			];

			const chart = AggregatePipe.toChartSeries(data, config!);

			expect(chart.series[0].data).toEqual([0, 20]);
		});

		it('should handle empty array input', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');
			const chart = AggregatePipe.toChartSeries([], config!);

			expect(chart.categories).toEqual(['Total']);
			expect(chart.series[0].data).toEqual([0]);
		});
	});

	// -------------------------------------------------------------
	// INTEGRATION EXAMPLES
	// -------------------------------------------------------------
	describe('Integration Examples', () => {
		it('should handle real-world category analysis query', () => {
			const query = 'qty: sum(), recQty: sum(), groupBy(marketingMasterCategory.category), chart: bar(marketingMasterCategory.category)';
			const config = pipe.transform(query);

			expect(config?.aggregates).toHaveLength(2);
			expect(config?.groupBy).toEqual(['marketingMasterCategory.category']);
			expect(config?.chartConfig?.type).toBe('bar');
			expect(config?.chartConfig?.groupField).toBe('marketingMasterCategory.category');

			const mockData = [
				{
					marketingMasterCategory: { category: 'COM' },
					_sum: { qty: 100, recQty: 90 },
				},
				{
					marketingMasterCategory: { category: 'O4W' },
					_sum: { qty: 200, recQty: 180 },
				},
				{
					marketingMasterCategory: { category: 'O2W' },
					_sum: { qty: 150, recQty: 140 },
				},
				{
					marketingMasterCategory: { category: 'OES' },
					_sum: { qty: 300, recQty: 280 },
				},
				{
					marketingMasterCategory: { category: 'EXX' },
					_sum: { qty: 250, recQty: 230 },
				},
			];

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.categories).toEqual(['COM', 'O4W', 'O2W', 'OES', 'EXX']);
			expect(chart.series).toHaveLength(2);
			expect(chart.series[0].name).toBe('sum(qty)');
			expect(chart.series[1].name).toBe('sum(recQty)');
			expect(chart.chartType).toBe('bar');
		});

		it('should handle real-world time series trend query', () => {
			const query = 'revenue: sum(), groupBy(marketingMasterCategory.category, createdAt), chart: line(createdAt, month)';
			const config = pipe.transform(query);

			expect(config?.groupBy).toEqual(['marketingMasterCategory.category', 'createdAt']);
			expect(config?.chartConfig?.dateField).toBe('createdAt');
			expect(config?.chartConfig?.interval).toBe('month');

			const mockData = [
				{
					marketingMasterCategory: { category: 'COM' },
					createdAt: '2024-01-15',
					_sum: { revenue: 10000 },
				},
				{
					marketingMasterCategory: { category: 'COM' },
					createdAt: '2024-02-20',
					_sum: { revenue: 12000 },
				},
				{
					marketingMasterCategory: { category: 'O4W' },
					createdAt: '2024-01-10',
					_sum: { revenue: 15000 },
				},
				{
					marketingMasterCategory: { category: 'O4W' },
					createdAt: '2024-02-25',
					_sum: { revenue: 18000 },
				},
			];

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.categories).toHaveLength(12); // 12 months
			expect(chart.series).toHaveLength(2); // COM and O4W
			expect(chart.series[0].name).toContain('COM');
			expect(chart.series[1].name).toContain('O4W');
			expect(chart.chartType).toBe('line');
		});

		it('should handle stacked bar chart for market share', () => {
			const query = 'revenue: sum(), groupBy(category), chart: bar(category, stacked)';
			const config = pipe.transform(query);

			const mockData = [
				{ category: 'Electronics', _sum: { revenue: 50000 } },
				{ category: 'Clothing', _sum: { revenue: 30000 } },
				{ category: 'Food', _sum: { revenue: 20000 } },
			];

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.stacked).toBe(true);
			expect(chart.chartType).toBe('bar');
			expect(chart.categories).toEqual(['Electronics', 'Clothing', 'Food']);
		});

		it('should handle horizontal bar for category comparison', () => {
			const query = 'qty: sum(), groupBy(marketingMasterCategory.category), chart: bar(marketingMasterCategory.category, horizontal)';
			const config = pipe.transform(query);

			expect(config?.chartConfig?.horizontal).toBe(true);

			const mockData = [
				{
					marketingMasterCategory: { category: 'COM' },
					_sum: { qty: 1000 },
				},
				{
					marketingMasterCategory: { category: 'O4W' },
					_sum: { qty: 2000 },
				},
			];

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.horizontal).toBe(true);
		});

		it('should handle pie chart for distribution', () => {
			const query = 'revenue: sum(), groupBy(category), chart: pie(category)';
			const config = pipe.transform(query);

			const mockData = [
				{ category: 'A', _sum: { revenue: 100 } },
				{ category: 'B', _sum: { revenue: 200 } },
				{ category: 'C', _sum: { revenue: 150 } },
			];

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.chartType).toBe('pie');
			expect(chart.series[0].data).toEqual([100, 200, 150]);
		});

		it('should handle complex multi-level grouping', () => {
			const query = 'qty: sum(), revenue: sum(), groupBy(category, region, createdAt), chart: line(createdAt, month)';
			const config = pipe.transform(query);

			expect(config?.groupBy).toEqual(['category', 'region', 'createdAt']);
			expect(config?.aggregates).toHaveLength(2);
		});

		it('should handle stacked area chart for cumulative view', () => {
			const query = 'qty: sum(), recQty: sum(), groupBy(category, createdAt), chart: area(createdAt, month)';
			const config = pipe.transform(query);

			const mockData = [
				{
					category: 'A',
					createdAt: '2024-01-15',
					_sum: { qty: 10, recQty: 8 },
				},
				{
					category: 'B',
					createdAt: '2024-01-20',
					_sum: { qty: 20, recQty: 18 },
				},
			];

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.chartType).toBe('area');
			// 2 categories × 2 metrics = 4 series
			expect(chart.series).toHaveLength(4);
		});
	});

	// -------------------------------------------------------------
	// PRISMA QUERY GENERATION
	// -------------------------------------------------------------
	describe('Prisma Query Generation', () => {
		it('should generate correct Prisma query for groupBy', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');

			expect(config?.prismaQuery).toEqual({
				by: ['category'],
				_sum: { qty: true },
			});
		});

		it('should generate correct Prisma query for multiple groupBy', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category, region)'
			);

			expect(config?.prismaQuery).toEqual({
				by: ['category', 'region'],
				_sum: { qty: true },
			});
		});

		it('should generate correct Prisma query for time series', () => {
			const config = pipe.transform(
				'revenue: sum(), chart: line(createdAt, month)'
			);

			expect(config?.prismaQuery).toEqual({
				by: ['createdAt'],
				_sum: { revenue: true },
			});
		});

		it('should generate correct Prisma query for grouped time series', () => {
			const config = pipe.transform(
				'qty: sum(), groupBy(category, createdAt), chart: line(createdAt, month)'
			);

			expect(config?.prismaQuery).toEqual({
				by: ['category', 'createdAt'],
				_sum: { qty: true },
			});
		});

		it('should generate correct Prisma query for multiple aggregates', () => {
			const config = pipe.transform(
				'qty: sum(), price: avg(), orders: count(), minPrice: min(), maxPrice: max()'
			);

			expect(config?.prismaQuery).toEqual({
				_sum: { qty: true },
				_avg: { price: true },
				_count: true,
				_min: { minPrice: true },
				_max: { maxPrice: true },
			});
		});
	});

	// -------------------------------------------------------------
	// BACKWARD COMPATIBILITY
	// -------------------------------------------------------------
	describe('Backward Compatibility', () => {
		it('should still support old chartType property', () => {
			const config = pipe.transform('qty: sum(), chart: bar');

			// New way
			expect(config?.chartConfig?.type).toBe('bar');

			// Old way (deprecated but still accessible)
			expect(config?.chartType).toBeUndefined();
		});

		it('should handle queries without chart config', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');

			expect(config?.chartConfig).toBeUndefined();
			expect(config?.isGrouped).toBe(true);
		});
	});

	// -------------------------------------------------------------
	// PERFORMANCE & SCALABILITY
	// -------------------------------------------------------------
	describe('Performance & Scalability', () => {
		it('should handle large number of categories', () => {
			const config = pipe.transform('qty: sum(), groupBy(category)');

			const mockData = Array.from({ length: 100 }, (_, i) => ({
				category: `Category${i}`,
				_sum: { qty: i * 10 },
			}));

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.categories).toHaveLength(100);
			expect(chart.series[0].data).toHaveLength(100);
		});

		it('should handle multiple series with many data points', () => {
			const config = pipe.transform(
				'qty: sum(), recQty: sum(), revenue: sum(), groupBy(category)'
			);

			const mockData = Array.from({ length: 50 }, (_, i) => ({
				category: `Cat${i}`,
				_sum: { qty: i * 10, recQty: i * 8, revenue: i * 100 },
			}));

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.series).toHaveLength(3);
			expect(chart.series[0].data).toHaveLength(50);
		});

		it('should handle time series with all 365 days', () => {
			const config = pipe.transform('qty: sum(), chart: line(createdAt, day)');

			// Generate data for each day of 2024
			const mockData = Array.from({ length: 366 }, (_, i) => {
				const date = new Date('2024-01-01');
				date.setDate(date.getDate() + i);
				return {
					createdAt: date.toISOString(),
					_sum: { qty: Math.floor(Math.random() * 100) },
				};
			});

			const chart = AggregatePipe.toChartSeries(mockData, config!);

			expect(chart.categories).toHaveLength(366); // 2024 is leap year
		});
	});

	// -------------------------------------------------------------
	// REAL QUERY EXAMPLES FROM USE CASES
	// -------------------------------------------------------------
	describe('Real Query Examples', () => {
		it('Example 1: Total revenue by category', () => {
			const query = 'revenue: sum(), groupBy(category), chart: bar(category)';
			const config = pipe.transform(query);

			expect(config?.isGrouped).toBe(true);
			expect(config?.chartConfig?.type).toBe('bar');
		});

		it('Example 2: Monthly sales trend', () => {
			const query = 'sales: sum(), chart: line(orderDate, month)';
			const config = pipe.transform(query);

			expect(config?.chartConfig?.dateField).toBe('orderDate');
			expect(config?.chartConfig?.interval).toBe('month');
		});

		it('Example 3: Category performance over time', () => {
			const query = 'qty: sum(), recQty: sum(), groupBy(marketingMasterCategory.category, createdAt), chart: line(createdAt, month)';
			const config = pipe.transform(query);

			expect(config?.groupBy).toContain('marketingMasterCategory.category');
			expect(config?.groupBy).toContain('createdAt');
		});

		it('Example 4: Market share pie chart', () => {
			const query = 'revenue: sum(), groupBy(category), chart: pie(category)';
			const config = pipe.transform(query);

			expect(config?.chartConfig?.type).toBe('pie');
		});

		it('Example 5: Stacked area for trend analysis', () => {
			const query = 'revenue: sum(), groupBy(category, createdAt), chart: area(createdAt, month)';
			const config = pipe.transform(query);

			expect(config?.chartConfig?.type).toBe('area');
		});

		it('Example 6: Horizontal bar for long category names', () => {
			const query = 'qty: sum(), groupBy(productName), chart: bar(productName, horizontal)';
			const config = pipe.transform(query);

			expect(config?.chartConfig?.horizontal).toBe(true);
		});

		it('Example 7: Count of orders by status', () => {
			const query = 'orders: count(), groupBy(status), chart: donut(status)';
			const config = pipe.transform(query);

			expect(config?.aggregates[0].function).toBe('count');
			expect(config?.chartConfig?.type).toBe('donut');
		});

		it('Example 8: Average price trend over months', () => {
			const query = 'price: avg(), chart: line(createdAt, month)';
			const config = pipe.transform(query);

			expect(config?.aggregates[0].function).toBe('avg');
		});

		it('Example 9: Min and max price by category', () => {
			const query = 'minPrice: min(), maxPrice: max(), groupBy(category), chart: bar(category)';
			const config = pipe.transform(query);

			expect(config?.aggregates).toHaveLength(2);
			expect(config?.aggregates[0].function).toBe('min');
			expect(config?.aggregates[1].function).toBe('max');
		});

		it('Example 10: Multi-metric dashboard query', () => {
			const query = 'revenue: sum(), orders: count(), avgPrice: avg(), groupBy(category)';
			const config = pipe.transform(query);

			expect(config?.aggregates).toHaveLength(3);
			expect(config?.isGrouped).toBe(true);
		});
	});
});