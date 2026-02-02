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

    // Directory query keys
    directory: {
        all: ['directory'] as const,
        lists: () => [...queryKeys.directory.all, 'list'] as const,
        list: (filters?: { page?: number; limit?: number; sortBy?: string; order?: string }) =>
            [...queryKeys.directory.lists(), filters || {}] as const,
        details: () => [...queryKeys.directory.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.directory.details(), id] as const,
        coworking: (id: string) => [...queryKeys.directory.all, 'coworking', id] as const,
        search: (query: string) => [...queryKeys.directory.all, 'search', query] as const,
        grouped: (category: string) => [...queryKeys.directory.all, 'grouped', category] as const,
    },

    // Search query keys
    search: {
        all: ['search'] as const,
        results: (request: Record<string, unknown>) => [...queryKeys.search.all, 'results', request] as const,
        document: (id: string) => [...queryKeys.search.all, 'document', id] as const,
    },
} as const;
