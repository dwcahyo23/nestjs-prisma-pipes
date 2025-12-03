"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePipesTimezone = configurePipesTimezone;
exports.getPipesTimezone = getPipesTimezone;
const src_1 = require("src");
function configurePipesTimezone(config) {
    src_1.TimezoneService.setTimezone(config);
}
function getPipesTimezone() {
    return src_1.TimezoneService.getTimezone();
}
//# sourceMappingURL=timezone.config.js.map