import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { BASE_URL, SEARCH_API_BASE_URL, KG_BASE_URL } from './endpoints';

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

    client.interceptors.response.use(
        (response: AxiosResponse) => {
            if (import.meta.env.DEV) {
                console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
            }

            return response;
        },
        (error: AxiosError) => {
            if (error.response) {
                const status = error.response.status;
                const message = (error.response.data as any)?.message || error.message;

                console.error(`[API Error ${status}]`, message);

                switch (status) {
                    case 401:
                        // Session cookie missing/expired — AuthContext owns
                        // re-authentication (login is a full-page redirect).
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
                console.error('[API Error] No response received', error.request);
            } else {
                console.error('[API Error] Request setup failed', error.message);
            }

            return Promise.reject(error);
        }
    );

    return client;
}

const apiClient: AxiosInstance = createApiClient(BASE_URL);

export const searchApiClient: AxiosInstance = createApiClient(SEARCH_API_BASE_URL);

export const kgApiClient: AxiosInstance = createApiClient(KG_BASE_URL);

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
