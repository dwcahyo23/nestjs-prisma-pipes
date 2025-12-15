"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeClientPipeQuery = encodeClientPipeQuery;
function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
}
function sha256(message) {
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    let H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const msgBytes = [];
    for (let i = 0; i < message.length; i++) {
        msgBytes.push(message.charCodeAt(i) & 0xff);
    }
    const msgLen = msgBytes.length;
    const bitLen = msgLen * 8;
    msgBytes.push(0x80);
    while ((msgBytes.length % 64) !== 56) {
        msgBytes.push(0x00);
    }
    for (let i = 7; i >= 0; i--) {
        msgBytes.push((bitLen >>> (i * 8)) & 0xff);
    }
    for (let chunk = 0; chunk < msgBytes.length; chunk += 64) {
        const W = new Array(64);
        for (let i = 0; i < 16; i++) {
            W[i] = (msgBytes[chunk + i * 4] << 24) |
                (msgBytes[chunk + i * 4 + 1] << 16) |
                (msgBytes[chunk + i * 4 + 2] << 8) |
                (msgBytes[chunk + i * 4 + 3]);
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
            const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ ((~e) & g);
            const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;
            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }
        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
        H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0;
        H[7] = (H[7] + h) | 0;
    }
    return H;
}
function hmacSha256(key, message) {
    const blockSize = 64;
    let keyBytes = [];
    for (let i = 0; i < key.length; i++) {
        keyBytes.push(key.charCodeAt(i) & 0xff);
    }
    if (keyBytes.length > blockSize) {
        const hashedKey = sha256(key);
        keyBytes = [];
        for (const word of hashedKey) {
            keyBytes.push((word >>> 24) & 0xff);
            keyBytes.push((word >>> 16) & 0xff);
            keyBytes.push((word >>> 8) & 0xff);
            keyBytes.push(word & 0xff);
        }
    }
    while (keyBytes.length < blockSize) {
        keyBytes.push(0x00);
    }
    const oKeyPad = [];
    const iKeyPad = [];
    for (let i = 0; i < blockSize; i++) {
        oKeyPad.push(keyBytes[i] ^ 0x5c);
        iKeyPad.push(keyBytes[i] ^ 0x36);
    }
    const innerMessage = String.fromCharCode(...iKeyPad) + message;
    const innerHash = sha256(innerMessage);
    const innerHashBytes = [];
    for (const word of innerHash) {
        innerHashBytes.push((word >>> 24) & 0xff);
        innerHashBytes.push((word >>> 16) & 0xff);
        innerHashBytes.push((word >>> 8) & 0xff);
        innerHashBytes.push(word & 0xff);
    }
    const outerMessage = String.fromCharCode(...oKeyPad) + String.fromCharCode(...innerHashBytes);
    return sha256(outerMessage);
}
function hashToBase64Url(hash) {
    const bytes = [];
    for (const word of hash) {
        bytes.push((word >>> 24) & 0xff);
        bytes.push((word >>> 16) & 0xff);
        bytes.push((word >>> 8) & 0xff);
        bytes.push(word & 0xff);
    }
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary)
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
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function generateHmacPureJS(data, secretKey) {
    const hash = hmacSha256(secretKey, data);
    return hashToBase64Url(hash);
}
async function generateHmacSignature(data, secretKey) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            return await generateHmacWebCrypto(data, secretKey);
        }
        catch (error) {
            console.warn('⚠️ Web Crypto API failed, using pure JS implementation');
        }
    }
    return await generateHmacPureJS(data, secretKey);
}
async function encodeClientPipeQuery(query, secretKey) {
    const encodedData = btoa(unescape(encodeURIComponent(query)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const signature = await generateHmacSignature(encodedData, secretKey);
    const payload = {
        data: encodedData,
        signature: signature,
        timestamp: Date.now(),
    };
    const payloadJson = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(payloadJson)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
//# sourceMappingURL=crypto.client.js.map