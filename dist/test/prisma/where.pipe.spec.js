"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const where_pipe_1 = __importDefault(require("../../src/prisma/where.pipe"));
describe('WherePipe', () => {
    let pipe;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [where_pipe_1.default],
        }).compile();
        pipe = moduleRef.get(where_pipe_1.default);
    });
    describe('Basic functionality', () => {
        it('should be defined', () => {
            expect(pipe).toBeDefined();
        });
        it('should return empty object when value is empty string', () => {
            const result = pipe.transform('');
            expect(result).toEqual({});
        });
        it('should return empty object when value is null', () => {
            const result = pipe.transform(null);
            expect(result).toEqual({});
        });
    });
    describe('Simple type parsing', () => {
        it('should parse string values', () => {
            const result = pipe.transform('userName: name');
            expect(result).toEqual({
                userName: 'name',
            });
        });
        it('should parse integer values', () => {
            const result = pipe.transform('number: 5');
            expect(result).toEqual({
                number: '5',
            });
        });
        it('should parse typed integer values', () => {
            const result = pipe.transform('id: int(42)');
            expect(result).toEqual({
                id: 42,
            });
        });
        it('should parse float values', () => {
            const result = pipe.transform('number: 0.0005');
            expect(result).toEqual({
                number: '0.0005',
            });
        });
        it('should parse typed float values', () => {
            const result = pipe.transform('price: float(19.99)');
            expect(result).toEqual({
                price: 19.99,
            });
        });
        it('should parse boolean values', () => {
            const result = pipe.transform('quest: true');
            expect(result).toEqual({
                quest: 'true',
            });
        });
        it('should parse typed boolean values', () => {
            const result = pipe.transform('isActive: boolean(true)');
            expect(result).toEqual({
                isActive: true,
            });
        });
        it('should parse typed string values', () => {
            const result = pipe.transform('code: string(ABC123)');
            expect(result).toEqual({
                code: 'ABC123',
            });
        });
    });
    describe('Date parsing', () => {
        it('should parse date values', () => {
            const date = `date: ${Date.now()}`;
            const result = pipe.transform(date);
            expect(result).toEqual({
                date: expect.any(String),
            });
        });
        it('should parse typed date values', () => {
            const result = pipe.transform('createdAt: date(2024-01-15T10:30:00Z)');
            expect(result).toEqual({
                createdAt: '2024-01-15T10:30:00.000Z',
            });
        });
        it('should parse datetime values', () => {
            const result = pipe.transform('updatedAt: datetime(2024-12-31T23:59:59Z)');
            expect(result).toEqual({
                updatedAt: '2024-12-31T23:59:59.000Z',
            });
        });
    });
    describe('Date range in same column', () => {
        it('should parse date range (gte & lte) in the same column', () => {
            const dateRange = 'createdAt: gte date(2024-01-01T00:00:00Z), createdAt: lte date(2024-12-31T23:59:59Z)';
            const result = pipe.transform(dateRange);
            expect(result).toBeDefined();
            expect(result).toHaveProperty('createdAt');
            expect(result.createdAt).toHaveProperty('gte');
            expect(result.createdAt).toHaveProperty('lte');
            const createdAt = result.createdAt;
            expect(createdAt.gte).toBe('2024-01-01T00:00:00.000Z');
            expect(createdAt.lte).toBe('2024-12-31T23:59:59.000Z');
            expect(new Date(createdAt.gte).getTime()).toBeLessThanOrEqual(new Date(createdAt.lte).getTime());
        });
        it('should parse date range (gt & lt) in the same column', () => {
            const dateRange = 'publishedAt: gt date(2024-06-01T00:00:00Z), publishedAt: lt date(2024-06-30T23:59:59Z)';
            const result = pipe.transform(dateRange);
            expect(result).toEqual({
                publishedAt: {
                    gt: '2024-06-01T00:00:00.000Z',
                    lt: '2024-06-30T23:59:59.000Z',
                },
            });
        });
        it('should parse multiple date ranges in different columns', () => {
            const dateRange = 'createdAt: gte date(2024-01-01T00:00:00Z), createdAt: lte date(2024-12-31T23:59:59Z), ' +
                'updatedAt: gte date(2024-06-01T00:00:00Z), updatedAt: lte date(2024-06-30T23:59:59Z)';
            const result = pipe.transform(dateRange);
            expect(result).toEqual({
                createdAt: {
                    gte: '2024-01-01T00:00:00.000Z',
                    lte: '2024-12-31T23:59:59.000Z',
                },
                updatedAt: {
                    gte: '2024-06-01T00:00:00.000Z',
                    lte: '2024-06-30T23:59:59.000Z',
                },
            });
        });
        it('should parse date with single operator', () => {
            const result = pipe.transform('createdAt: gte date(2024-01-01T00:00:00Z)');
            expect(result).toEqual({
                createdAt: {
                    gte: '2024-01-01T00:00:00.000Z',
                },
            });
        });
    });
    describe('Filter operators', () => {
        it('should parse "in" operator with array', () => {
            const result = pipe.transform('zipCode: in array(int(111), int(222))');
            expect(result).toEqual({
                zipCode: {
                    in: [111, 222],
                },
            });
        });
        it('should parse "has" operator', () => {
            const result = pipe.transform('tags: has yellow');
            expect(result).toEqual({
                tags: {
                    has: 'yellow',
                },
            });
        });
        it('should parse "hasEvery" operator with string array', () => {
            const result = pipe.transform('tags: hasEvery array(yellow, green)');
            expect(result).toEqual({
                tags: {
                    hasEvery: ['yellow', 'green'],
                },
            });
        });
        it('should parse "hasEvery" operator with integer array', () => {
            const result = pipe.transform('numbers: hasEvery array(int(5), int(8))');
            expect(result).toEqual({
                numbers: {
                    hasEvery: [5, 8],
                },
            });
        });
        it('should parse "hasSome" operator', () => {
            const result = pipe.transform('tags: hasSome array(yellow, green)');
            expect(result).toEqual({
                tags: {
                    hasSome: ['yellow', 'green'],
                },
            });
        });
        it('should parse "contains" operator', () => {
            const result = pipe.transform('tags: contains string(123)');
            expect(result).toEqual({
                tags: {
                    contains: '123',
                },
            });
        });
        it('should parse "equals" operator', () => {
            const result = pipe.transform('status: equals string(active)');
            expect(result).toEqual({
                status: {
                    equals: 'active',
                },
            });
        });
        it('should parse "not" operator', () => {
            const result = pipe.transform('role: not string(guest)');
            expect(result).toEqual({
                role: {
                    not: 'guest',
                },
            });
        });
        it('should parse "startsWith" operator', () => {
            const result = pipe.transform('email: startsWith string(admin)');
            expect(result).toEqual({
                email: {
                    startsWith: 'admin',
                },
            });
        });
        it('should parse "endsWith" operator', () => {
            const result = pipe.transform('email: endsWith string(@example.com)');
            expect(result).toEqual({
                email: {
                    endsWith: '@example.com',
                },
            });
        });
    });
    describe('Field-to-field comparison (NEW)', () => {
        it('should parse field reference with lte operator', () => {
            const result = pipe.transform('qty: lte field(recQty)');
            expect(result).toEqual({
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
            });
        });
        it('should parse field reference with gte operator', () => {
            const result = pipe.transform('minStock: gte field(currentStock)');
            expect(result).toEqual({
                minStock: {
                    gte: { _ref: 'currentStock', _isFieldRef: true },
                },
            });
        });
        it('should parse field reference with lt operator', () => {
            const result = pipe.transform('startDate: lt field(endDate)');
            expect(result).toEqual({
                startDate: {
                    lt: { _ref: 'endDate', _isFieldRef: true },
                },
            });
        });
        it('should parse field reference with gt operator', () => {
            const result = pipe.transform('maxPrice: gt field(minPrice)');
            expect(result).toEqual({
                maxPrice: {
                    gt: { _ref: 'minPrice', _isFieldRef: true },
                },
            });
        });
        it('should parse field reference with equals operator', () => {
            const result = pipe.transform('sourceId: equals field(targetId)');
            expect(result).toEqual({
                sourceId: {
                    equals: { _ref: 'targetId', _isFieldRef: true },
                },
            });
        });
        it('should parse field reference with not operator', () => {
            const result = pipe.transform('currentStatus: not field(previousStatus)');
            expect(result).toEqual({
                currentStatus: {
                    not: { _ref: 'previousStatus', _isFieldRef: true },
                },
            });
        });
        it('should parse field reference without operator (defaults to equals)', () => {
            const result = pipe.transform('userId: field(createdBy)');
            expect(result).toEqual({
                userId: {
                    equals: { _ref: 'createdBy', _isFieldRef: true },
                },
            });
        });
        it('should parse nested field reference', () => {
            const result = pipe.transform('balance: gte field(user.minBalance)');
            expect(result).toEqual({
                balance: {
                    gte: { _ref: 'user.minBalance', _isFieldRef: true },
                },
            });
        });
        it('should combine field reference with regular filters', () => {
            const result = pipe.transform('qty: lte field(recQty), status: string(active), price: gte float(100)');
            expect(result).toEqual({
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
                status: 'active',
                price: {
                    gte: 100,
                },
            });
        });
        it('should parse multiple field references', () => {
            const result = pipe.transform('qty: lte field(recQty), startDate: lt field(endDate), minPrice: lte field(maxPrice)');
            expect(result).toEqual({
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
                startDate: {
                    lt: { _ref: 'endDate', _isFieldRef: true },
                },
                minPrice: {
                    lte: { _ref: 'maxPrice', _isFieldRef: true },
                },
            });
        });
        it('should handle field reference in complex query', () => {
            const result = pipe.transform('qty: lte field(recQty), ' +
                'createdAt: gte date(2024-01-01T00:00:00Z), ' +
                'createdAt: lte date(2024-12-31T23:59:59Z), ' +
                'status: in array(active, pending)');
            expect(result).toEqual({
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
                createdAt: {
                    gte: '2024-01-01T00:00:00.000Z',
                    lte: '2024-12-31T23:59:59.000Z',
                },
                status: {
                    in: ['active', 'pending'],
                },
            });
        });
    });
    describe('Nested relation filters', () => {
        it('should parse nested ".is" relation filter', () => {
            const result = pipe.transform('profile.is.id: equals int(10)');
            expect(result).toEqual({
                profile: {
                    is: {
                        id: {
                            equals: 10,
                        },
                    },
                },
            });
        });
        it('should parse nested ".some" relation filter', () => {
            const result = pipe.transform('posts.some.title: contains string(Hello)');
            expect(result).toEqual({
                posts: {
                    some: {
                        title: {
                            contains: 'Hello',
                        },
                    },
                },
            });
        });
        it('should parse nested ".every" relation filter', () => {
            const result = pipe.transform('users.every.role: equals string(admin)');
            expect(result).toEqual({
                users: {
                    every: {
                        role: {
                            equals: 'admin',
                        },
                    },
                },
            });
        });
        it('should parse nested ".none" relation filter', () => {
            const result = pipe.transform('orders.none.status: equals string(cancelled)');
            expect(result).toEqual({
                orders: {
                    none: {
                        status: {
                            equals: 'cancelled',
                        },
                    },
                },
            });
        });
        it('should parse deeply nested ".some" relation filter', () => {
            const result = pipe.transform('company.is.departments.some.employees.every.name: contains string(John)');
            expect(result).toEqual({
                company: {
                    is: {
                        departments: {
                            some: {
                                employees: {
                                    every: {
                                        name: {
                                            contains: 'John',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });
    });
    describe('Complex combinations', () => {
        it('should parse combination of simple string and nested relation filter', () => {
            const result = pipe.transform('boxId: box-001, hseP3kItem.is.type: CONSUMABLE');
            expect(result).toEqual({
                boxId: 'box-001',
                hseP3kItem: {
                    is: {
                        type: 'CONSUMABLE',
                    },
                },
            });
        });
        it('should parse multi-nested object correctly', () => {
            const result = pipe.transform('hseAparRevision.unit.location.city: string(Jakarta), ' +
                'hseAparRevision.unit.location.country: string(ID), ' +
                'hseAparRevision.version: int(2)');
            expect(result).toEqual({
                hseAparRevision: {
                    version: 2,
                    unit: {
                        location: {
                            city: 'Jakarta',
                            country: 'ID',
                        },
                    },
                },
            });
        });
        it('should parse multi-object with different roots', () => {
            const result = pipe.transform('hseAparRevision.version: int(2), ' +
                'schedule.every: boolean(true), ' +
                'unit.name: string(Unit A), ' +
                'unit.location: string(Jakarta)');
            expect(result).toEqual({
                hseAparRevision: {
                    version: 2,
                },
                schedule: {
                    every: true,
                },
                unit: {
                    name: 'Unit A',
                    location: 'Jakarta',
                },
            });
        });
        it('should parse combination of simple and deeply nested values', () => {
            const result = pipe.transform('id: int(5), ' +
                'hseAparRevision.unit.location.city: string(Surabaya), ' +
                'hseAparRevision.masterAparId: string(123-uuid)');
            expect(result).toEqual({
                id: 5,
                hseAparRevision: {
                    masterAparId: '123-uuid',
                    unit: {
                        location: {
                            city: 'Surabaya',
                        },
                    },
                },
            });
        });
        it('should parse complex query with date ranges, operators, and nested objects', () => {
            const result = pipe.transform('status: equals string(active), ' +
                'createdAt: gte date(2024-01-01T00:00:00Z), ' +
                'createdAt: lte date(2024-12-31T23:59:59Z), ' +
                'user.is.role: string(admin), ' +
                'tags: hasEvery array(urgent, important)');
            expect(result).toEqual({
                status: {
                    equals: 'active',
                },
                createdAt: {
                    gte: '2024-01-01T00:00:00.000Z',
                    lte: '2024-12-31T23:59:59.000Z',
                },
                user: {
                    is: {
                        role: 'admin',
                    },
                },
                tags: {
                    hasEvery: ['urgent', 'important'],
                },
            });
        });
        it('should parse complex query with field references and date ranges', () => {
            const result = pipe.transform('qty: lte field(recQty), ' +
                'startDate: lt field(endDate), ' +
                'createdAt: gte date(2024-01-01T00:00:00Z), ' +
                'createdAt: lte date(2024-12-31T23:59:59Z), ' +
                'status: string(active)');
            expect(result).toEqual({
                qty: {
                    lte: {
                        _ref: 'recQty', _isFieldRef: true
                    }
                },
                startDate: {
                    lt: {
                        _ref: 'endDate', _isFieldRef: true
                    }
                },
                createdAt: {
                    gte: '2024-01-01T00:00:00.000Z',
                    lte: '2024-12-31T23:59:59.000Z',
                },
                status: 'active',
            });
        });
    });
    describe('Edge cases', () => {
        it('should handle empty array', () => {
            const result = pipe.transform('tags: in array()');
            expect(result).toEqual({
                tags: {
                    in: [],
                },
            });
        });
        it('should skip null or empty values', () => {
            const result = pipe.transform('name: , age: int(25)');
            expect(result).toEqual({
                age: 25,
            });
        });
        it('should handle mixed types in array', () => {
            const result = pipe.transform('data: in array(int(1), string(test), boolean(true))');
            expect(result).toEqual({
                data: {
                    in: [1, 'test', true],
                },
            });
        });
        it('should handle empty field reference', () => {
            const result = pipe.transform('qty: lte field()');
            expect(result).toEqual({
                qty: {
                    lte: {},
                },
            });
        });
    });
});
//# sourceMappingURL=where.pipe.spec.js.map