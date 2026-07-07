// API Endpoints Configuration

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
export const BASE_URL = API_BASE_URL;

// search-api (opensearch service) — separate deployment from the main API
export const SEARCH_API_BASE_URL = import.meta.env.VITE_SEARCH_API_URL || 'http://localhost:3000/api/v1';

// Knowledge Graph endpoints live under the main API
export const KG_BASE_URL = `${API_BASE_URL}/kg`;

// Magazine/Content Endpoints
export const ENDPOINTS = {
    // Content/Magazine endpoints
    content: {
        getAll: '/content',
        getPaginated: '/content/paginated',
        getById: (id: string) => `/content/${id}`,
    },

    // Analytics endpoints
    analytics: {
        like: '/content/like',
        dislike: '/content/dislike',
        comment: '/content/comment',
        deleteComment: '/content/uncomment',
    },
} as const;

// Helper to build full URLs with query params
export const buildUrl = (endpoint: string, params?: Record<string, string | number>): string => {
    if (!params) return endpoint;

    const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
        }, {} as Record<string, string>)
    ).toString();

    return `${endpoint}?${queryString}`;
};
