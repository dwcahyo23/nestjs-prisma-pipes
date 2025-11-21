"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertFieldReferences = convertFieldReferences;
exports.createFieldRefConverter = createFieldRefConverter;
function isFieldReference(value) {
    return (typeof value === 'object' &&
        value !== null &&
        '_isFieldRef' in value &&
        value._isFieldRef === true &&
        '_ref' in value);
}
function convertFieldReferences(obj, modelDelegate) {
    if (obj == null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => convertFieldReferences(item, modelDelegate));
    }
    if (isFieldReference(obj)) {
        const fieldPath = obj._ref;
        if (fieldPath.includes('.')) {
            return obj;
        }
        if (modelDelegate && modelDelegate.fields && modelDelegate.fields[fieldPath]) {
            return modelDelegate.fields[fieldPath];
        }
        return obj;
    }
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = convertFieldReferences(value, modelDelegate);
    }
    return result;
}
function createFieldRefConverter(modelDelegate) {
    return (where) => convertFieldReferences(where, modelDelegate);
}
//# sourceMappingURL=field-ref-converter.helper.js.map