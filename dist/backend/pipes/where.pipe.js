"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const parse_object_literal_1 = __importDefault(require("../helpers/parse-object-literal"));
const delimeted_string_object_1 = __importDefault(require("../helpers/delimeted-string-object"));
const deep_merge_1 = __importDefault(require("../helpers/deep-merge"));
const timezone_service_1 = __importDefault(require("./timezone.service"));
const crypto_utils_1 = require("../utils/crypto.utils");
const FILTER_OPERATORS = [
    'lt', 'lte', 'gt', 'gte', 'equals', 'not',
    'contains', 'startsWith', 'endsWith',
    'every', 'some', 'none',
    'in', 'has', 'hasEvery', 'hasSome',
];
const RELATION_OPERATORS = ['is', 'isNot', 'some', 'every', 'none'];
function parseStringToNull(ruleValue) {
    if (ruleValue === 'null()') {
        return null;
    }
    return undefined;
}
const TYPE_PARSERS = {
    int: parseStringToInt,
    date: parseStringToDate,
    datetime: parseStringToDate,
    float: parseStringToFloat,
    string: parseStringToString,
    boolean: parseStringToBoolean,
    bool: parseStringToBoolean,
    array: parseStringToArray,
    field: parseFieldReference,
    null: parseStringToNull,
};
function extractParenthesesContent(input) {
    const match = /\(([^)]*)\)/.exec(input);
    return match ? match[1] : null;
}
function parseStringToInt(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('int(')) {
        return undefined;
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? parseInt(content, 10) : undefined;
}
function parseStringToDate(ruleValue) {
    const validPrefixes = ['date(', 'datetime('];
    const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));
    if (!ruleValue.endsWith(')') || !hasValidPrefix) {
        return undefined;
    }
    const content = extractParenthesesContent(ruleValue);
    if (!content)
        return undefined;
    const dateString = timezone_service_1.default.addTimezoneToDateString(content);
    return new Date(dateString).toISOString();
}
function parseStringToFloat(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('float(')) {
        return undefined;
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? parseFloat(content) : undefined;
}
function parseStringToString(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('string(')) {
        return undefined;
    }
    return extractParenthesesContent(ruleValue) || undefined;
}
function parseStringToBoolean(ruleValue) {
    const validPrefixes = ['boolean(', 'bool('];
    const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));
    if (!ruleValue.endsWith(')') || !hasValidPrefix) {
        return undefined;
    }
    const content = extractParenthesesContent(ruleValue);
    return content === 'true';
}
function parseStringToArray(ruleValue) {
    if (!ruleValue.startsWith('array(')) {
        return undefined;
    }
    const match = /\(([^]+)\)/.exec(ruleValue);
    if (!match || !match[1]) {
        return [];
    }
    return match[1].split(',').map((value) => {
        const trimmedValue = value.trim();
        const parsed = parseValue(trimmedValue);
        return parsed !== undefined ? parsed : trimmedValue;
    });
}
function parseFieldReference(ruleValue) {
    if (!ruleValue.startsWith('field(') || !ruleValue.endsWith(')')) {
        return undefined;
    }
    const fieldPath = extractParenthesesContent(ruleValue);
    if (!fieldPath) {
        return undefined;
    }
    let scope;
    let cleanPath = fieldPath;
    if (fieldPath.startsWith('$parent.')) {
        scope = 'parent';
        cleanPath = fieldPath.substring(8);
    }
    else if (fieldPath.startsWith('$root.')) {
        scope = 'root';
        cleanPath = fieldPath.substring(6);
    }
    const result = {
        _ref: cleanPath,
        _isFieldRef: true
    };
    if (scope) {
        result._scope = scope;
    }
    return result;
}
function isFieldReference(value) {
    return typeof value === 'object' && value !== null && '_isFieldRef' in value && value._isFieldRef === true;
}
function convertToFieldReference(fieldRef) {
    if (typeof fieldRef === 'object' && fieldRef !== null && '_ref' in fieldRef && '_isFieldRef' in fieldRef) {
        return fieldRef;
    }
    return {};
}
function parseValue(ruleValue) {
    for (const [type, parser] of Object.entries(TYPE_PARSERS)) {
        if (ruleValue.startsWith(`${type}(`)) {
            return parser(ruleValue);
        }
    }
    if (ruleValue === 'null') {
        return 'null';
    }
    return ruleValue;
}
function extractOperatorAndValue(ruleValue) {
    for (const operator of FILTER_OPERATORS) {
        if (ruleValue.startsWith(`${operator} `)) {
            return {
                operator,
                value: ruleValue.slice(operator.length).trim(),
            };
        }
    }
    return { operator: null, value: ruleValue };
}
let WherePipe = class WherePipe {
    transform(value, metadata) {
        if (value == null || value === '') {
            return {};
        }
        try {
            const clientIp = metadata?.data?.clientIp;
            const decodedValue = (0, crypto_utils_1.decodePipeQuery)(value, clientIp);
            const rules = (0, parse_object_literal_1.default)(decodedValue);
            let items = {};
            for (const rule of rules) {
                const [ruleKey, ruleValue] = rule;
                if (ruleValue == null || ruleValue === '') {
                    continue;
                }
                const { operator, value: rawValue } = extractOperatorAndValue(ruleValue);
                const parsedValue = parseValue(rawValue);
                if (rawValue.includes('null') && parsedValue === undefined) {
                    throw new common_1.BadRequestException(`Invalid null format in "${ruleKey}". Use null() not null. Examples: "field: null()" or "field: not null()"`);
                }
                if (parsedValue === undefined) {
                    console.warn(`Skipping invalid value for ${ruleKey}: ${rawValue}`);
                    continue;
                }
                let finalValue;
                if (operator) {
                    if (isFieldReference(parsedValue)) {
                        finalValue = { [operator]: convertToFieldReference(parsedValue) };
                    }
                    else {
                        finalValue = { [operator]: parsedValue };
                    }
                }
                else {
                    if (isFieldReference(parsedValue)) {
                        finalValue = { equals: convertToFieldReference(parsedValue) };
                    }
                    else {
                        finalValue = parsedValue;
                    }
                }
                if (ruleKey.indexOf('.') !== -1) {
                    const delimeted = (0, delimeted_string_object_1.default)(ruleKey, finalValue);
                    items = (0, deep_merge_1.default)(items, delimeted);
                }
                else {
                    if (items[ruleKey] && typeof items[ruleKey] === 'object' && typeof finalValue === 'object' && !Array.isArray(finalValue) && !Array.isArray(items[ruleKey])) {
                        items[ruleKey] = { ...items[ruleKey], ...finalValue };
                    }
                    else {
                        items[ruleKey] = finalValue;
                    }
                }
            }
            return items;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            console.error('Error parsing query string:', error);
            throw new common_1.BadRequestException('Invalid query format');
        }
    }
};
WherePipe = __decorate([
    (0, common_1.Injectable)()
], WherePipe);
exports.default = WherePipe;
//# sourceMappingURL=where.pipe.js.map