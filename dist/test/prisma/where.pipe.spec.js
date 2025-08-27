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
    it('if transform value is empty pipe return empty json', () => {
        const result = pipe.transform('');
        expect(result).toEqual({});
    });
    it('if transform value is date should return parsed date', () => {
        const date = `date:${Date.now()}`;
        expect(pipe.transform(date)).toEqual({
            date: expect.any(String),
        });
    });
    it('if transform value is float should return parsed float', () => {
        const float = 'number: 0.0005';
        expect(pipe.transform(float)).toEqual({
            number: '0.0005',
        });
    });
    it('if transform value is string should return parsed string', () => {
        const user = 'userName: name';
        expect(pipe.transform(user)).toEqual({
            userName: 'name',
        });
    });
    it('if transform value is boolean should return parsed boolean', () => {
        const question = 'quest: true';
        expect(pipe.transform(question)).toEqual({
            quest: 'true',
        });
    });
    it('if transform value is integer should return parsed int', () => {
        const integer = 'number: 5';
        expect(pipe.transform(integer)).toEqual({
            number: '5',
        });
    });
    it('if transform value is array should return [in: array] ', () => {
        const string = 'zipCode: in array(int(111), int(222))';
        expect(pipe.transform(string)).toEqual({
            zipCode: {
                in: [111, 222]
            },
        });
    });
    it('should parse "has" from string "tags: has yellow"', () => {
        const string = 'tags: has yellow';
        expect(pipe.transform(string)).toEqual({
            tags: {
                has: "yellow",
            },
        });
    });
    it('should parse "hasEvery" from string "tags: hasEvery array(yellow, green)"', () => {
        const string = 'tags: hasEvery array(yellow, green)';
        expect(pipe.transform(string)).toEqual({
            tags: {
                hasEvery: ["yellow", "green"],
            },
        });
    });
    it('should parse "hasEvery" from string "numbers: hasEvery array(int(5), int(8))"', () => {
        const string = 'numbers: hasEvery array(int(5), int(8))';
        expect(pipe.transform(string)).toEqual({
            numbers: {
                hasEvery: [5, 8],
            },
        });
    });
    it('should parse "hasSome" from string "tags: hasSome array(yellow, green)"', () => {
        const string = 'tags: hasSome array(yellow, green)';
        expect(pipe.transform(string)).toEqual({
            tags: {
                hasSome: ["yellow", "green"],
            },
        });
    });
    it('should parse "contains" from string "tags: contains string(123)"', () => {
        const string = 'tags: contains string(123)';
        expect(pipe.transform(string)).toEqual({
            tags: {
                contains: "123"
            }
        });
    });
    it('should parse nested ".is" relation filter', () => {
        const string = 'profile.is.id: equals int(10)';
        expect(pipe.transform(string)).toEqual({
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
        const string = 'posts.some.title: contains string(Hello)';
        expect(pipe.transform(string)).toEqual({
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
        const string = 'users.every.role: equals string(admin)';
        expect(pipe.transform(string)).toEqual({
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
        const string = 'orders.none.status: equals string(cancelled)';
        expect(pipe.transform(string)).toEqual({
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
        const string = 'company.is.departments.some.employees.every.name: contains string(John)';
        expect(pipe.transform(string)).toEqual({
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
    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });
});
//# sourceMappingURL=where.pipe.spec.js.map