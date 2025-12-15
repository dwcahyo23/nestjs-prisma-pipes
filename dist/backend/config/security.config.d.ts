export interface PipesSecurityConfig {
    enabled: boolean;
    secretKey: string;
    allowPlaintext?: boolean;
    whitelistedIPs?: string[];
    maxAge?: number;
}
export declare function configurePipesSecurity(config: PipesSecurityConfig): void;
export declare function getPipesSecurityConfig(): Readonly<PipesSecurityConfig>;
export declare function resetPipesSecurityConfig(): void;
