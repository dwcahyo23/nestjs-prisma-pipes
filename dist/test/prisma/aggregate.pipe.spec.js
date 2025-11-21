"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const aggregate_pipe_1 = __importDefault(require("../../src/prisma/aggregate.pipe"));
describe('AggregatePipe', () => {
    let pipe;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [aggregate_pipe_1.default],
        }).compile();
        pipe = moduleRef.get(aggregate_pipe_1.default);
    });
    describe('Relationship GroupBy - Manual Aggregation', () => {
        const createMockPrismaModel = (data) => ({
            findMany: jest.fn().mockResolvedValue(data),
            groupBy: jest.fn(),
            aggregate: jest.fn(),
        });
        describe('Single Relationship GroupBy', () => {
            it('should calculate sum correctly with relationship groupBy', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, qty: 100, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, qty: 150, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, qty: 200, marketingMasterCategory: { category: 'O4W' } },
                    { id: 4, qty: 250, marketingMasterCategory: { category: 'O4W' } },
                    { id: 5, qty: 300, marketingMasterCategory: { category: 'RET' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(config?.useManualAggregation).toBe(true);
                expect(prismaModel.findMany).toHaveBeenCalledWith({
                    where: undefined,
                    include: { marketingMasterCategory: true },
                });
                expect(result).toHaveLength(3);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._sum.qty).toBe(250);
                const o4wResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W');
                expect(o4wResult._sum.qty).toBe(450);
                const retResult = result.find((r) => r.marketingMasterCategory?.category === 'RET');
                expect(retResult._sum.qty).toBe(300);
            });
            it('should calculate avg correctly with relationship groupBy', async () => {
                const config = pipe.transform('price: avg(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, price: 100, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, price: 200, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, price: 150, marketingMasterCategory: { category: 'COM' } },
                    { id: 4, price: 300, marketingMasterCategory: { category: 'O4W' } },
                    { id: 5, price: 500, marketingMasterCategory: { category: 'O4W' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(2);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._avg.price).toBe(150);
                const o4wResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W');
                expect(o4wResult._avg.price).toBe(400);
            });
            it('should calculate count correctly with relationship groupBy', async () => {
                const config = pipe.transform('id: count(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, marketingMasterCategory: { category: 'COM' } },
                    { id: 4, marketingMasterCategory: { category: 'O4W' } },
                    { id: 5, marketingMasterCategory: { category: 'O4W' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(2);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._count.id).toBe(3);
                const o4wResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W');
                expect(o4wResult._count.id).toBe(2);
            });
            it('should calculate min and max correctly with relationship groupBy', async () => {
                const config = pipe.transform('price: min(), price: max(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, price: 100, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, price: 500, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, price: 250, marketingMasterCategory: { category: 'COM' } },
                    { id: 4, price: 150, marketingMasterCategory: { category: 'O4W' } },
                    { id: 5, price: 800, marketingMasterCategory: { category: 'O4W' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(2);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._min.price).toBe(100);
                expect(comResult._max.price).toBe(500);
                const o4wResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W');
                expect(o4wResult._min.price).toBe(150);
                expect(o4wResult._max.price).toBe(800);
            });
        });
        describe('Multiple Aggregates with Relationship GroupBy', () => {
            it('should calculate multiple aggregates correctly', async () => {
                const config = pipe.transform('qty: sum(), recQty: sum(), price: avg(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, qty: 100, recQty: 80, price: 50, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, qty: 150, recQty: 120, price: 60, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, qty: 200, recQty: 180, price: 100, marketingMasterCategory: { category: 'O4W' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(2);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._sum.qty).toBe(250);
                expect(comResult._sum.recQty).toBe(200);
                expect(comResult._avg.price).toBe(55);
                const o4wResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W');
                expect(o4wResult._sum.qty).toBe(200);
                expect(o4wResult._sum.recQty).toBe(180);
                expect(o4wResult._avg.price).toBe(100);
            });
        });
        describe('Multiple Relationship GroupBy', () => {
            it('should calculate sum with multiple relationship fields', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (marketingMasterCategory.category, warehouse.region)');
                const mockData = [
                    {
                        id: 1,
                        qty: 100,
                        marketingMasterCategory: { category: 'COM' },
                        warehouse: { region: 'US' }
                    },
                    {
                        id: 2,
                        qty: 150,
                        marketingMasterCategory: { category: 'COM' },
                        warehouse: { region: 'US' }
                    },
                    {
                        id: 3,
                        qty: 200,
                        marketingMasterCategory: { category: 'COM' },
                        warehouse: { region: 'EU' }
                    },
                    {
                        id: 4,
                        qty: 300,
                        marketingMasterCategory: { category: 'O4W' },
                        warehouse: { region: 'US' }
                    },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(3);
                const comUsResult = result.find((r) => r.marketingMasterCategory?.category === 'COM' && r.warehouse?.region === 'US');
                expect(comUsResult._sum.qty).toBe(250);
                const comEuResult = result.find((r) => r.marketingMasterCategory?.category === 'COM' && r.warehouse?.region === 'EU');
                expect(comEuResult._sum.qty).toBe(200);
                const o4wUsResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W' && r.warehouse?.region === 'US');
                expect(o4wUsResult._sum.qty).toBe(300);
            });
        });
        describe('Edge Cases with Relationship GroupBy', () => {
            it('should handle null relationship values', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, qty: 100, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, qty: 150, marketingMasterCategory: { category: null } },
                    { id: 3, qty: 200, marketingMasterCategory: null },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(2);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._sum.qty).toBe(100);
                const nullResult = result.find((r) => r.marketingMasterCategory?.category === null);
                expect(nullResult._sum.qty).toBe(350);
            });
            it('should handle empty data set', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (marketingMasterCategory.category)');
                const mockData = [];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(0);
            });
            it('should handle null numeric values in aggregation', async () => {
                const config = pipe.transform('price: avg(), groupBy: (marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, price: 100, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, price: null, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, price: 200, marketingMasterCategory: { category: 'COM' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                expect(comResult._avg.price).toBe(150);
            });
        });
        describe('Chart Series with Relationship GroupBy', () => {
            it('should transform relationship groupBy data to chart series', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category)');
                const mockData = [
                    { id: 1, qty: 100, marketingMasterCategory: { category: 'COM' } },
                    { id: 2, qty: 150, marketingMasterCategory: { category: 'COM' } },
                    { id: 3, qty: 200, marketingMasterCategory: { category: 'O4W' } },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                const chartData = aggregate_pipe_1.default.toChartSeries(result, config);
                expect(chartData.categories).toEqual(['COM', 'O4W']);
                expect(chartData.series).toHaveLength(1);
                expect(chartData.series[0].name).toBe('sum(qty)');
                expect(chartData.series[0].data).toEqual([250, 200]);
                expect(chartData.chartType).toBe('bar');
            });
            it('should handle time series with relationship groupBy', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (marketingMasterCategory.category, createdAt), chart: line(createdAt, month)');
                const mockData = [
                    {
                        id: 1,
                        qty: 100,
                        createdAt: '2024-01-15',
                        marketingMasterCategory: { category: 'COM' }
                    },
                    {
                        id: 2,
                        qty: 150,
                        createdAt: '2024-02-20',
                        marketingMasterCategory: { category: 'COM' }
                    },
                    {
                        id: 3,
                        qty: 200,
                        createdAt: '2024-01-10',
                        marketingMasterCategory: { category: 'O4W' }
                    },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                const chartData = aggregate_pipe_1.default.toChartSeries(result, config);
                expect(chartData.categories).toHaveLength(12);
                expect(chartData.series).toHaveLength(2);
                expect(chartData.series[0].name).toContain('COM');
                expect(chartData.series[0].data[0]).toBe(100);
                expect(chartData.series[0].data[1]).toBe(150);
                expect(chartData.series[1].name).toContain('O4W');
                expect(chartData.series[1].data[0]).toBe(200);
            });
        });
        describe('Complex Nested Relationships', () => {
            it('should handle deeply nested relationships', async () => {
                const config = pipe.transform('qty: sum(), groupBy: (product.category.department.name)');
                const mockData = [
                    {
                        id: 1,
                        qty: 100,
                        product: {
                            category: {
                                department: { name: 'Electronics' }
                            }
                        }
                    },
                    {
                        id: 2,
                        qty: 150,
                        product: {
                            category: {
                                department: { name: 'Electronics' }
                            }
                        }
                    },
                    {
                        id: 3,
                        qty: 200,
                        product: {
                            category: {
                                department: { name: 'Clothing' }
                            }
                        }
                    },
                ];
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(2);
                const electronicsResult = result.find((r) => r.product?.category?.department?.name === 'Electronics');
                expect(electronicsResult._sum.qty).toBe(250);
                const clothingResult = result.find((r) => r.product?.category?.department?.name === 'Clothing');
                expect(clothingResult._sum.qty).toBe(200);
            });
        });
        describe('Performance and Accuracy', () => {
            it('should accurately aggregate large dataset', async () => {
                const config = pipe.transform('revenue: sum(), orderCount: count(), avgPrice: avg(), groupBy: (marketingMasterCategory.category)');
                const mockData = [];
                for (let i = 0; i < 1000; i++) {
                    mockData.push({
                        id: i,
                        revenue: Math.floor(Math.random() * 1000),
                        price: Math.floor(Math.random() * 100),
                        marketingMasterCategory: {
                            category: i % 3 === 0 ? 'COM' : i % 3 === 1 ? 'O4W' : 'RET'
                        }
                    });
                }
                const prismaModel = createMockPrismaModel(mockData);
                const result = await aggregate_pipe_1.default.execute(prismaModel, config);
                expect(result).toHaveLength(3);
                const comResult = result.find((r) => r.marketingMasterCategory?.category === 'COM');
                const o4wResult = result.find((r) => r.marketingMasterCategory?.category === 'O4W');
                const retResult = result.find((r) => r.marketingMasterCategory?.category === 'RET');
                const totalCount = comResult._count.orderCount + o4wResult._count.orderCount + retResult._count.orderCount;
                expect(totalCount).toBe(1000);
                [comResult, o4wResult, retResult].forEach(result => {
                    expect(result._sum.revenue).toBeGreaterThanOrEqual(0);
                    expect(result._count.orderCount).toBeGreaterThan(0);
                    expect(result._avg.avgPrice).toBeGreaterThanOrEqual(0);
                    expect(result._avg.avgPrice).toBeLessThanOrEqual(100);
                });
            });
        });
    });
});
//# sourceMappingURL=aggregate.pipe.spec.js.map