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
    it('should parse "and" from string "tags: contains string(123) , name: contains string(name)"', () => {
        const string = 'and(tags: contains string(123), name: contains string(name))';
        expect(pipe.transform(string)).toEqual({
            AND: {
                tags: {
                    contains: "123"
                },
                name: {
                    contains: "name"
                }
            }
        });
    });
    it('should parse "." from string "tags.id: contains string(123)"', () => {
        const string = 'tags.id: contains string(123)';
        expect(pipe.transform(string)).toEqual({
            tags: {
                is: {
                    id: {
                        contains: "123"
                    }
                }
            },
        });
    });
    it('should parse "." from string "user.data.role: hasSome array(admin, user)"', () => {
        const string = 'user.data.role: hasSome array(yellow, green)';
        expect(pipe.transform(string)).toEqual({
            user: {
                is: {
                    data: {
                        is: {
                            role: {
                                hasSome: ["yellow", "green"]
                            }
                        }
                    }
                }
            },
        });
    });
    it('should parse "." from string "user.data.account.role: contains string(Admin): contains string(Jhon)"', () => {
        const string = 'user.data.account.role: contains string(Admin): contains string(Jhon)';
        expect(pipe.transform(string)).toEqual({
            user: {
                is: {
                    data: {
                        is: {
                            account: {
                                is: {
                                    role: {
                                        contains: "Admin"
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });
    });
    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });
});
//# sourceMappingURL=where.pipe.spec.js.map