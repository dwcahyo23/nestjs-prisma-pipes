"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePipesSecurity = configurePipesSecurity;
exports.getPipesSecurityConfig = getPipesSecurityConfig;
exports.resetPipesSecurityConfig = resetPipesSecurityConfig;
let securityConfig = {
    enabled: false,
    secretKey: '',
    allowPlaintext: true,
    whitelistedIPs: [],
    maxAge: 3600000,
};
function configurePipesSecurity(config) {
    if (config.enabled && !config.secretKey) {
        throw new Error('secretKey is required when security is enabled');
    }
    if (config.enabled && config.secretKey.length < 32) {
        console.warn('⚠️ Secret key should be at least 32 characters for security');
    }
    if (config.whitelistedIPs) {
        for (const ip of config.whitelistedIPs) {
            if (!isValidIP(ip)) {
                throw new Error(`Invalid IP address in whitelist: ${ip}`);
            }
        }
    }
    securityConfig = { ...securityConfig, ...config };
    console.log('🔐 Pipes Security Configured:', {
        enabled: config.enabled,
        allowPlaintext: config.allowPlaintext,
        whitelistedIPs: config.whitelistedIPs?.length || 0,
        maxAge: config.maxAge,
    });
}
function isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
function getPipesSecurityConfig() {
    return Object.freeze({ ...securityConfig });
}
function resetPipesSecurityConfig() {
    securityConfig = {
        enabled: false,
        secretKey: '',
        allowPlaintext: true,
        whitelistedIPs: [],
        maxAge: 3600000,
    };
}
//# sourceMappingURL=security.config.js.map