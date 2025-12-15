"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSecureQuery = useSecureQuery;
const url_builder_1 = require("../utils/url-builder");
function createState(initialValue) {
    const state = {
        value: initialValue,
        listeners: new Set(),
    };
    const getValue = () => state.value;
    const setValue = (action) => {
        const newValue = typeof action === 'function'
            ? action(state.value)
            : action;
        if (newValue !== state.value) {
            state.value = newValue;
            state.listeners.forEach(listener => listener());
        }
    };
    return [getValue, setValue];
}
function useSecureQuery(endpoint, params, secretKey, options) {
    const [getData, setData] = createState(null);
    const [getLoading, setLoading] = createState(true);
    const [getError, setError] = createState(null);
    const [getRetryCount, setRetryCount] = createState(0);
    const maxRetries = options?.retries ?? 0;
    async function fetchData(cancelled) {
        try {
            setLoading(true);
            setError(null);
            const url = await (0, url_builder_1.buildSecureUrl)(endpoint, params, secretKey);
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const json = await response.json();
            if (!cancelled.value) {
                setData(json);
                setRetryCount(0);
            }
        }
        catch (err) {
            if (!cancelled.value) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                const currentRetryCount = getRetryCount();
                if (currentRetryCount < maxRetries) {
                    setRetryCount((prev) => prev + 1);
                    setTimeout(() => fetchData(cancelled), 1000 * (currentRetryCount + 1));
                    return;
                }
                setError(error);
            }
        }
        finally {
            if (!cancelled.value) {
                setLoading(false);
            }
        }
    }
    const cancelled = { value: false };
    fetchData(cancelled);
    const cleanup = () => {
        cancelled.value = true;
    };
    return {
        data: getData(),
        loading: getLoading(),
        error: getError(),
        retry: () => setRetryCount(0),
    };
}
//# sourceMappingURL=useSecureQuery.js.map