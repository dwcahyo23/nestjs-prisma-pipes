"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var parse_object_literal_1 = __importDefault(require("../helpers/parse-object-literal"));
var delimeted_string_object_1 = __importDefault(require("../helpers/delimeted-string-object"));
/**
 * @description Parse a string to an integer
 * @param {string} ruleValue - The string to be parsed
 * @returns {number} The parsed integer
 */
var parseStringToInt = function (ruleValue) {
    if (!ruleValue.endsWith(')')) {
        return 0;
    }
    if (!ruleValue.startsWith('int(')) {
        return 0;
    }
    var arr = /\(([^)]+)\)/.exec(ruleValue);
    if (!arr || !arr[1]) {
        return 0;
    }
    return parseInt(arr[1], 10);
};
/**
 * @description Parse a string to a date
 * @param {string} ruleValue - The string to be parsed
 * @returns {string} The parsed date in ISO format
 */
var parseStringToDate = function (ruleValue) {
    if (!ruleValue.endsWith(')')) {
        return '';
    }
    if (!ruleValue.startsWith('date(') && !ruleValue.startsWith('datetime(')) {
        return '';
    }
    var arr = /\(([^)]+)\)/.exec(ruleValue);
    if (!arr || !arr[1]) {
        return '';
    }
    return new Date(arr[1]).toISOString();
};
/**
 * @description Parse a string to a float
 * @param {string} ruleValue - The string to be parsed
 * @returns {number} The parsed float
 */
var parseStringToFloat = function (ruleValue) {
    if (!ruleValue.endsWith(')')) {
        return 0;
    }
    if (!ruleValue.startsWith('float(')) {
        return 0;
    }
    var arr = /\(([^)]+)\)/.exec(ruleValue);
    if (!arr || !arr[1]) {
        return 0;
    }
    return parseFloat(arr[1]);
};
/**
 * @description Parse a string to a string
 * @param {string} ruleValue - The string to be parsed
 * @returns {string} The parsed string
 */
var parseStringToString = function (ruleValue) {
    if (!ruleValue.endsWith(')')) {
        return '';
    }
    if (!ruleValue.startsWith('string(')) {
        return '';
    }
    var arr = /\(([^)]+)\)/.exec(ruleValue);
    if (!arr || !arr[1]) {
        return '';
    }
    return arr[1];
};
/**
 * @description Parse a string to a boolean
 * @param {string} ruleValue - The string to be parsed
 * @returns {boolean} The parsed boolean
 */
var parseStringToBoolean = function (ruleValue) {
    if (!ruleValue.endsWith(')')) {
        return false;
    }
    if (!ruleValue.startsWith('boolean(') && !ruleValue.startsWith('bool(')) {
        return false;
    }
    var arr = /\(([^)]+)\)/.exec(ruleValue);
    if (!arr || !arr[1]) {
        return false;
    }
    return arr[1] === 'true';
};
/**
 * @description Parse a string to a value
 * @param {string} ruleValue - The string to be parsed
 * @returns {string | number | boolean | object} The parsed value
 */
var parseValue = function (ruleValue) {
    if (ruleValue.startsWith('array(')) {
        var validRegExec = /\(([^]+)\)/.exec(ruleValue);
        if (validRegExec) {
            return validRegExec[1]
                .split(',')
                .map(function (value) {
                switch (true) {
                    case value.startsWith('int('):
                        return parseStringToInt(value);
                    case value.startsWith('date(') || value.startsWith('datetime('):
                        return parseStringToDate(value);
                    case value.startsWith('float('):
                        return parseStringToFloat(value);
                    case value.startsWith('string('):
                        return parseStringToString(value);
                    case value.startsWith('boolean(') || value.startsWith('bool('):
                        return parseStringToBoolean(value);
                    default:
                        return value;
                }
            });
        }
    }
    switch (true) {
        case ruleValue.startsWith('int('):
            return parseStringToInt(ruleValue);
        case ruleValue.startsWith('date(') || ruleValue.startsWith('datetime('):
            return parseStringToDate(ruleValue);
        case ruleValue.startsWith('float('):
            return parseStringToFloat(ruleValue);
        case ruleValue.startsWith('string('):
            return parseStringToString(ruleValue);
        case ruleValue.startsWith('boolean(') || ruleValue.startsWith('bool('):
            return parseStringToBoolean(ruleValue);
        default:
            return ruleValue;
    }
};
/**
 * @description Convert a string like
 * @example "id: int(1), firstName: banana" to { id: 1, firstName: "banana" }
 * */
var WherePipe = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WherePipe = _classThis = /** @class */ (function () {
        function WherePipe_1() {
        }
        WherePipe_1.prototype.transform = function (value) {
            if (value == null)
                return undefined;
            try {
                var rules = (0, parse_object_literal_1.default)(value);
                var items_1 = {};
                rules.forEach(function (rule) {
                    var ruleKey = rule[0];
                    var ruleValue = parseValue(rule[1]);
                    console.log({ value: value, ruleKey: ruleKey, ruleValue: ruleValue });
                    var data = {};
                    [
                        'lt',
                        'lte',
                        'gt',
                        'gte',
                        'equals',
                        'not',
                        'contains',
                        'startsWith',
                        'endsWith',
                        'every',
                        'some',
                        'none',
                        'in',
                        'has',
                        'hasEvery',
                        'hasSome',
                    ].forEach(function (val) {
                        if (rule[1].startsWith("".concat(val, " ")) && typeof ruleValue === 'string') {
                            data[val] = parseValue(ruleValue.replace("".concat(val, " "), ''));
                            items_1[ruleKey] = data;
                        }
                    });
                    if (ruleKey.indexOf('.') !== -1) {
                        var delimeted = (0, delimeted_string_object_1.default)(ruleKey, data);
                        return items_1 = __assign({}, delimeted);
                    }
                    if (ruleValue != null && ruleValue !== '') {
                        return items_1[ruleKey] = items_1[ruleKey] || ruleValue;
                    }
                });
                return items_1;
            }
            catch (error) {
                console.error('Error parsing query string:', error);
                throw new common_1.BadRequestException('Invalid query format');
            }
        };
        return WherePipe_1;
    }());
    __setFunctionName(_classThis, "WherePipe");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WherePipe = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WherePipe = _classThis;
}();
exports.default = WherePipe;
