export declare function encodeClientPipeQuery(query: string, secretKey: string): Promise<string>;
export declare function decodeClientPipeQuery(encodedQuery: string, secretKey: string): Promise<string>;
export declare function isCryptoAvailable(): {
    isSecureContext: boolean;
    hasWebCrypto: boolean;
    usingCryptoJS: boolean;
    mode: 'web-crypto' | 'crypto-js' | 'hybrid';
};
export declare function testHmacCompatibility(secretKey: string, testData: string): Promise<{
    data: string;
    encoded: string;
    signature: string;
    mode: string;
}>;
export declare function compareSignatures(data: string, secretKey: string): Promise<{
    cryptoJS: string;
    webCrypto: string | null;
    match: boolean;
}>;
//# sourceMappingURL=crypto.client.d.ts.map