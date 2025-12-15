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
let SelectPipe = class SelectPipe {
    transform(value, metadata) {
        if (value == null || value.trim() === '') {
            return undefined;
        }
        try {
            const clientIp = metadata?.data?.clientIp;
            const decodedValue = (0, crypto_utils_1.decodePipeQuery)(value, clientIp);
            const selectFields = decodedValue.split(',').map((val) => val.trim());
            const select = {};
            selectFields.forEach((field) => {
                if (field.startsWith('-')) {
                    select[field.replace('-', '')] = false;
                }
                else {
                    select[field] = true;
                }
            });
            return select;
        }
        catch (error) {
            console.error(`Error transforming string to Pipes.Select: ${error}`);
            throw new common_1.BadRequestException('Invalid select query parameter');
        }
    }
};
SelectPipe = __decorate([
    (0, common_1.Injectable)()
], SelectPipe);
exports.default = SelectPipe;
//# sourceMappingURL=select.pipe.js.map