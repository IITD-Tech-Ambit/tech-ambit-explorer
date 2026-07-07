import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { BASE_URL, SEARCH_API_BASE_URL, KG_BASE_URL } from './endpoints';

/**
 * Build an axios instance with the same auth-header injection, dev logging,
 * and error handling as the default client, pointed at a different backend
 * base URL. Used for the search-api and KG services (separate deployments
 * from the main API), so every backend call goes through one consistent
 * client instead of each service hand-rolling its own fetch + base URL.
 */
export function createApiClient(baseURL: string): AxiosInstance {
    const client = axios.create({
        baseURL,
        timeout: 30000, // 30 seconds
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request Interceptor
    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            // Add authentication token if available
            const token = localStorage.getItem('authToken');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Log request in development
            if (import.meta.env.DEV) {
                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
            }

            return config;
        },
        (error: AxiosError) => {
            console.error('[API Request Error]', error);
            return Promise.reject(error);
        }
    );

    // Response Interceptor
    client.interceptors.response.use(
        (response: AxiosResponse) => {
            // Log response in development
            if (import.meta.env.DEV) {
                console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
            }

            return response;
        },
        (error: AxiosError) => {
            // Handle different error scenarios
            if (error.response) {
                // Server responded with error status
                const status = error.response.status;
                const message = (error.response.data as any)?.message || error.message;

                console.error(`[API Error ${status}]`, message);

                // Handle specific status codes
                switch (status) {
                    case 401:
                        // Unauthorized - clear token and redirect to login
                        localStorage.removeItem('authToken');
                        // You can add redirect logic here if needed
                        break;
                    case 403:
                        console.error('Access forbidden');
                        break;
                    case 404:
                        console.error('Resource not found');
                        break;
                    case 500:
                        console.error('Server error');
                        break;
                    default:
                        console.error('An error occurred');
                }
            } else if (error.request) {
                // Request made but no response received
                console.error('[API Error] No response received', error.request);
            } else {
                // Error in setting up the request
                console.error('[API Error] Request setup failed', error.message);
            }

            return Promise.reject(error);
        }
    );

    return client;
}

// Default client — the main API (research-ambit-main)
const apiClient: AxiosInstance = createApiClient(BASE_URL);

// search-api (opensearch service) — separate deployment
export const searchApiClient: AxiosInstance = createApiClient(SEARCH_API_BASE_URL);

// Knowledge Graph endpoints (served by the main API under /kg)
export const kgApiClient: AxiosInstance = createApiClient(KG_BASE_URL);

// Retry logic helper (optional, can be enabled for specific requests)
export const retryRequest = async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryRequest(fn, retries - 1, delay * 2);
    }
};

export default apiClient;
