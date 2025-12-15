export interface PipesSecurityConfig {
	enabled: boolean;
	secretKey: string;
	allowPlaintext?: boolean;
	whitelistedIPs?: string[];
	maxAge?: number;
}

let securityConfig: PipesSecurityConfig = {
	enabled: false,
	secretKey: '',
	allowPlaintext: true,
	whitelistedIPs: [],
	maxAge: 3600000,
};

export function configurePipesSecurity(config: PipesSecurityConfig): void {
	// Validate secret key
	if (config.enabled && !config.secretKey) {
		throw new Error('secretKey is required when security is enabled');
	}

	if (config.enabled && config.secretKey.length < 32) {
		console.warn('⚠️ Secret key should be at least 32 characters for security');
	}

	// Validate IPs
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

function isValidIP(ip: string): boolean {
	const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
	const ipv6Regex = /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i;
	return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export function getPipesSecurityConfig(): Readonly<PipesSecurityConfig> {
	return Object.freeze({ ...securityConfig });
}

export function resetPipesSecurityConfig(): void {
	securityConfig = {
		enabled: false,
		secretKey: '',
		allowPlaintext: true,
		whitelistedIPs: [],
		maxAge: 3600000,
	};
}