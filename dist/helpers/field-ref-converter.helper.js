"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFieldReference = isFieldReference;
exports.extractFieldRefInfo = extractFieldRefInfo;
exports.resolveFieldReference = resolveFieldReference;
exports.convertFieldReferences = convertFieldReferences;
exports.initFieldRefContext = initFieldRefContext;
exports.createFieldRefConverter = createFieldRefConverter;
exports.convertWhereClause = convertWhereClause;
exports.validateFieldReferences = validateFieldReferences;
exports.extractAllFieldReferences = extractAllFieldReferences;
function isFieldReference(value) {
    return (typeof value === 'object' &&
        value !== null &&
        '_isFieldRef' in value &&
        value._isFieldRef === true &&
        '_ref' in value);
}
function extractFieldRefInfo(value) {
    if (!isFieldReference(value)) {
        return null;
    }
    return {
        ref: value._ref,
        scope: value._scope,
        isFieldRef: true,
    };
}
function resolveFieldReference(fieldRef, prisma, context, options = {}) {
    const info = extractFieldRefInfo(fieldRef);
    if (!info) {
        return fieldRef;
    }
    const { ref, scope } = info;
    const { debug, strict, customResolver } = options;
    if (customResolver) {
        try {
            const resolved = customResolver(ref, scope, context);
            if (resolved !== undefined) {
                return resolved;
            }
        }
        catch (error) {
            if (debug) {
                console.warn('Custom resolver failed:', error);
            }
        }
    }
    let resolvedField;
    if (scope === 'parent' && context.parentFields) {
        resolvedField = context.parentFields[ref];
        if (debug && resolvedField) {
            console.log(`Resolved $parent.${ref} in ${context.parentModel}`);
        }
    }
    else if (scope === 'root' && context.rootFields) {
        resolvedField = context.rootFields[ref];
        if (debug && resolvedField) {
            console.log(`Resolved $root.${ref} in ${context.rootModel}`);
        }
    }
    else {
        const currentFields = prisma[context.currentModel]?.fields;
        if (currentFields) {
            resolvedField = currentFields[ref];
            if (debug && resolvedField) {
                console.log(`Resolved ${ref} in ${context.currentModel}`);
            }
        }
    }
    if (!resolvedField) {
        const scopeStr = scope ? `$${scope}.` : '';
        const message = `Field reference not resolved: ${scopeStr}${ref} in model ${context.currentModel}`;
        if (strict) {
            throw new Error(message);
        }
        if (debug) {
            console.warn(message);
        }
        return fieldRef;
    }
    return resolvedField;
}
function convertFieldReferences(whereClause, prisma, context, options = {}) {
    if (!whereClause || typeof whereClause !== 'object') {
        return whereClause;
    }
    if (Array.isArray(whereClause)) {
        return whereClause.map((item) => convertFieldReferences(item, prisma, context, options));
    }
    if (isFieldReference(whereClause)) {
        return resolveFieldReference(whereClause, prisma, context, options);
    }
    const result = {};
    for (const [key, value] of Object.entries(whereClause)) {
        if (['some', 'every', 'none', 'is'].includes(key)) {
            const newContext = {
                ...context,
                parentModel: context.currentModel,
                parentFields: prisma[context.currentModel]?.fields,
            };
            result[key] = convertFieldReferences(value, prisma, newContext, options);
        }
        else if (['AND', 'OR', 'NOT'].includes(key)) {
            result[key] = convertFieldReferences(value, prisma, context, options);
        }
        else if (typeof value === 'object' && value !== null) {
            result[key] = convertFieldReferences(value, prisma, context, options);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function initFieldRefContext(prisma, modelName) {
    return {
        currentModel: modelName,
        rootModel: modelName,
        rootFields: prisma[modelName]?.fields,
    };
}
function createFieldRefConverter(prisma, modelName, options = {}) {
    return (whereClause) => {
        const context = initFieldRefContext(prisma, modelName);
        return convertFieldReferences(whereClause, prisma, context, options);
    };
}
function convertWhereClause(whereClause, prisma, modelName, options = {}) {
    const context = initFieldRefContext(prisma, modelName);
    return convertFieldReferences(whereClause, prisma, context, options);
}
function validateFieldReferences(whereClause, prisma, modelName) {
    const errors = [];
    const warnings = [];
    function validate(obj, context, path = '') {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => validate(item, context, `${path}[${idx}]`));
            return;
        }
        if (isFieldReference(obj)) {
            const info = extractFieldRefInfo(obj);
            if (!info)
                return;
            const { ref, scope } = info;
            let fieldExists = false;
            if (scope === 'parent' && context.parentFields) {
                fieldExists = ref in context.parentFields;
            }
            else if (scope === 'root' && context.rootFields) {
                fieldExists = ref in context.rootFields;
            }
            else {
                const currentFields = prisma[context.currentModel]?.fields;
                fieldExists = currentFields && ref in currentFields;
            }
            if (!fieldExists) {
                const scopeStr = scope ? `$${scope}.` : '';
                errors.push(`Field reference at '${path}': ${scopeStr}${ref} not found in model ${context.currentModel}`);
            }
            return;
        }
        for (const [key, value] of Object.entries(obj)) {
            const newPath = path ? `${path}.${key}` : key;
            if (['some', 'every', 'none', 'is'].includes(key)) {
                const newContext = {
                    ...context,
                    parentModel: context.currentModel,
                    parentFields: prisma[context.currentModel]?.fields,
                };
                validate(value, newContext, newPath);
            }
            else {
                validate(value, context, newPath);
            }
        }
    }
    const context = initFieldRefContext(prisma, modelName);
    validate(whereClause, context);
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
function extractAllFieldReferences(whereClause, currentModel = 'unknown') {
    const references = [];
    function extract(obj, context, path = '') {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => extract(item, context, `${path}[${idx}]`));
            return;
        }
        if (isFieldReference(obj)) {
            const info = extractFieldRefInfo(obj);
            if (info) {
                references.push({
                    path: path || 'root',
                    ref: info.ref,
                    scope: info.scope,
                    context,
                });
            }
            return;
        }
        for (const [key, value] of Object.entries(obj)) {
            const newPath = path ? `${path}.${key}` : key;
            extract(value, context, newPath);
        }
    }
    extract(whereClause, currentModel);
    return references;
}
//# sourceMappingURL=field-ref-converter.helper.js.map