interface UseSecureQueryOptions extends RequestInit {
    retries?: number;
}
interface UseSecureQueryResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    retry: () => void;
}
export declare function useSecureQuery<T = any>(endpoint: string, params: Record<string, string | undefined>, secretKey: string, options?: UseSecureQueryOptions): UseSecureQueryResult<T>;
export {};
