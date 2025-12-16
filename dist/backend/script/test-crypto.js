"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_utils_1 = require("../utils/crypto.utils");
const security_config_1 = require("../config/security.config");
const TEST_SECRET = 'your-super-secret-key-min-32-chars-long';
const TEST_QUERIES = [
    'name',
    'email',
    'createdAt',
    'name:asc',
    'email:desc',
    'complex_field.nested_property:asc',
    'special-chars: こんにちは',
    'emoji: 🔐🚀💡',
    'json: {"field":"value","nested":{"key":"data"}}',
];
(0, security_config_1.configurePipesSecurity)({
    enabled: true,
    secretKey: TEST_SECRET,
    allowPlaintext: false,
    maxAge: 3600000,
});
function testEncoding() {
    console.log('\n🔐 === ENCODING TEST ===\n');
    for (const query of TEST_QUERIES) {
        try {
            const encoded = (0, crypto_utils_1.encodePipeQuery)(query, TEST_SECRET);
            console.log(`✅ "${query}"`);
            console.log(`   Encoded: ${encoded.substring(0, 60)}...`);
            console.log(`   Length: ${encoded.length}`);
        }
        catch (error) {
            console.error(`❌ Failed to encode "${query}":`, error);
        }
    }
}
function testRoundTrip() {
    console.log('\n🔄 === ROUND-TRIP TEST ===\n');
    for (const query of TEST_QUERIES) {
        try {
            const encoded = (0, crypto_utils_1.encodePipeQuery)(query, TEST_SECRET);
            const decoded = (0, crypto_utils_1.decodePipeQuery)(encoded);
            const success = query === decoded;
            if (success) {
                console.log(`✅ "${query}" → PASS`);
            }
            else {
                console.error(`❌ "${query}" → FAIL`);
                console.error(`   Expected: "${query}"`);
                console.error(`   Got: "${decoded}"`);
            }
        }
        catch (error) {
            console.error(`❌ "${query}" → ERROR:`, error);
        }
    }
}
function testExpiredQuery() {
    console.log('\n⏰ === EXPIRY TEST ===\n');
    try {
        const oldTimestamp = Date.now() - 7200000;
        const encodedData = Buffer.from('test-query').toString('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const hmac = require('crypto').createHmac('sha256', TEST_SECRET);
        hmac.update(encodedData);
        const signature = hmac.digest('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const payload = {
            data: encodedData,
            signature: signature,
            timestamp: oldTimestamp,
        };
        const payloadJson = JSON.stringify(payload);
        const expiredQuery = Buffer.from(payloadJson).toString('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        (0, crypto_utils_1.decodePipeQuery)(expiredQuery);
        console.log('❌ Expired query should have been rejected!');
    }
    catch (error) {
        console.log('✅ Expired query correctly rejected:', error instanceof Error ? error.message : error);
    }
}
function testInvalidSignature() {
    console.log('\n🔒 === INVALID SIGNATURE TEST ===\n');
    try {
        const encoded = (0, crypto_utils_1.encodePipeQuery)('valid-query', TEST_SECRET);
        const tampered = encoded.slice(0, -5) + 'XXXXX';
        (0, crypto_utils_1.decodePipeQuery)(tampered);
        console.log('❌ Tampered query should have been rejected!');
    }
    catch (error) {
        console.log('✅ Tampered query correctly rejected:', error instanceof Error ? error.message : error);
    }
}
function generateTestUrl() {
    console.log('\n🌐 === GENERATE TEST URL ===\n');
    const baseUrl = 'http://localhost:3000/api/data/items';
    const params = {
        orderBy: 'name:asc',
        filter: 'status=active',
        search: 'test query',
    };
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        const encoded = (0, crypto_utils_1.encodePipeQuery)(value, TEST_SECRET);
        searchParams.append(key, encoded);
    }
    const fullUrl = `${baseUrl}?${searchParams.toString()}`;
    console.log('Full URL:');
    console.log(fullUrl);
    console.log('\nURL Length:', fullUrl.length);
}
function runAllTests() {
    console.log('🚀 Starting Crypto Tests...\n');
    console.log('Secret Key:', TEST_SECRET);
    console.log('Total Test Cases:', TEST_QUERIES.length);
    testEncoding();
    testRoundTrip();
    testExpiredQuery();
    testInvalidSignature();
    generateTestUrl();
    console.log('\n✨ All tests completed!\n');
}
runAllTests();
//# sourceMappingURL=test-crypto.js.map