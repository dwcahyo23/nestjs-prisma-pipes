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
const FILTER_OPERATORS = [
    'lt', 'lte', 'gt', 'gte', 'equals', 'not',
    'contains', 'startsWith', 'endsWith',
    'every', 'some', 'none',
    'in', 'has', 'hasEvery', 'hasSome',
];
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
};
function extractParenthesesContent(input) {
    const match = /\(([^)]+)\)/.exec(input);
    return match ? match[1] : null;
}
function parseStringToInt(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('int(')) {
        return 0;
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? parseInt(content, 10) : 0;
}
function parseStringToDate(ruleValue) {
    const validPrefixes = ['date(', 'datetime('];
    const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));
    if (!ruleValue.endsWith(')') || !hasValidPrefix) {
        return '';
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? new Date(content).toISOString() : '';
}
function parseStringToFloat(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('float(')) {
        return 0;
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? parseFloat(content) : 0;
}
function parseStringToString(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('string(')) {
        return '';
    }
    return extractParenthesesContent(ruleValue) || '';
}
function parseStringToBoolean(ruleValue) {
    const validPrefixes = ['boolean(', 'bool('];
    const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));
    if (!ruleValue.endsWith(')') || !hasValidPrefix) {
        return false;
    }
    const content = extractParenthesesContent(ruleValue);
    return content === 'true';
}
function parseStringToArray(ruleValue) {
    if (!ruleValue.startsWith('array(')) {
        return [];
    }
    const match = /\(([^]+)\)/.exec(ruleValue);
    if (!match || !match[1]) {
        return [];
    }
    return match[1].split(',').map((value) => {
        const trimmedValue = value.trim();
        return parseValue(trimmedValue);
    });
}
function parseFieldReference(ruleValue) {
    if (!ruleValue.startsWith('field(') || !ruleValue.endsWith(')')) {
        return {};
    }
    const fieldPath = extractParenthesesContent(ruleValue);
    if (!fieldPath) {
        return {};
    }
    return { _ref: fieldPath, _isFieldRef: true };
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
    transform(value) {
        if (value == null || value === '') {
            return {};
        }
        try {
            const rules = (0, parse_object_literal_1.default)(value);
            let items = {};
            for (const rule of rules) {
                const [ruleKey, ruleValue] = rule;
                if (ruleValue == null || ruleValue === '') {
                    continue;
                }
                const { operator, value: rawValue } = extractOperatorAndValue(ruleValue);
                const parsedValue = parseValue(rawValue);
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