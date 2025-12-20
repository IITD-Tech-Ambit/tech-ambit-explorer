/**
 * Query Keys Factory
 * Centralized query key management for React Query
 * This ensures consistent cache keys across the application
 */

export const queryKeys = {
    // Magazine query keys
    magazines: {
        all: ['magazines'] as const,
        lists: () => [...queryKeys.magazines.all, 'list'] as const,
        list: (filters?: { page?: number; limit?: number; status?: string }) => 
            [...queryKeys.magazines.lists(), filters || {}] as const,
        details: () => [...queryKeys.magazines.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.magazines.details(), id] as const,
    },
    
    // Analytics query keys
    analytics: {
        all: ['analytics'] as const,
        byContent: (contentId: string) => [...queryKeys.analytics.all, contentId] as const,
    },
} as const;
