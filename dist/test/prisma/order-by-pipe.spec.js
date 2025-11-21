"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const order_by_pipe_1 = __importDefault(require("../../src/prisma/order-by.pipe"));
describe('OrderByPipe', () => {
    let pipe;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [order_by_pipe_1.default],
        }).compile();
        pipe = moduleRef.get(order_by_pipe_1.default);
    });
    it('should convert "name:asc, address:desc" to array format', () => {
        const value = 'name:asc, address:desc';
        const result = pipe.transform(value);
        expect(result).toEqual([
            { name: 'asc' },
            { address: 'desc' },
        ]);
    });
    it('should handle spaces around rules', () => {
        const value = 'name: asc, address: desc';
        const result = pipe.transform(value);
        expect(result).toEqual([
            { name: 'asc' },
            { address: 'desc' },
        ]);
    });
    it('should return undefined if value is empty', () => {
        const value = '';
        const result = pipe.transform(value);
        expect(result).toBeUndefined();
    });
    it('should normalize order direction to lowercase', () => {
        const value = 'name:ASC, address:DESC';
        const result = pipe.transform(value);
        expect(result).toEqual([
            { name: 'asc' },
            { address: 'desc' },
        ]);
    });
    it('should throw an error for invalid order direction', () => {
        const value = 'name:name, address:address';
        expect(() => pipe.transform(value)).toThrow();
    });
    it('should support nested relation fields like "profile.bio:desc"', () => {
        const value = 'profile.bio:desc';
        const result = pipe.transform(value);
        expect(result).toEqual([
            { profile: { bio: 'desc' } },
        ]);
    });
    it('should support multiple nested order rules', () => {
        const value = 'name:asc, profile.bio:desc, company.department.name:asc';
        const result = pipe.transform(value);
        expect(result).toEqual([
            { name: 'asc' },
            { profile: { bio: 'desc' } },
            { company: { department: { name: 'asc' } } },
        ]);
    });
    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });
});
//# sourceMappingURL=order-by-pipe.spec.js.map