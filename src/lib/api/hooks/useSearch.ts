import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { searchResearch, getDocumentById } from '../services/searchService';
import type { SearchRequest, SearchResponse, SearchDocument } from '../types';

/**
 * Hook for searching research documents with React Query
 * Implements hybrid BM25 + semantic search
 */
export const useSearchResearch = (
    request: SearchRequest | null,
    options?: { enabled?: boolean }
) => {
    const isEnabled = options?.enabled !== false && !!request && !!request.query?.trim();
    
    return useQuery<SearchResponse, Error>({
        queryKey: request 
            ? queryKeys.search.results({ query: request.query, page: request.page, filters: request.filters, sort: request.sort })
            : queryKeys.search.results({ empty: true }),
        queryFn: () => searchResearch(request!),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        gcTime: 1000 * 60 * 10,   // Keep in garbage collection for 10 minutes
    });
};

/**
 * Hook for fetching a single research document by ID
 */
export const useSearchDocument = (id: string, options?: { enabled?: boolean }) => {
    return useQuery<SearchDocument, Error>({
        queryKey: queryKeys.search.document(id),
        queryFn: () => getDocumentById(id),
        enabled: options?.enabled !== false && !!id,
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    });
};
