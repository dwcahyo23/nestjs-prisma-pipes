import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Pipes } from '../../src/pipes.types';
import AggregatePipe from '../../src/prisma/aggregate.pipe';

describe('AggregatePipe', () => {
	let pipe: AggregatePipe;



	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [AggregatePipe],
		}).compile();

		pipe = moduleRef.get<AggregatePipe>(AggregatePipe);
	});

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

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(3);
			expect(result?.prismaQuery).toEqual({
				_sum: { revenue: true },
				_count: true,
				_avg: { price: true },
			});
		});

		it('should parse count with field parameter', () => {
			const result = pipe.transform('userId: count(id)');

			expect(result).toBeDefined();
			expect(result?.aggregates[0]).toEqual({
				field: 'userId',
				function: 'count',
				params: ['id'],
			});
			expect(result?.prismaQuery).toEqual({
				_count: { userId: true },
			});
		});

		it('should parse count with wildcard', () => {
			const result = pipe.transform('total: count(*)');

			expect(result).toBeDefined();
			expect(result?.prismaQuery).toEqual({
				_count: true,
			});
		});

		it('should parse min and max aggregates', () => {
			const result = pipe.transform('minPrice: min(), maxPrice: max()');

			expect(result).toBeDefined();
			expect(result?.prismaQuery).toEqual({
				_min: { minPrice: true },
				_max: { maxPrice: true },
			});
		});
	});

	describe('Chart Configuration', () => {
		it('should parse simple chart type', () => {
			const result = pipe.transform('revenue: sum(), chart: bar');

			expect(result).toBeDefined();
			expect(result?.chartType).toBe('bar');
			expect(result?.isGrouped).toBe(false);
		});

		it('should parse line chart type', () => {
			const result = pipe.transform('total: sum(), chart: line');

			expect(result?.chartType).toBe('line');
		});

		it('should parse pie chart type', () => {
			const result = pipe.transform('amount: sum(), chart: pie');

			expect(result?.chartType).toBe('pie');
		});
	});

	describe('Time Series Configuration', () => {
		it('should parse monthly time series', () => {
			const result = pipe.transform('revenue: sum(), chart: bar(createdAt, month)');

			expect(result).toBeDefined();
			expect(result?.isGrouped).toBe(true);
			expect(result?.groupBy).toEqual(['createdAt']);
			expect(result?.timeSeries).toEqual({
				dateField: 'createdAt',
				interval: 'month',
			});
			expect(result?.chartType).toBe('bar');
		});

		it('should parse daily time series', () => {
			const result = pipe.transform('orders: count(), chart: line(orderDate, day)');

			expect(result?.timeSeries).toEqual({
				dateField: 'orderDate',
				interval: 'day',
			});
		});

		it('should parse yearly time series', () => {
			const result = pipe.transform('revenue: sum(), chart: line(createdAt, year)');

			expect(result?.timeSeries).toEqual({
				dateField: 'createdAt',
				interval: 'year',
			});
		});

		it('should default to month interval if not specified', () => {
			const result = pipe.transform('total: sum(), chart: bar(createdAt)');

			expect(result?.timeSeries?.interval).toBe('month');
		});

		it('should include groupBy in prismaQuery for time series', () => {
			const result = pipe.transform('revenue: sum(), chart: bar(createdAt, month)');

			expect(result?.prismaQuery).toHaveProperty('by');
			expect(result?.prismaQuery.by).toEqual(['createdAt']);
			expect(result?.prismaQuery).toHaveProperty('_sum');
		});
	});

	describe('Complex Scenarios', () => {
		it('should parse multiple aggregates with time series', () => {
			const result = pipe.transform(
				'revenue: sum(), orders: count(), avgPrice: avg(), chart: line(createdAt, month)'
			);

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(3);
			expect(result?.isGrouped).toBe(true);
			expect(result?.timeSeries).toBeDefined();
		});

		it('should handle all aggregate functions together', () => {
			const result = pipe.transform(
				'total: sum(), average: avg(), minimum: min(), maximum: max(), count: count()'
			);

			expect(result?.aggregates).toHaveLength(5);
			expect(result?.prismaQuery).toHaveProperty('_sum');
			expect(result?.prismaQuery).toHaveProperty('_avg');
			expect(result?.prismaQuery).toHaveProperty('_min');
			expect(result?.prismaQuery).toHaveProperty('_max');
			expect(result?.prismaQuery).toHaveProperty('_count');
		});
	});

	describe('Edge Cases', () => {
		it('should return undefined for null input', () => {
			const result = pipe.transform(null as any);
			expect(result).toBeUndefined();
		});

		it('should return undefined for empty string', () => {
			const result = pipe.transform('');
			expect(result).toBeUndefined();
		});

		it('should throw error for invalid format', () => {
			expect(() => pipe.transform('invalid format')).toThrow(BadRequestException);
		});

		it('should throw error when no aggregates specified', () => {
			expect(() => pipe.transform('chart: bar')).toThrow(BadRequestException);
		});

		it('should handle whitespace in input', () => {
			const result = pipe.transform('  revenue: sum()  , orders: count()  ');

			expect(result).toBeDefined();
			expect(result?.aggregates).toHaveLength(2);
		});
	});

	describe('toChartSeries - Simple Aggregate', () => {
		it('should transform simple aggregate result', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { _sum: { revenue: true } },
				aggregates: [{ field: 'revenue', function: 'sum', params: [] }],
				groupBy: [],
				isGrouped: false,
			};

			const data = { _sum: { revenue: 5000 } };
			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.categories).toEqual(['Total']);
			expect(result.series).toHaveLength(1);
			expect(result.series[0]).toEqual({
				name: 'sum(revenue)',
				data: [5000],
			});
		});

		it('should transform multiple aggregates', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { _sum: { revenue: true }, _count: true },
				aggregates: [
					{ field: 'revenue', function: 'sum', params: [] },
					{ field: 'orders', function: 'count', params: [] },
				],
				groupBy: [],
				isGrouped: false,
			};

			const data = { _sum: { revenue: 5000 }, _count: 10 };
			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.series).toHaveLength(2);
			expect(result.series[0].data).toEqual([5000]);
			expect(result.series[1].data).toEqual([10]);
		});

		it('should handle count with field', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { _count: { userId: true } },
				aggregates: [{ field: 'userId', function: 'count', params: ['id'] }],
				groupBy: [],
				isGrouped: false,
			};

			const data = { _count: { userId: 25 } };
			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.series[0].data).toEqual([25]);
		});
	});

	describe('toChartSeries - Grouped Aggregate', () => {
		it('should transform grouped data without time series', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { by: ['category'], _sum: { amount: true } },
				aggregates: [{ field: 'amount', function: 'sum', params: [] }],
				groupBy: ['category'],
				isGrouped: true,
			};

			const data = [
				{ category: 'Electronics', _sum: { amount: 1000 } },
				{ category: 'Books', _sum: { amount: 500 } },
			];

			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.categories).toHaveLength(2);
			expect(result.series[0].data).toEqual([1000, 500]);
		});

		it('should transform time series data', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { by: ['createdAt'], _sum: { revenue: true } },
				aggregates: [{ field: 'revenue', function: 'sum', params: [] }],
				groupBy: ['createdAt'],
				isGrouped: true,
				chartType: 'line',
				timeSeries: {
					dateField: 'createdAt',
					interval: 'month',
				},
			};

			const data = [
				{ createdAt: new Date('2024-01-15'), _sum: { revenue: 1000 } },
				{ createdAt: new Date('2024-02-20'), _sum: { revenue: 1500 } },
			];

			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.categories).toHaveLength(12); // All 12 months
			expect(result.series[0].name).toBe('sum(revenue)');
			expect(result.chartType).toBe('line');
			// Data should have values for Jan and Feb, zeros for other months
			expect(result.series[0].data[0]).toBeGreaterThan(0); // Jan
			expect(result.series[0].data[1]).toBeGreaterThan(0); // Feb
		});

		it('should fill gaps with zeros in time series', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { by: ['orderDate'], _count: true },
				aggregates: [{ field: 'orders', function: 'count', params: [] }],
				groupBy: ['orderDate'],
				isGrouped: true,
				timeSeries: {
					dateField: 'orderDate',
					interval: 'month',
				},
			};

			const data = [
				{ orderDate: new Date('2024-01-15'), _count: 10 },
				// Missing Feb-Nov
				{ orderDate: new Date('2024-12-20'), _count: 15 },
			];

			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.categories).toHaveLength(12);
			// Most months should be 0
			const zeroMonths = result.series[0].data.filter(val => val === 0);
			expect(zeroMonths.length).toBeGreaterThan(8);
		});

		it('should handle empty data gracefully', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { _sum: { revenue: true } },
				aggregates: [{ field: 'revenue', function: 'sum', params: [] }],
				groupBy: [],
				isGrouped: false,
			};

			const result = AggregatePipe.toChartSeries([], config);

			expect(result.categories).toEqual(['Total']);
			expect(result.series).toHaveLength(1);
		});

		it('should include chartType in result', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: { _sum: { revenue: true } },
				aggregates: [{ field: 'revenue', function: 'sum', params: [] }],
				groupBy: [],
				isGrouped: false,
				chartType: 'bar',
			};

			const data = { _sum: { revenue: 1000 } };
			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.chartType).toBe('bar');
		});
	});

	describe('toChartSeries - Multiple Series', () => {
		it('should create multiple series for multiple aggregates', () => {
			const config: Pipes.Aggregate = {
				prismaQuery: {
					by: ['createdAt'],
					_sum: { revenue: true },
					_avg: { price: true },
					_count: true,
				},
				aggregates: [
					{ field: 'revenue', function: 'sum', params: [] },
					{ field: 'price', function: 'avg', params: [] },
					{ field: 'orders', function: 'count', params: [] },
				],
				groupBy: ['createdAt'],
				isGrouped: true,
				timeSeries: {
					dateField: 'createdAt',
					interval: 'month',
				},
			};

			const data = [
				{
					createdAt: new Date('2024-01-15'),
					_sum: { revenue: 1000 },
					_avg: { price: 50 },
					_count: 20,
				},
			];

			const result = AggregatePipe.toChartSeries(data, config);

			expect(result.series).toHaveLength(3);
			expect(result.series[0].name).toBe('sum(revenue)');
			expect(result.series[1].name).toBe('avg(price)');
			expect(result.series[2].name).toBe('count(orders)');
		});
	});

	describe('Integration Tests', () => {
		it('should handle complete workflow: parse -> transform', () => {
			// Step 1: Parse query
			const config = pipe.transform('revenue: sum(), orders: count(), chart: line(createdAt, month)');

			// Step 2: Simulate Prisma result
			const prismaData = [
				{ createdAt: new Date('2024-01-15'), _sum: { revenue: 5000 }, _count: 10 },
				{ createdAt: new Date('2024-02-20'), _sum: { revenue: 7000 }, _count: 15 },
			];

			// Step 3: Transform to chart format
			const chartData = AggregatePipe.toChartSeries(prismaData, config!);

			expect(chartData.chartType).toBe('line');
			expect(chartData.categories).toHaveLength(12);
			expect(chartData.series).toHaveLength(2);
			expect(chartData.series[0].name).toBe('sum(revenue)');
			expect(chartData.series[1].name).toBe('count(orders)');
		});

		it('should work with simple aggregate workflow', () => {
			const config = pipe.transform('totalRevenue: sum(), avgPrice: avg()');
			const prismaData = { _sum: { totalRevenue: 10000 }, _avg: { avgPrice: 250 } };
			const chartData = AggregatePipe.toChartSeries(prismaData, config!);

			expect(chartData.categories).toEqual(['Total']);
			expect(chartData.series[0].data).toEqual([10000]);
			expect(chartData.series[1].data).toEqual([250]);
		});
	});
});