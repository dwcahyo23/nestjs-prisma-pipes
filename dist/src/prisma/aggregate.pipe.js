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
exports.manualAggregateWithRelationships = manualAggregateWithRelationships;
exports.manualAggregateForTimeSeries = manualAggregateForTimeSeries;
const common_1 = require("@nestjs/common");
const parse_object_literal_1 = __importDefault(require("../helpers/parse-object-literal"));
const AGGREGATE_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count'];
function parseAggregateFunction(value) {
    if (!value || typeof value !== 'string')
        return null;
    const match = /^(sum|avg|min|max|count)(?:\(([^)]*)\))?$/i.exec(value.trim());
    if (!match)
        return null;
    const [, func, paramsStr] = match;
    const params = paramsStr
        ? paramsStr.split(',').map(p => p.trim()).filter(Boolean)
        : [];
    return {
        function: func.toLowerCase(),
        params,
    };
}
function parseGroupBy(value) {
    if (!value || typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
        return null;
    }
    const fields = trimmed.slice(1, -1);
    if (!fields.trim())
        return null;
    return fields.split(',').map(f => f.trim()).filter(Boolean);
}
function hasRelationshipInGroupBy(groupBy) {
    return groupBy.some(field => field.includes('.'));
}
function parseChartConfig(value) {
    if (!value || typeof value !== 'string')
        return null;
    const chartTypes = ['bar', 'line', 'pie', 'area', 'donut'];
    if (chartTypes.includes(value.toLowerCase())) {
        return { type: value.toLowerCase() };
    }
    const match = /^(bar|line|pie|area|donut)\(([^,)]+)(?:,\s*([^):]+)(?::(\d+))?)?\)$/i.exec(value.trim());
    if (!match)
        return null;
    const [, type, firstParam, intervalPart, yearPart] = match;
    const chartType = type.toLowerCase();
    const timeIntervals = ['day', 'month', 'year'];
    const interval = intervalPart?.toLowerCase().trim();
    const year = yearPart ? parseInt(yearPart, 10) : undefined;
    if (interval && timeIntervals.includes(interval)) {
        return {
            type: chartType,
            dateField: firstParam.trim(),
            interval: interval,
            year,
        };
    }
    const options = { type: chartType, groupField: firstParam.trim() };
    if (intervalPart) {
        const option = intervalPart.toLowerCase().trim();
        if (option === 'stacked') {
            options.stacked = true;
        }
        else if (option === 'horizontal') {
            options.horizontal = true;
        }
    }
    return options;
}
function generateTimeSeriesLabels(interval, year) {
    const currentYear = year || new Date().getFullYear();
    const labels = [];
    switch (interval) {
        case 'day':
            for (let m = 0; m < 12; m++) {
                const daysInMonth = new Date(Date.UTC(currentYear, m + 1, 0)).getUTCDate();
                for (let d = 1; d <= daysInMonth; d++) {
                    const month = String(m + 1).padStart(2, '0');
                    const day = String(d).padStart(2, '0');
                    labels.push(`${currentYear}-${month}-${day}`);
                }
            }
            break;
        case 'month':
            for (let i = 0; i < 12; i++) {
                const date = new Date(Date.UTC(currentYear, i, 1));
                labels.push(date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }));
            }
            break;
        case 'year':
            for (let i = 4; i >= 0; i--) {
                labels.push((currentYear - i).toString());
            }
            break;
    }
    return labels;
}
function getTimeKey(date, interval) {
    const d = date instanceof Date ? date : new Date(date);
    switch (interval) {
        case 'day': {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        case 'month': {
            const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
            return normalized.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
        }
        case 'year':
            return d.getUTCFullYear().toString();
    }
}
function getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
        if (value == null)
            return null;
        value = value[key];
    }
    return value;
}
async function manualAggregateWithRelationships(prismaModel, aggregates, groupBy, where) {
    const scalarSelect = buildSelectForFields(groupBy, aggregates);
    const relationInclude = buildIncludeForRelationships(groupBy, aggregates);
    const queryOptions = { where };
    if (Object.keys(scalarSelect).length > 0) {
        queryOptions.select = { ...scalarSelect };
    }
    if (Object.keys(relationInclude).length > 0) {
        if (queryOptions.select) {
            Object.keys(relationInclude).forEach(key => {
                queryOptions.select[key] = relationInclude[key];
            });
        }
        else {
            queryOptions.include = relationInclude;
        }
    }
    const allData = await prismaModel.findMany(queryOptions);
    const groups = new Map();
    for (const item of allData) {
        const groupKey = groupBy.map(field => {
            const value = getNestedValue(item, field);
            return String(value ?? 'null');
        }).join('|||');
        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey).push(item);
    }
    const results = [];
    for (const [groupKey, items] of groups.entries()) {
        const result = {};
        const groupKeyParts = groupKey.split('|||');
        groupBy.forEach((field, idx) => {
            const { relation, field: fieldName } = field.includes('.')
                ? parseRelationshipPath(field)
                : { relation: '', field };
            if (relation) {
                if (!result[relation]) {
                    result[relation] = {};
                }
                result[relation][fieldName] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
            }
            else {
                result[field] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
            }
        });
        for (const agg of aggregates) {
            const { function: func, field } = agg;
            const funcKey = `_${func}`;
            if (func === 'count') {
                result._count = result._count || {};
                result._count[field] = items.length;
            }
            else {
                result[funcKey] = result[funcKey] || {};
                const values = items
                    .map(item => getNestedValue(item, field))
                    .filter(v => v != null && typeof v === 'number');
                switch (func) {
                    case 'sum':
                        result[funcKey][field] = values.reduce((acc, v) => acc + v, 0);
                        break;
                    case 'avg':
                        result[funcKey][field] = values.length > 0
                            ? values.reduce((acc, v) => acc + v, 0) / values.length
                            : 0;
                        break;
                    case 'min':
                        result[funcKey][field] = values.length > 0 ? Math.min(...values) : 0;
                        break;
                    case 'max':
                        result[funcKey][field] = values.length > 0 ? Math.max(...values) : 0;
                        break;
                }
            }
        }
        results.push(result);
    }
    return results;
}
function detectDateFieldType(value) {
    if (!value)
        return 'unknown';
    const str = String(value).trim();
    const dateTest = new Date(str);
    if (!isNaN(dateTest.getTime()) && str.includes('-')) {
        return 'date';
    }
    if (/^\d{4}$/.test(str)) {
        return 'year';
    }
    if (/^(0?[1-9]|1[0-2])$/.test(str) ||
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(str)) {
        return 'month';
    }
    if (/^(0?[1-9]|[12]\d|3[01])$/.test(str)) {
        return 'day';
    }
    return 'unknown';
}
function extractYearRangeFromData(dataArray, dateField, interval) {
    if (!dataArray || dataArray.length === 0)
        return null;
    const years = [];
    for (const item of dataArray) {
        const value = getNestedValue(item, dateField);
        if (!value)
            continue;
        const str = String(value).trim();
        let year = null;
        if (/^\d{4}$/.test(str)) {
            year = parseInt(str, 10);
        }
        else {
            try {
                const date = new Date(str);
                if (!isNaN(date.getTime())) {
                    year = date.getUTCFullYear();
                }
            }
            catch { }
        }
        if (year && year >= 1900 && year <= 2100) {
            years.push(year);
        }
    }
    if (years.length === 0)
        return null;
    return {
        minYear: Math.min(...years),
        maxYear: Math.max(...years)
    };
}
function generateTimeSeriesLabelsEnhanced(interval, yearRange, specifiedYear) {
    const labels = [];
    const currentYear = new Date().getFullYear();
    switch (interval) {
        case 'day': {
            const year = specifiedYear || yearRange?.minYear || currentYear;
            for (let m = 0; m < 12; m++) {
                const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
                for (let d = 1; d <= daysInMonth; d++) {
                    const month = String(m + 1).padStart(2, '0');
                    const day = String(d).padStart(2, '0');
                    labels.push(`${year}-${month}-${day}`);
                }
            }
            break;
        }
        case 'month': {
            const year = specifiedYear || yearRange?.minYear || currentYear;
            for (let i = 0; i < 12; i++) {
                const date = new Date(Date.UTC(year, i, 1));
                labels.push(date.toLocaleString('en-US', {
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC'
                }));
            }
            break;
        }
        case 'year': {
            if (specifiedYear) {
                for (let i = 4; i >= 0; i--) {
                    labels.push((specifiedYear - i).toString());
                }
            }
            else if (yearRange) {
                for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) {
                    labels.push(y.toString());
                }
            }
            else {
                for (let i = 4; i >= 0; i--) {
                    labels.push((currentYear - i).toString());
                }
            }
            break;
        }
    }
    return labels;
}
function parseStringToTimeKey(value, interval, contextYear, contextMonth) {
    if (!value)
        return null;
    const str = String(value).trim();
    const currentYear = contextYear || new Date().getFullYear();
    switch (interval) {
        case 'year': {
            if (/^\d{4}$/.test(str)) {
                return str;
            }
            const date = new Date(str);
            if (!isNaN(date.getTime())) {
                return date.getUTCFullYear().toString();
            }
            return null;
        }
        case 'month': {
            let month = null;
            if (/^\d{1,2}$/.test(str)) {
                month = parseInt(str, 10);
            }
            else {
                const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                const monthIndex = monthNames.findIndex(m => str.toLowerCase().startsWith(m));
                if (monthIndex >= 0) {
                    month = monthIndex + 1;
                }
            }
            if (month === null) {
                const date = new Date(str);
                if (!isNaN(date.getTime())) {
                    month = date.getUTCMonth() + 1;
                }
            }
            if (month !== null && month >= 1 && month <= 12) {
                const date = new Date(Date.UTC(currentYear, month - 1, 1));
                return date.toLocaleString('en-US', {
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC'
                });
            }
            return null;
        }
        case 'day': {
            const date = new Date(str);
            if (!isNaN(date.getTime())) {
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            if (/^\d{1,2}$/.test(str)) {
                const day = parseInt(str, 10);
                if (day >= 1 && day <= 31 && contextMonth) {
                    const monthStr = String(contextMonth).padStart(2, '0');
                    const dayStr = String(day).padStart(2, '0');
                    return `${currentYear}-${monthStr}-${dayStr}`;
                }
            }
            return null;
        }
    }
}
function getTimeKeyEnhanced(value, interval, contextYear, contextMonth) {
    if (value instanceof Date) {
        return getTimeKey(value, interval);
    }
    const result = parseStringToTimeKey(value, interval, contextYear, contextMonth);
    if (result)
        return result;
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return getTimeKey(date, interval);
        }
    }
    catch { }
    return String(value ?? 'null');
}
function transformToChartSeries(data, aggregates, chartConfig, groupBy) {
    const dataArray = Array.isArray(data) ? data : [];
    if (!dataArray || dataArray.length === 0) {
        const series = aggregates.map(agg => ({
            name: `${agg.function}(${agg.field})`,
            data: [0],
        }));
        return {
            categories: ['Total'],
            series,
            chartType: chartConfig?.type,
            stacked: chartConfig?.stacked,
            horizontal: chartConfig?.horizontal,
            raw: [],
        };
    }
    if (chartConfig?.dateField && chartConfig?.interval) {
        const nonDateGroupFields = groupBy?.filter(field => field !== chartConfig.dateField) || [];
        const hasGrouping = nonDateGroupFields.length > 0;
        const yearRange = extractYearRangeFromData(dataArray, chartConfig.dateField, chartConfig.interval);
        const timeLabels = generateTimeSeriesLabelsEnhanced(chartConfig.interval, yearRange || undefined, chartConfig.year);
        if (hasGrouping) {
            const groupField = chartConfig.groupField || nonDateGroupFields[0];
            const groupedDataMap = new Map();
            dataArray.forEach(item => {
                const dateValue = getNestedValue(item, chartConfig.dateField);
                const groupValue = String(getNestedValue(item, groupField) ?? 'null');
                if (dateValue) {
                    const timeKey = getTimeKeyEnhanced(dateValue, chartConfig.interval, chartConfig.year || yearRange?.minYear);
                    if (!groupedDataMap.has(groupValue)) {
                        groupedDataMap.set(groupValue, new Map());
                    }
                    const timeMap = groupedDataMap.get(groupValue);
                    if (!timeMap.has(timeKey)) {
                        timeMap.set(timeKey, []);
                    }
                    timeMap.get(timeKey).push(item);
                }
            });
            const series = [];
            groupedDataMap.forEach((timeMap, groupValue) => {
                aggregates.forEach((agg) => {
                    const { function: func, field } = agg;
                    const seriesName = `${groupValue} - ${func}(${field})`;
                    const seriesData = timeLabels.map(label => {
                        const items = timeMap.get(label);
                        if (!items || items.length === 0)
                            return 0;
                        if (func === 'count') {
                            return items.reduce((acc, it) => {
                                const val = typeof it._count === 'number'
                                    ? it._count
                                    : (it._count?.[field] || it._count || 0);
                                return acc + (typeof val === 'number' ? val : 0);
                            }, 0);
                        }
                        return items.reduce((acc, it) => {
                            const val = it[`_${func}`]?.[field] || 0;
                            return acc + (typeof val === 'number' ? val : 0);
                        }, 0);
                    });
                    series.push({ name: seriesName, data: seriesData });
                });
            });
            return {
                categories: timeLabels,
                series,
                chartType: chartConfig.type,
                stacked: chartConfig.stacked,
                horizontal: chartConfig.horizontal,
                raw: dataArray,
            };
        }
        const dataMap = new Map();
        dataArray.forEach(item => {
            const dateValue = getNestedValue(item, chartConfig.dateField);
            if (dateValue) {
                const key = getTimeKeyEnhanced(dateValue, chartConfig.interval, yearRange?.minYear);
                if (!dataMap.has(key)) {
                    dataMap.set(key, []);
                }
                dataMap.get(key).push(item);
            }
        });
        const series = aggregates.map((agg) => {
            const { function: func, field } = agg;
            const seriesName = `${func}(${field})`;
            const seriesData = timeLabels.map(label => {
                const items = dataMap.get(label);
                if (!items || items.length === 0)
                    return 0;
                if (func === 'count') {
                    return items.reduce((acc, it) => {
                        const val = typeof it._count === 'number'
                            ? it._count
                            : (it._count?.[field] || it._count || 0);
                        return acc + (typeof val === 'number' ? val : 0);
                    }, 0);
                }
                return items.reduce((acc, it) => {
                    const val = it[`_${func}`]?.[field] || 0;
                    return acc + (typeof val === 'number' ? val : 0);
                }, 0);
            });
            return { name: seriesName, data: seriesData };
        });
        return {
            categories: timeLabels,
            series,
            chartType: chartConfig.type,
            stacked: chartConfig.stacked,
            horizontal: chartConfig.horizontal,
            raw: dataArray,
        };
    }
    if (groupBy && groupBy.length > 0) {
        const categoryField = chartConfig?.groupField || groupBy[0];
        const categories = dataArray.map(item => {
            const val = getNestedValue(item, categoryField);
            if (val instanceof Date) {
                return getTimeKey(val, 'day');
            }
            return String(val ?? 'null');
        });
        const series = aggregates.map((agg) => {
            const { function: func, field } = agg;
            const seriesName = `${func}(${field})`;
            const seriesData = dataArray.map(item => {
                if (func === 'count') {
                    return typeof item._count === 'number' ? item._count : (item._count?.[field] || item._count || 0);
                }
                return item[`_${func}`]?.[field] || 0;
            });
            return { name: seriesName, data: seriesData };
        });
        return {
            categories,
            series,
            chartType: chartConfig?.type,
            stacked: chartConfig?.stacked,
            horizontal: chartConfig?.horizontal,
            raw: dataArray,
        };
    }
    const categories = dataArray.map((_, idx) => `Category ${idx + 1}`);
    const series = aggregates.map((agg) => {
        const { function: func, field } = agg;
        const seriesName = `${func}(${field})`;
        const seriesData = dataArray.map(item => {
            if (func === 'count') {
                return typeof item._count === 'number' ? item._count : (item._count?.[field] || item._count || 0);
            }
            return item[`_${func}`]?.[field] || 0;
        });
        return { name: seriesName, data: seriesData };
    });
    return {
        categories,
        series,
        chartType: chartConfig?.type,
        stacked: chartConfig?.stacked,
        horizontal: chartConfig?.horizontal,
        raw: dataArray,
    };
}
async function manualAggregateForTimeSeries(prismaModel, aggregates, groupBy, dateField, interval, year, where) {
    const scalarSelect = buildSelectForFields([...groupBy, dateField], aggregates);
    const relationInclude = buildIncludeForRelationships([...groupBy, dateField], aggregates);
    const queryOptions = { where };
    if (Object.keys(scalarSelect).length > 0) {
        queryOptions.select = { ...scalarSelect };
    }
    if (Object.keys(relationInclude).length > 0) {
        if (queryOptions.select) {
            Object.keys(relationInclude).forEach(key => {
                queryOptions.select[key] = relationInclude[key];
            });
        }
        else {
            queryOptions.include = relationInclude;
        }
    }
    const allData = await prismaModel.findMany(queryOptions);
    let filteredData = allData;
    if (year) {
        filteredData = allData.filter((item) => {
            const dateValue = getNestedValue(item, dateField);
            if (!dateValue)
                return false;
            try {
                const str = String(dateValue).trim();
                if (/^[A-Za-z]{3}\s\d{4}$/.test(str)) {
                    const yearMatch = str.match(/\d{4}$/);
                    return yearMatch ? parseInt(yearMatch[0], 10) === year : false;
                }
                if (/^\d{4}$/.test(str)) {
                    return parseInt(str, 10) === year;
                }
                const date = new Date(dateValue);
                if (isNaN(date.getTime()))
                    return false;
                return date.getUTCFullYear() === year;
            }
            catch {
                return false;
            }
        });
    }
    const yearRange = year
        ? { minYear: year, maxYear: year }
        : extractYearRangeFromData(filteredData, dateField, interval);
    const groups = new Map();
    for (const item of filteredData) {
        const dateValue = getNestedValue(item, dateField);
        if (!dateValue)
            continue;
        const timeKey = getTimeKeyEnhanced(dateValue, interval, yearRange?.minYear);
        const groupKey = groupBy.length > 0
            ? groupBy.map(field => {
                const value = getNestedValue(item, field);
                return String(value ?? 'null');
            }).join('|||')
            : 'default';
        const compositeKey = `${groupKey}|||${timeKey}`;
        if (!groups.has(compositeKey)) {
            groups.set(compositeKey, []);
        }
        groups.get(compositeKey).push(item);
    }
    const results = [];
    for (const [compositeKey, items] of groups.entries()) {
        const result = {};
        const parts = compositeKey.split('|||');
        const timeKey = parts.pop();
        const groupKeyParts = parts.join('|||').split('|||');
        if (groupBy.length > 0) {
            groupBy.forEach((field, idx) => {
                const { relation, field: fieldName } = field.includes('.')
                    ? parseRelationshipPath(field)
                    : { relation: '', field };
                if (relation) {
                    if (!result[relation]) {
                        result[relation] = {};
                    }
                    result[relation][fieldName] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
                }
                else {
                    result[field] = groupKeyParts[idx] !== 'null' ? groupKeyParts[idx] : null;
                }
            });
        }
        result[dateField] = timeKey;
        for (const agg of aggregates) {
            const { function: func, field } = agg;
            const funcKey = `_${func}`;
            if (func === 'count') {
                result._count = result._count || {};
                result._count[field] = items.length;
            }
            else {
                result[funcKey] = result[funcKey] || {};
                const values = items
                    .map(item => getNestedValue(item, field))
                    .filter(v => v != null && typeof v === 'number');
                switch (func) {
                    case 'sum':
                        result[funcKey][field] = values.reduce((acc, v) => acc + v, 0);
                        break;
                    case 'avg':
                        result[funcKey][field] = values.length > 0
                            ? values.reduce((acc, v) => acc + v, 0) / values.length
                            : 0;
                        break;
                    case 'min':
                        result[funcKey][field] = values.length > 0 ? Math.min(...values) : 0;
                        break;
                    case 'max':
                        result[funcKey][field] = values.length > 0 ? Math.max(...values) : 0;
                        break;
                }
            }
        }
        results.push(result);
    }
    return results;
}
function parseRelationshipPath(path) {
    const parts = path.split('.');
    const field = parts.pop();
    const relation = parts.join('.');
    return { relation, field };
}
function buildSelectForFields(allFields, aggregates) {
    const select = {};
    for (const field of allFields) {
        if (!field.includes('.')) {
            select[field] = true;
        }
    }
    for (const agg of aggregates) {
        if (!agg.field.includes('.')) {
            select[agg.field] = true;
        }
    }
    return select;
}
function buildIncludeForRelationships(allFields, aggregates) {
    const include = {};
    const relationPaths = [
        ...allFields.filter(f => f.includes('.')),
        ...aggregates.filter(agg => agg.field.includes('.')).map(agg => agg.field)
    ];
    for (const path of relationPaths) {
        const { relation, field } = parseRelationshipPath(path);
        const parts = relation.split('.');
        let current = include;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                if (!current[part]) {
                    current[part] = { select: {} };
                }
                if (typeof current[part] === 'object' && 'select' in current[part]) {
                    current[part].select[field] = true;
                }
            }
            else {
                if (!current[part]) {
                    current[part] = { include: {} };
                }
                if (typeof current[part] === 'object' && 'include' in current[part]) {
                    current = current[part].include;
                }
            }
        }
    }
    return include;
}
let AggregatePipe = class AggregatePipe {
    transform(value) {
        if (!value || value.trim() === '')
            return undefined;
        try {
            const parsed = (0, parse_object_literal_1.default)(value);
            if (!parsed || parsed.length === 0) {
                throw new common_1.BadRequestException('Invalid aggregate query format');
            }
            const aggregates = [];
            let chartConfig;
            let groupByFields = [];
            for (const [key, val] of parsed) {
                if (key.toLowerCase() === 'chart' && val) {
                    const config = parseChartConfig(val);
                    if (config) {
                        chartConfig = config;
                        continue;
                    }
                }
                if (key.toLowerCase() === 'groupby') {
                    if (val) {
                        const fields = parseGroupBy(val);
                        if (fields && fields.length > 0) {
                            groupByFields = fields;
                            continue;
                        }
                        else {
                            throw new common_1.BadRequestException('Invalid groupBy format. Use: groupBy: (field) or groupBy: (field1, field2)');
                        }
                    }
                    else {
                        throw new common_1.BadRequestException('groupBy requires fields. Use: groupBy: (field) or groupBy: (field1, field2)');
                    }
                }
                if (val) {
                    const aggFunc = parseAggregateFunction(val);
                    if (aggFunc) {
                        aggregates.push({
                            field: key,
                            function: aggFunc.function,
                            params: aggFunc.params,
                        });
                    }
                }
            }
            if (aggregates.length === 0) {
                throw new common_1.BadRequestException('At least one aggregate function is required');
            }
            const isTimeSeriesChart = !!(chartConfig?.dateField && chartConfig?.interval);
            if (isTimeSeriesChart) {
                const finalGroupBy = groupByFields.filter(f => f !== chartConfig.dateField);
                return {
                    prismaQuery: null,
                    aggregates,
                    groupBy: finalGroupBy,
                    isGrouped: true,
                    chartConfig,
                    useManualAggregation: true,
                    isTimeSeries: true,
                };
            }
            let finalGroupBy = [];
            if (groupByFields.length > 0) {
                finalGroupBy = groupByFields;
            }
            else if (chartConfig?.groupField) {
                finalGroupBy = [chartConfig.groupField];
            }
            const isGrouped = finalGroupBy.length > 0;
            const hasRelationship = isGrouped && finalGroupBy.some(f => f.includes('.'));
            if (isGrouped) {
                if (hasRelationship) {
                    return {
                        prismaQuery: null,
                        aggregates,
                        groupBy: finalGroupBy,
                        isGrouped: true,
                        chartConfig,
                        useManualAggregation: true,
                        isTimeSeries: false,
                    };
                }
                const prismaQuery = buildPrismaAggregate(aggregates);
                return {
                    prismaQuery: {
                        by: finalGroupBy,
                        ...prismaQuery,
                    },
                    aggregates,
                    groupBy: finalGroupBy,
                    isGrouped: true,
                    chartConfig,
                    useManualAggregation: false,
                    isTimeSeries: false,
                };
            }
            const prismaQuery = buildPrismaAggregate(aggregates);
            return {
                prismaQuery,
                aggregates,
                groupBy: [],
                isGrouped: false,
                chartConfig,
                useManualAggregation: false,
                isTimeSeries: false,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            console.error('Error parsing aggregate query:', error);
            throw new common_1.BadRequestException('Invalid aggregate query format');
        }
    }
    static async execute(prismaModel, aggregateConfig, where) {
        if (aggregateConfig.isTimeSeries && aggregateConfig.chartConfig?.dateField) {
            const result = await manualAggregateForTimeSeries(prismaModel, aggregateConfig.aggregates, aggregateConfig.groupBy, aggregateConfig.chartConfig.dateField, aggregateConfig.chartConfig.interval, aggregateConfig.chartConfig.year, where);
            return result;
        }
        if (aggregateConfig.useManualAggregation) {
            return manualAggregateWithRelationships(prismaModel, aggregateConfig.aggregates, aggregateConfig.groupBy, where);
        }
        if (aggregateConfig.isGrouped) {
            return prismaModel.groupBy({
                ...aggregateConfig.prismaQuery,
                where,
            });
        }
        return prismaModel.aggregate({
            ...aggregateConfig.prismaQuery,
            where,
        });
    }
    static toChartSeries(data, aggregateConfig) {
        if (!aggregateConfig.isGrouped) {
            if (!data || (Array.isArray(data) && data.length === 0)) {
                const series = aggregateConfig.aggregates.map((agg) => ({
                    name: `${agg.function}(${agg.field})`,
                    data: [0],
                }));
                return {
                    categories: ['Total'],
                    series,
                    chartType: aggregateConfig.chartConfig?.type,
                    stacked: aggregateConfig.chartConfig?.stacked,
                    horizontal: aggregateConfig.chartConfig?.horizontal,
                    raw: [],
                };
            }
            const series = aggregateConfig.aggregates.map((agg) => {
                const { function: func, field } = agg;
                const seriesName = `${func}(${field})`;
                let dataValue = 0;
                if (func === 'count') {
                    if (typeof data._count === 'number') {
                        dataValue = data._count;
                    }
                    else {
                        dataValue = data._count?.[field] || data._count || 0;
                    }
                }
                else {
                    dataValue = data[`_${func}`]?.[field] || 0;
                }
                return { name: seriesName, data: [dataValue] };
            });
            return {
                categories: ['Total'],
                series,
                chartType: aggregateConfig.chartConfig?.type,
                stacked: aggregateConfig.chartConfig?.stacked,
                horizontal: aggregateConfig.chartConfig?.horizontal,
                raw: Array.isArray(data) ? data : [data],
            };
        }
        const dataArray = Array.isArray(data) ? data : [data];
        return transformToChartSeries(dataArray, aggregateConfig.aggregates, aggregateConfig.chartConfig, aggregateConfig.groupBy);
    }
};
AggregatePipe = __decorate([
    (0, common_1.Injectable)()
], AggregatePipe);
exports.default = AggregatePipe;
function buildPrismaAggregate(aggregates) {
    const aggregateObj = {};
    for (const agg of aggregates) {
        const { function: func, field, params } = agg;
        const funcKey = `_${func}`;
        if (func === 'count') {
            if (!params || params.length === 0 || params[0] === '*') {
                aggregateObj._count = true;
            }
            else {
                aggregateObj._count = aggregateObj._count || {};
                aggregateObj._count[field] = true;
            }
        }
        else {
            aggregateObj[funcKey] = aggregateObj[funcKey] || {};
            aggregateObj[funcKey][field] = true;
        }
    }
    return aggregateObj;
}
//# sourceMappingURL=aggregate.pipe.js.map