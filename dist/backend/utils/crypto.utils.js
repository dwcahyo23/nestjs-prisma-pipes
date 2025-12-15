"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePipeQuery = decodePipeQuery;
exports.encodePipeQuery = encodePipeQuery;
exports.isSecureQuery = isSecureQuery;
exports.buildSecureUrl = buildSecureUrl;
const crypto = __importStar(require("crypto"));
const security_config_1 = require("../config/security.config");
function fromBase64UrlSafe(base64UrlSafe) {
    let base64 = base64UrlSafe
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const buffer = Buffer.from(base64, 'base64');
    return buffer.toString('utf8');
}
function toBase64UrlSafe(str) {
    const buffer = Buffer.from(str, 'utf8');
    const base64 = buffer.toString('base64');
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function generateHmacSignature(data, secretKey) {
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(data);
    return hmac.digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function verifyHmacSignature(data, signature, secretKey) {
    const expectedSignature = generateHmacSignature(data, secretKey);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
function isIpWhitelisted(clientIp, whitelistedIPs) {
    if (!whitelistedIPs || whitelistedIPs.length === 0) {
        return true;
    }
    if (!clientIp) {
        return false;
    }
    return whitelistedIPs.includes(clientIp);
}
function isEncryptedQuery(query) {
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    if (!base64UrlPattern.test(query)) {
        return false;
    }
    try {
        const payloadJson = fromBase64UrlSafe(query);
        const payload = JSON.parse(payloadJson);
        return !!(payload &&
            typeof payload === 'object' &&
            payload.data &&
            payload.signature &&
            typeof payload.timestamp === 'number');
    }
    catch {
        return false;
    }
}
function decodePipeQuery(encodedQuery, clientIp) {
    const config = (0, security_config_1.getPipesSecurityConfig)();
    if (!config.enabled) {
        return encodedQuery;
    }
    const isEncrypted = isEncryptedQuery(encodedQuery);
    if (!isEncrypted) {
        if (config.allowPlaintext) {
            console.warn('⚠️ Plaintext query detected (encryption not enabled on client)');
            return encodedQuery;
        }
        else {
            throw new Error('Plaintext queries not allowed. Please enable encryption on the client side.');
        }
    }
    try {
        const payloadJson = fromBase64UrlSafe(encodedQuery);
        const payload = JSON.parse(payloadJson);
        if (config.maxAge) {
            const age = Date.now() - payload.timestamp;
            if (age > config.maxAge) {
                throw new Error(`Query expired (age: ${age}ms, max: ${config.maxAge}ms)`);
            }
        }
        if (config.whitelistedIPs && config.whitelistedIPs.length > 0) {
            if (!isIpWhitelisted(clientIp, config.whitelistedIPs)) {
                throw new Error(`IP ${clientIp} not whitelisted`);
            }
        }
        const isValid = verifyHmacSignature(payload.data, payload.signature, config.secretKey);
        if (!isValid) {
            throw new Error('Invalid HMAC signature');
        }
        const decodedQuery = fromBase64UrlSafe(payload.data);
        return decodedQuery;
    }
    catch (error) {
        if (config.allowPlaintext) {
            console.warn('⚠️ Failed to decode encrypted query, using plaintext fallback');
            console.warn('⚠️ Error:', error);
            return encodedQuery;
        }
        console.error('❌ Failed to decode encrypted query:', error);
        throw new Error(`Invalid or expired query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function encodePipeQuery(query, secretKey) {
    const encodedData = toBase64UrlSafe(query);
    const signature = generateHmacSignature(encodedData, secretKey);
    const payload = {
        data: encodedData,
        signature: signature,
        timestamp: Date.now(),
    };
    const payloadJson = JSON.stringify(payload);
    return toBase64UrlSafe(payloadJson);
}
function isSecureQuery(query) {
    return isEncryptedQuery(query);
}
function buildSecureUrl(baseUrl, params, secretKey) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            const encoded = encodePipeQuery(value, secretKey);
            searchParams.append(key, encoded);
        }
    }
    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
//# sourceMappingURL=crypto.utils.js.map