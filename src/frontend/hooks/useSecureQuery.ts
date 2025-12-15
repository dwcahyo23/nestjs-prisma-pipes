// src/frontend/hooks/useSecureQuery.ts

import { buildSecureUrl } from '../utils/url-builder';

// ============================================
// Types
// ============================================

interface UseSecureQueryOptions extends RequestInit {
	retries?: number;
}

interface UseSecureQueryResult<T> {
	data: T | null;
	loading: boolean;
	error: Error | null;
	retry: () => void;
}

// ============================================
// Simple State Management (React-like)
// ============================================

type SetStateAction<T> = T | ((prev: T) => T);
type StateUpdater<T> = (action: SetStateAction<T>) => void;

interface State<T> {
	value: T;
	listeners: Set<() => void>;
}

function createState<T>(initialValue: T): [() => T, StateUpdater<T>] {
	const state: State<T> = {
		value: initialValue,
		listeners: new Set(),
	};

	const getValue = () => state.value;

	const setValue: StateUpdater<T> = (action) => {
		const newValue = typeof action === 'function'
			? (action as (prev: T) => T)(state.value)
			: action;

		if (newValue !== state.value) {
			state.value = newValue;
			state.listeners.forEach(listener => listener());
		}
	};

	return [getValue, setValue];
}

// ============================================
// Hook Implementation (Framework Agnostic)
// ============================================

export function useSecureQuery<T = any>(
	endpoint: string,
	params: Record<string, string | undefined>,
	secretKey: string,
	options?: UseSecureQueryOptions
): UseSecureQueryResult<T> {
	// Create state
	const [getData, setData] = createState<T | null>(null);
	const [getLoading, setLoading] = createState<boolean>(true);
	const [getError, setError] = createState<Error | null>(null);
	const [getRetryCount, setRetryCount] = createState<number>(0);

	const maxRetries = options?.retries ?? 0;

	// Fetch function
	async function fetchData(cancelled: { value: boolean }) {
		try {
			setLoading(true);
			setError(null);

			const url = await buildSecureUrl(endpoint, params, secretKey);
			const response = await fetch(url, options);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.message || `HTTP error! status: ${response.status}`
				);
			}

			const json = await response.json();

			if (!cancelled.value) {
				setData(json);
				setRetryCount(0);
			}
		} catch (err) {
			if (!cancelled.value) {
				const error = err instanceof Error ? err : new Error('Unknown error');

				// Retry logic
				const currentRetryCount = getRetryCount();
				if (currentRetryCount < maxRetries) {
					setRetryCount((prev: number) => prev + 1);
					setTimeout(() => fetchData(cancelled), 1000 * (currentRetryCount + 1));
					return;
				}

				setError(error);
			}
		} finally {
			if (!cancelled.value) {
				setLoading(false);
			}
		}
	}

	// Start fetch
	const cancelled = { value: false };
	fetchData(cancelled);

	// Cleanup on unmount (if using React, call this in useEffect cleanup)
	const cleanup = () => {
		cancelled.value = true;
	};

	// Return result
	return {
		data: getData(),
		loading: getLoading(),
		error: getError(),
		retry: () => setRetryCount(0),
	};
}