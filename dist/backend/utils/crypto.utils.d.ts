export declare function decodePipeQuery(encodedQuery: string, clientIp?: string): string;
export declare function encodePipeQuery(query: string, secretKey: string): string;
export declare function isSecureQuery(query: string): boolean;
export declare function buildSecureUrl(baseUrl: string, params: Record<string, string>, secretKey: string): string;
//# sourceMappingURL=crypto.utils.d.ts.map