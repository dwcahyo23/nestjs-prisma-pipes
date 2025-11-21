"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const field_ref_converter_helper_1 = require("../../src/helpers/field-ref-converter.helper");
describe('Field Reference Converter', () => {
    const mockModelDelegate = {
        fields: {
            recQty: Symbol('recQty'),
            currentStock: Symbol('currentStock'),
            endDate: Symbol('endDate'),
            minPrice: Symbol('minPrice'),
            maxPrice: Symbol('maxPrice'),
            targetId: Symbol('targetId'),
            previousStatus: Symbol('previousStatus'),
            createdBy: Symbol('createdBy'),
        },
    };
    describe('convertFieldReferences', () => {
        it('should convert simple field reference', () => {
            const input = {
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                qty: {
                    lte: mockModelDelegate.fields.recQty,
                },
            });
        });
        it('should convert multiple field references', () => {
            const input = {
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
                startDate: {
                    lt: { _ref: 'endDate', _isFieldRef: true },
                },
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                qty: {
                    lte: mockModelDelegate.fields.recQty,
                },
                startDate: {
                    lt: mockModelDelegate.fields.endDate,
                },
            });
        });
        it('should not modify non-field-reference values', () => {
            const input = {
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
                status: 'active',
                price: {
                    gte: 100,
                },
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                qty: {
                    lte: mockModelDelegate.fields.recQty,
                },
                status: 'active',
                price: {
                    gte: 100,
                },
            });
        });
        it('should handle nested objects', () => {
            const input = {
                AND: [
                    {
                        qty: {
                            lte: { _ref: 'recQty', _isFieldRef: true },
                        },
                    },
                    {
                        price: {
                            gte: 100,
                        },
                    },
                ],
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                AND: [
                    {
                        qty: {
                            lte: mockModelDelegate.fields.recQty,
                        },
                    },
                    {
                        price: {
                            gte: 100,
                        },
                    },
                ],
            });
        });
        it('should handle arrays', () => {
            const input = {
                OR: [
                    {
                        qty: {
                            lte: { _ref: 'recQty', _isFieldRef: true },
                        },
                    },
                    {
                        minPrice: {
                            lte: { _ref: 'maxPrice', _isFieldRef: true },
                        },
                    },
                ],
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                OR: [
                    {
                        qty: {
                            lte: mockModelDelegate.fields.recQty,
                        },
                    },
                    {
                        minPrice: {
                            lte: mockModelDelegate.fields.maxPrice,
                        },
                    },
                ],
            });
        });
        it('should handle null and undefined', () => {
            expect((0, field_ref_converter_helper_1.convertFieldReferences)(null, mockModelDelegate)).toBeNull();
            expect((0, field_ref_converter_helper_1.convertFieldReferences)(undefined, mockModelDelegate)).toBeUndefined();
        });
        it('should handle primitives', () => {
            expect((0, field_ref_converter_helper_1.convertFieldReferences)('string', mockModelDelegate)).toBe('string');
            expect((0, field_ref_converter_helper_1.convertFieldReferences)(123, mockModelDelegate)).toBe(123);
            expect((0, field_ref_converter_helper_1.convertFieldReferences)(true, mockModelDelegate)).toBe(true);
        });
        it('should keep nested field path as-is (not supported by Prisma)', () => {
            const input = {
                balance: {
                    gte: { _ref: 'user.minBalance', _isFieldRef: true },
                },
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                balance: {
                    gte: { _ref: 'user.minBalance', _isFieldRef: true },
                },
            });
        });
        it('should keep unknown field references as-is', () => {
            const input = {
                qty: {
                    lte: { _ref: 'unknownField', _isFieldRef: true },
                },
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                qty: {
                    lte: { _ref: 'unknownField', _isFieldRef: true },
                },
            });
        });
        it('should handle complex real-world query', () => {
            const input = {
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
            };
            const result = (0, field_ref_converter_helper_1.convertFieldReferences)(input, mockModelDelegate);
            expect(result).toEqual({
                qty: {
                    lte: mockModelDelegate.fields.recQty,
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
    describe('createFieldRefConverter', () => {
        it('should create a reusable converter function', () => {
            const converter = (0, field_ref_converter_helper_1.createFieldRefConverter)(mockModelDelegate);
            const input = {
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
            };
            const result = converter(input);
            expect(result).toEqual({
                qty: {
                    lte: mockModelDelegate.fields.recQty,
                },
            });
        });
        it('should work with multiple calls', () => {
            const converter = (0, field_ref_converter_helper_1.createFieldRefConverter)(mockModelDelegate);
            const input1 = {
                qty: {
                    lte: { _ref: 'recQty', _isFieldRef: true },
                },
            };
            const input2 = {
                minPrice: {
                    lte: { _ref: 'maxPrice', _isFieldRef: true },
                },
            };
            const result1 = converter(input1);
            const result2 = converter(input2);
            expect(result1).toEqual({
                qty: {
                    lte: mockModelDelegate.fields.recQty,
                },
            });
            expect(result2).toEqual({
                minPrice: {
                    lte: mockModelDelegate.fields.maxPrice,
                },
            });
        });
    });
});
//# sourceMappingURL=field-ref-converter.spec.js.map