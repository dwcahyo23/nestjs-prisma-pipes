"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function deepMerge(target, source) {
    if (typeof target !== 'object' || target === null)
        return source;
    if (typeof source !== 'object' || source === null)
        return source;
    const merged = { ...target };
    for (const key of Object.keys(source)) {
        if (key in target) {
            merged[key] = deepMerge(target[key], source[key]);
        }
        else {
            merged[key] = source[key];
        }
    }
    return merged;
}
exports.default = deepMerge;
//# sourceMappingURL=deep-merge.js.map