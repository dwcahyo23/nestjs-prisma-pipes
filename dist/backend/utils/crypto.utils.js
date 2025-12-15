"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePipeQuery = encodePipeQuery;
exports.decodePipeQuery = decodePipeQuery;
exports.isSecureQuery = isSecureQuery;
exports.buildSecureUrl = buildSecureUrl;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const security_config_1 = require("../config/security.config");
function generateSignature(data, secretKey) {
    return (0, crypto_1.createHmac)('sha256', secretKey)
        .update(data)
        .digest('base64url');
}
function verifySignature(data, signature, secretKey) {
    const expectedSignature = generateSignature(data, secretKey);
    return signature === expectedSignature;
}
function encodePipeQuery(query) {
    const config = (0, security_config_1.getPipesSecurityConfig)();
    if (!config.enabled) {
        return query;
    }
    const encodedData = Buffer.from(query, 'utf-8').toString('base64url');
    const payload = {
        data: encodedData,
        signature: generateSignature(encodedData, config.secretKey),
        timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}
function decodePipeQuery(encodedQuery, clientIp) {
    const config = (0, security_config_1.getPipesSecurityConfig)();
    if (!config.enabled) {
        return encodedQuery;
    }
    if (config.whitelistedIPs && config.whitelistedIPs.length > 0 && clientIp) {
        const normalizedIp = clientIp === '::1' ? '127.0.0.1' : clientIp;
        const isWhitelisted = config.whitelistedIPs.some(ip => ip === normalizedIp || ip === clientIp);
        if (isWhitelisted && !isSecureQuery(encodedQuery)) {
            console.log(`✅ Plaintext allowed for whitelisted IP: ${clientIp}`);
            return encodedQuery;
        }
    }
    try {
        const payloadJson = Buffer.from(encodedQuery, 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        if (!payload.data || !payload.signature || !payload.timestamp) {
            throw new Error('Invalid payload structure');
        }
        if (!verifySignature(payload.data, payload.signature, config.secretKey)) {
            throw new common_1.BadRequestException('Invalid query signature - tampering detected');
        }
        const maxAge = config.maxAge || 3600000;
        const age = Date.now() - payload.timestamp;
        if (age > maxAge) {
            throw new common_1.BadRequestException(`Query expired (age: ${Math.round(age / 1000)}s)`);
        }
        if (age < 0) {
            throw new common_1.BadRequestException('Query timestamp is in the future');
        }
        return Buffer.from(payload.data, 'base64url').toString('utf-8');
    }
    catch (error) {
        if (config.allowPlaintext && !isSecureQuery(encodedQuery)) {
            console.log('⚠️  Using plaintext query (development mode)');
            return encodedQuery;
        }
        if (error instanceof common_1.BadRequestException) {
            throw error;
        }
        throw new common_1.BadRequestException('Invalid secure query format');
    }
}
function isSecureQuery(query) {
    try {
        const decoded = Buffer.from(query, 'base64url').toString('utf-8');
        const payload = JSON.parse(decoded);
        return 'data' in payload && 'signature' in payload && 'timestamp' in payload;
    }
    catch {
        return false;
    }
}
function buildSecureUrl(baseUrl, params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            searchParams.append(key, encodePipeQuery(value));
        }
    }
    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
//# sourceMappingURL=crypto.utils.js.map