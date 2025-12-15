import { encodeClientPipeQuery } from '../core/crypto.client';

export async function buildSecureUrl(
	baseUrl: string,
	params: Record<string, string | undefined>,
	secretKey: string
): Promise<string> {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value) {
			const encoded = await encodeClientPipeQuery(value, secretKey);
			searchParams.append(key, encoded);
		}
	}

	const queryString = searchParams.toString();
	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function createSecureEncoder(secretKey: string) {
	return {
		encode: (query: string) => encodeClientPipeQuery(query, secretKey),
		buildUrl: (baseUrl: string, params: Record<string, string | undefined>) =>
			buildSecureUrl(baseUrl, params, secretKey),
	};
}