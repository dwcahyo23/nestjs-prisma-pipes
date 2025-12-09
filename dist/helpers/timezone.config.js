"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePipesTimezone = configurePipesTimezone;
exports.getPipesTimezone = getPipesTimezone;
const timezone_service_1 = __importDefault(require("../prisma/timezone.service"));
function configurePipesTimezone(config) {
    timezone_service_1.default.setTimezone(config);
}
function getPipesTimezone() {
    return timezone_service_1.default.getTimezone();
}
//# sourceMappingURL=timezone.config.js.map