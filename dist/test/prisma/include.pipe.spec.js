"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const include_pipe_1 = require("../../src/prisma/include.pipe");
describe('IncludeTransformPipe', () => {
    let pipe;
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [include_pipe_1.IncludePipe],
        }).compile();
        pipe = moduleRef.get(include_pipe_1.IncludePipe);
    });
    it('should return undefined if value is undefined', () => {
        expect(pipe.transform(undefined)).toBeUndefined();
    });
    it('should return undefined if value is empty string', () => {
        expect(pipe.transform('   ')).toBeUndefined();
    });
    it('should parse flat includes', () => {
        const result = pipe.transform('author,comments');
        expect(result).toEqual({
            author: true,
            comments: true,
        });
    });
    it('should parse nested includes', () => {
        const result = pipe.transform('comments.author');
        expect(result).toEqual({
            comments: { include: { author: true } },
        });
    });
    it('should parse select fields', () => {
        const result = pipe.transform('author.select:(id,name)');
        expect(result).toEqual({
            author: { select: { id: true, name: true } },
        });
    });
    it('should parse nested includes with select', () => {
        const result = pipe.transform('comments.author.select:(id)');
        expect(result).toEqual({
            comments: {
                include: {
                    author: { select: { id: true } },
                },
            },
        });
    });
    it('should parse mixed includes and selects', () => {
        const result = pipe.transform('author.select:(id,name),comments,comments.author.select:(id)');
        expect(result).toEqual({
            author: { select: { id: true, name: true } },
            comments: {
                include: {
                    author: { select: { id: true } },
                },
            },
        });
    });
    it('should parse multi-nested selects and includes', () => {
        const result = pipe.transform('posts.comments,profile.select:(id,firstName,account.select:(password,email))');
        expect(result).toEqual({
            posts: {
                include: {
                    comments: true,
                },
            },
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    account: {
                        select: {
                            password: true,
                            email: true,
                        },
                    },
                },
            },
        });
    });
    it('should parse deep nested includes with selects', () => {
        const result = pipe.transform('company.departments.select:(name,employees.select:(id,name,manager.select:(id)))');
        expect(result).toEqual({
            company: {
                include: {
                    departments: {
                        select: {
                            name: true,
                            employees: {
                                select: {
                                    id: true,
                                    name: true,
                                    manager: {
                                        select: {
                                            id: true,
                                        },
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
//# sourceMappingURL=include.pipe.spec.js.map