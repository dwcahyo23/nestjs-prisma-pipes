"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function delimetedStringObject(n, v, d) {
    n = n.split(d || '.');
    n.reverse();
    return n.reduce(function (res, it, c) {
        var _a, _b;
        if (c === 0)
            return _a = {}, _a[it] = res, _a;
        return _b = {}, _b[it] = { is: res }, _b;
    }, v);
}
exports.default = delimetedStringObject;
