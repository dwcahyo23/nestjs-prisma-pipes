"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSecureUrl = buildSecureUrl;
exports.createSecureEncoder = createSecureEncoder;
const crypto_client_1 = require("../core/crypto.client");
async function buildSecureUrl(baseUrl, params, secretKey) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            const encoded = await (0, crypto_client_1.encodeClientPipeQuery)(value, secretKey);
            searchParams.append(key, encoded);
        }
    }
    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
function createSecureEncoder(secretKey) {
    return {
        encode: (query) => (0, crypto_client_1.encodeClientPipeQuery)(query, secretKey),
        buildUrl: (baseUrl, params) => buildSecureUrl(baseUrl, params, secretKey),
    };
}
//# sourceMappingURL=url-builder.js.map