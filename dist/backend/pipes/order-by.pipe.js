"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const crypto_utils_1 = require("../utils/crypto.utils");
let OrderByPipe = class OrderByPipe {
    transform(value, metadata) {
        if (!value || value.trim() === '')
            return undefined;
        try {
            const clientIp = metadata?.data?.clientIp;
            const decodedValue = (0, crypto_utils_1.decodePipeQuery)(value, clientIp);
            const rules = decodedValue
                .split(',')
                .map((val) => val.trim())
                .filter(Boolean);
            const orderBy = [];
            for (const rule of rules) {
                const [key, order] = rule.split(':').map((s) => s?.trim());
                if (!key || !order) {
                    throw new common_1.BadRequestException(`Invalid orderBy rule: "${rule}", must be "field:asc|desc"`);
                }
                const orderLower = order.toLowerCase();
                if (!['asc', 'desc'].includes(orderLower)) {
                    throw new common_1.BadRequestException(`Invalid order direction: ${orderLower}`);
                }
                const keys = key.split('.');
                let nested = {};
                let current = nested;
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    if (i === keys.length - 1) {
                        current[k] = orderLower;
                    }
                    else {
                        current[k] = {};
                        current = current[k];
                    }
                }
                orderBy.push(nested);
            }
            return orderBy;
        }
        catch (error) {
            console.error('Error parsing orderBy:', error);
            throw new common_1.BadRequestException('Invalid orderBy query parameter');
        }
    }
};
OrderByPipe = __decorate([
    (0, common_1.Injectable)()
], OrderByPipe);
exports.default = OrderByPipe;
//# sourceMappingURL=order-by.pipe.js.map