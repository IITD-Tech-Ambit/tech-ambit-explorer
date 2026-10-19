import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { BASE_URL, SEARCH_API_BASE_URL, KG_BASE_URL, IP_SEARCH_API_BASE_URL } from './endpoints';

/**
 * Build an axios instance with the same cookie-credential handling, dev
 * logging, and error handling as the default client, pointed at a different
 * backend base URL. Used for the search-api and KG services (separate
 * deployments from the main API), so every backend call goes through one
 * consistent client instead of each service hand-rolling its own fetch +
 * base URL.
 *
 * Auth: the IITD session lives in an httpOnly cookie set by auth-service
 * (never in localStorage), so every request just sends credentials.
 */
export function createApiClient(baseURL: string): AxiosInstance {
    const client = axios.create({
        baseURL,
        timeout: 30000,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
                config.headers.delete('Content-Type');
            }

            if (import.meta.env.DEV) {
                console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
            }

            return config;
        },
        (error: AxiosError) => {
            if (import.meta.env.DEV) console.error('[API Request Error]', error);
            return Promise.reject(error);
        }
    );

    client.interceptors.response.use(
        (response: AxiosResponse) => {
            if (import.meta.env.DEV) {
                console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
            }

            return response;
        },
        (error: AxiosError) => {
            // Callers handle the rejection. Logging here only helps local debugging;
            // a production visitor should not see request traces in the console.
            if (import.meta.env.DEV) {
                if (error.response) {
                    const status = error.response.status;
                    const message = (error.response.data as { message?: string } | undefined)?.message || error.message;
                    console.error(`[API Error ${status}]`, message);
                } else if (error.request) {
                    console.error('[API Error] No response received', error.request);
                } else {
                    console.error('[API Error] Request setup failed', error.message);
                }
            }

            return Promise.reject(error);
        }
    );

    return client;
}

const apiClient: AxiosInstance = createApiClient(BASE_URL);

export const searchApiClient: AxiosInstance = createApiClient(SEARCH_API_BASE_URL);

export const kgApiClient: AxiosInstance = createApiClient(KG_BASE_URL);

export const ipSearchApiClient: AxiosInstance = createApiClient(IP_SEARCH_API_BASE_URL);

export default apiClient;
