"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function delimetedStringObject(n, v, d = '.') {
    const parts = n.split(d);
    parts.reverse();
    return parts.reduce((res, it, idx) => {
        // kalau level terakhir langsung isi value
        if (idx === 0)
            return { [it]: res };
        // kalau parent pakai salah satu keyword Prisma relation filter
        if (['is', 'some', 'every', 'none'].includes(it)) {
            return { [it]: res };
        }
        return { [it]: res };
    }, v);
}
exports.default = delimetedStringObject;
//# sourceMappingURL=delimeted-string-object.js.map