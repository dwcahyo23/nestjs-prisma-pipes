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
/**
 * Operators supported by the where pipe
 */
const FILTER_OPERATORS = [
    'lt', 'lte', 'gt', 'gte', 'equals', 'not',
    'contains', 'startsWith', 'endsWith',
    'every', 'some', 'none',
    'in', 'has', 'hasEvery', 'hasSome',
];
/**
 * Type parsers registry for better extensibility
 */
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
/**
 * Extract value from parentheses
 */
function extractParenthesesContent(input) {
    const match = /\(([^)]+)\)/.exec(input);
    return match ? match[1] : null;
}
/**
 * Parse a string to an integer
 */
function parseStringToInt(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('int(')) {
        return 0;
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? parseInt(content, 10) : 0;
}
/**
 * Parse a string to a date
 */
function parseStringToDate(ruleValue) {
    const validPrefixes = ['date(', 'datetime('];
    const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));
    if (!ruleValue.endsWith(')') || !hasValidPrefix) {
        return '';
    }
    const content = extractParenthesesContent(ruleValue);
    if (!content)
        return '';
    // ✅ Use TimezoneService to add timezone
    const dateString = timezone_service_1.default.addTimezoneToDateString(content);
    return new Date(dateString).toISOString();
}
/**
 * Parse a string to a float
 */
function parseStringToFloat(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('float(')) {
        return 0;
    }
    const content = extractParenthesesContent(ruleValue);
    return content ? parseFloat(content) : 0;
}
/**
 * Parse a string to a string
 */
function parseStringToString(ruleValue) {
    if (!ruleValue.endsWith(')') || !ruleValue.startsWith('string(')) {
        return '';
    }
    return extractParenthesesContent(ruleValue) || '';
}
/**
 * Parse a string to a boolean
 */
function parseStringToBoolean(ruleValue) {
    const validPrefixes = ['boolean(', 'bool('];
    const hasValidPrefix = validPrefixes.some(prefix => ruleValue.startsWith(prefix));
    if (!ruleValue.endsWith(')') || !hasValidPrefix) {
        return false;
    }
    const content = extractParenthesesContent(ruleValue);
    return content === 'true';
}
/**
 * Parse a string to an array
 */
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
/**
 * Parse field reference for field-to-field comparison
 *
 * @example
 * Simple field: field(recQty) → { _ref: 'recQty', _isFieldRef: true }
 *
 * @example
 * Nested relation field: field(user.balance) → { _ref: 'user.balance', _isFieldRef: true }
 *
 * @example
 * Cross-table comparison (NEW):
 * field($parent.createdAt) → { _ref: '$parent.createdAt', _isFieldRef: true, _scope: 'parent' }
 * field($root.orderDate) → { _ref: '$root.orderDate', _isFieldRef: true, _scope: 'root' }
 */
function parseFieldReference(ruleValue) {
    if (!ruleValue.startsWith('field(') || !ruleValue.endsWith(')')) {
        return {};
    }
    const fieldPath = extractParenthesesContent(ruleValue);
    if (!fieldPath) {
        return {};
    }
    // Check for special scope markers
    let scope;
    let cleanPath = fieldPath;
    if (fieldPath.startsWith('$parent.')) {
        scope = 'parent';
        cleanPath = fieldPath.substring(8); // Remove '$parent.'
    }
    else if (fieldPath.startsWith('$root.')) {
        scope = 'root';
        cleanPath = fieldPath.substring(6); // Remove '$root.'
    }
    // Return a special object that marks this as a field reference
    const result = {
        _ref: cleanPath,
        _isFieldRef: true
    };
    if (scope) {
        result._scope = scope;
    }
    return result;
}
/**
 * Check if a value is a field reference
 */
function isFieldReference(value) {
    return typeof value === 'object' && value !== null && '_isFieldRef' in value && value._isFieldRef === true;
}
/**
 * Convert field reference to a format that can be identified by service layer
 * Returns the field reference object that service layer should convert to prisma.model.fields.fieldName
 */
function convertToFieldReference(fieldRef) {
    // Type guard to ensure we have a field reference object
    if (typeof fieldRef === 'object' && fieldRef !== null && '_ref' in fieldRef && '_isFieldRef' in fieldRef) {
        return fieldRef; // Return the whole object so service can identify it
    }
    // Fallback: return empty object if not a valid field reference
    return {};
}
/**
 * Detect type from string and parse accordingly
 */
function parseValue(ruleValue) {
    // Check for typed values
    for (const [type, parser] of Object.entries(TYPE_PARSERS)) {
        if (ruleValue.startsWith(`${type}(`)) {
            return parser(ruleValue);
        }
    }
    // Return as-is if no type detected
    return ruleValue;
}
/**
 * Extract operator and value from a rule
 */
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
/**
 * @description Convert a string with field-to-field comparison support
 *
 * @example Basic comparison
 * "id: int(1), firstName: banana" → { id: 1, firstName: "banana" }
 *
 * @example Date range
 * "createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)"
 * → { createdAt: { gte: "2024-01-01T00:00:00.000Z", lte: "2024-12-31T00:00:00.000Z" } }
 *
 * @example Same-table field comparison
 * "qty: lte field(recQty)" → { qty: { lte: { _ref: "recQty", _isFieldRef: true } } }
 *
 * @example Cross-table comparison (NEW)
 * "mesin.some.userMesin.some.createdAt: lte field($parent.createdAt)"
 * → {
 *     mesin: {
 *       some: {
 *         userMesin: {
 *           some: {
 *             createdAt: {
 *               lte: { _ref: "createdAt", _isFieldRef: true, _scope: "parent" }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * This enables: userMesin.createdAt <= workorder.createdAt
 */
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
                // Skip empty values
                if (ruleValue == null || ruleValue === '') {
                    continue;
                }
                const { operator, value: rawValue } = extractOperatorAndValue(ruleValue);
                const parsedValue = parseValue(rawValue);
                // Determine the final value based on operator and field reference
                let finalValue;
                if (operator) {
                    // Has operator: wrap in operator object
                    if (isFieldReference(parsedValue)) {
                        finalValue = { [operator]: convertToFieldReference(parsedValue) };
                    }
                    else {
                        finalValue = { [operator]: parsedValue };
                    }
                }
                else {
                    // No operator
                    if (isFieldReference(parsedValue)) {
                        // Field reference without operator: wrap in equals
                        finalValue = { equals: convertToFieldReference(parsedValue) };
                    }
                    else {
                        // Regular value without operator: use as-is
                        finalValue = parsedValue;
                    }
                }
                // Handle nested keys (contains dot notation)
                if (ruleKey.indexOf('.') !== -1) {
                    const delimeted = (0, delimeted_string_object_1.default)(ruleKey, finalValue);
                    items = (0, deep_merge_1.default)(items, delimeted);
                }
                else {
                    // Handle flat keys
                    if (items[ruleKey] && typeof items[ruleKey] === 'object' && typeof finalValue === 'object' && !Array.isArray(finalValue) && !Array.isArray(items[ruleKey])) {
                        // Merge objects (for date ranges, multiple operators on same field)
                        items[ruleKey] = { ...items[ruleKey], ...finalValue };
                    }
                    else {
                        // Simple assignment
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