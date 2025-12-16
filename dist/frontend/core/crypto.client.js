"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeClientPipeQuery = encodeClientPipeQuery;
exports.decodeClientPipeQuery = decodeClientPipeQuery;
exports.isCryptoAvailable = isCryptoAvailable;
exports.testHmacCompatibility = testHmacCompatibility;
exports.compareSignatures = compareSignatures;
const crypto_js_1 = __importDefault(require("crypto-js"));
const IS_SECURE_CONTEXT = typeof window !== 'undefined' && window.isSecureContext;
const HAS_WEB_CRYPTO = typeof crypto !== 'undefined' && !!crypto.subtle;
const FORCE_PURE_JS = !IS_SECURE_CONTEXT;
if (FORCE_PURE_JS && typeof window !== 'undefined') {
    console.warn('⚠️ Running in non-secure context (HTTP), using crypto-js library');
}
function toBase64UrlSafe(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    const base64 = btoa(binary);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function fromBase64UrlSafe(base64UrlSafe) {
    let base64 = base64UrlSafe
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}
function generateHmacCryptoJS(data, secretKey) {
    const hmac = crypto_js_1.default.HmacSHA256(data, secretKey);
    const base64 = hmac.toString(crypto_js_1.default.enc.Base64);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
async function generateHmacWebCrypto(data, secretKey) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const dataBuffer = encoder.encode(data);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    const bytes = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
async function generateHmacSignature(data, secretKey) {
    if (FORCE_PURE_JS) {
        return generateHmacCryptoJS(data, secretKey);
    }
    if (HAS_WEB_CRYPTO) {
        try {
            return await generateHmacWebCrypto(data, secretKey);
        }
        catch (error) {
            console.warn('⚠️ Web Crypto API failed, falling back to crypto-js');
            return generateHmacCryptoJS(data, secretKey);
        }
    }
    return generateHmacCryptoJS(data, secretKey);
}
async function encodeClientPipeQuery(query, secretKey) {
    const encodedData = toBase64UrlSafe(query);
    const signature = await generateHmacSignature(encodedData, secretKey);
    const payload = {
        data: encodedData,
        signature: signature,
        timestamp: Date.now(),
    };
    const payloadJson = JSON.stringify(payload);
    return toBase64UrlSafe(payloadJson);
}
async function decodeClientPipeQuery(encodedQuery, secretKey) {
    const payloadJson = fromBase64UrlSafe(encodedQuery);
    const payload = JSON.parse(payloadJson);
    const expectedSignature = await generateHmacSignature(payload.data, secretKey);
    if (payload.signature !== expectedSignature) {
        throw new Error('Invalid HMAC signature');
    }
    return fromBase64UrlSafe(payload.data);
}
function isCryptoAvailable() {
    let mode = 'hybrid';
    if (FORCE_PURE_JS) {
        mode = 'crypto-js';
    }
    else if (HAS_WEB_CRYPTO) {
        mode = 'web-crypto';
    }
    return {
        isSecureContext: IS_SECURE_CONTEXT,
        hasWebCrypto: HAS_WEB_CRYPTO,
        usingCryptoJS: FORCE_PURE_JS,
        mode
    };
}
async function testHmacCompatibility(secretKey, testData) {
    const encoded = toBase64UrlSafe(testData);
    const signature = await generateHmacSignature(encoded, secretKey);
    const mode = FORCE_PURE_JS ? 'crypto-js (HTTP)' : 'Web Crypto API (HTTPS)';
    console.log('🧪 Test HMAC Compatibility:');
    console.log('Input:', testData);
    console.log('Encoded:', encoded);
    console.log('Signature:', signature);
    console.log('Mode:', mode);
    return { data: testData, encoded, signature, mode };
}
async function compareSignatures(data, secretKey) {
    const cryptoJSSig = generateHmacCryptoJS(data, secretKey);
    let webCryptoSig = null;
    let match = false;
    if (HAS_WEB_CRYPTO) {
        try {
            webCryptoSig = await generateHmacWebCrypto(data, secretKey);
            match = cryptoJSSig === webCryptoSig;
        }
        catch (error) {
            console.warn('Web Crypto API not available');
        }
    }
    console.log('🔍 Signature Comparison:');
    console.log('crypto-js:', cryptoJSSig);
    console.log('Web Crypto:', webCryptoSig || 'N/A');
    console.log('Match:', match ? '✅' : '❌');
    return { cryptoJS: cryptoJSSig, webCrypto: webCryptoSig, match };
}
//# sourceMappingURL=crypto.client.js.map