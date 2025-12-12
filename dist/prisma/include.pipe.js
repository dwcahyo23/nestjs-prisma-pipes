"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncludePipe = void 0;
const common_1 = require("@nestjs/common");
let IncludePipe = class IncludePipe {
    transform(value) {
        if (!value)
            return undefined;
        const strValue = value.trim().replace(/\s+/g, '');
        if (!strValue)
            return undefined;
        const parts = this.splitTopLevel(strValue, ',');
        const include = {};
        for (const part of parts) {
            this.parseIncludePart(include, part);
        }
        return include;
    }
    parseIncludePart(obj, part) {
        const selectMatch = part.match(/^(.*?)\.select:\((.*)\)$/);
        if (selectMatch) {
            const pathPart = selectMatch[1];
            const fieldsStr = selectMatch[2];
            const pathKeys = pathPart.split('.').filter(Boolean);
            const fields = this.parseFields(fieldsStr);
            this.assignNestedInclude(obj, pathKeys, { select: fields });
        }
        else {
            const pathKeys = part.split('.').filter(Boolean);
            this.assignNestedInclude(obj, pathKeys, true);
        }
    }
    parseFields(fieldsStr) {
        const fields = {};
        const parts = this.splitTopLevel(fieldsStr, ',');
        for (const part of parts) {
            // cek nested select di field
            const nestedSelectMatch = part.match(/^(.*?)\.select:\((.*)\)$/);
            if (nestedSelectMatch) {
                const key = nestedSelectMatch[1];
                const nestedFields = this.parseFields(nestedSelectMatch[2]);
                fields[key] = { select: nestedFields };
            }
            else {
                fields[part] = true;
            }
        }
        return fields;
    }
    assignNestedInclude(obj, keys, value) {
        const [first, ...rest] = keys;
        if (!obj[first])
            obj[first] = {};
        if (rest.length === 0) {
            obj[first] = value;
        }
        else {
            if (obj[first] === true)
                obj[first] = {};
            if (!obj[first].include)
                obj[first].include = {};
            this.assignNestedInclude(obj[first].include, rest, value);
        }
    }
    splitTopLevel(str, delimiter) {
        let depth = 0;
        const result = [];
        let current = '';
        for (const char of str) {
            if (char === '(')
                depth++;
            if (char === ')')
                depth--;
            if (char === delimiter && depth === 0) {
                result.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        if (current)
            result.push(current);
        return result;
    }
};
exports.IncludePipe = IncludePipe;
exports.IncludePipe = IncludePipe = __decorate([
    (0, common_1.Injectable)()
], IncludePipe);
//# sourceMappingURL=include.pipe.js.map