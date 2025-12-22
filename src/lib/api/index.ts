// Re-export all API functionality from a central location
// This makes imports cleaner throughout the application

// Types
export type * from './types';

// API Client
export { default as apiClient } from './apiClient';

// Endpoints
export { ENDPOINTS, BASE_URL, buildUrl } from './endpoints';

// Services
export * from './services/magazineService';
export * from './services/analyticsService';
export * from './services/thesisService';
export * from './services/searchService';

// Query Keys
export { queryKeys } from './hooks/queryKeys';

// Hooks
export * from './hooks/useMagazines';
export * from './hooks/useMagazineAnalytics';
