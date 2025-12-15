export declare function buildSecureUrl(baseUrl: string, params: Record<string, string | undefined>, secretKey: string): Promise<string>;
export declare function createSecureEncoder(secretKey: string): {
    encode: (query: string) => Promise<string>;
    buildUrl: (baseUrl: string, params: Record<string, string | undefined>) => Promise<string>;
};
