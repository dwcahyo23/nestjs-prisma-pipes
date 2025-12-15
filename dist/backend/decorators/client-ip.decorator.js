"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientIp = void 0;
const common_1 = require("@nestjs/common");
exports.ClientIp = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }
    return request.ip || request.connection?.remoteAddress;
});
//# sourceMappingURL=client-ip.decorator.js.map