import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { searchResearch, getDocumentById, authorScopedSearch, getAllFacultyForQuery } from '../services/searchService';
import type { SearchRequest, SearchResponse, SearchDocument, AuthorScopedSearchRequest, AuthorScopedSearchResponse, AllFacultyForQueryResponse } from '../types';

/**
 * Hook for searching research documents with React Query
 * Implements hybrid BM25 + semantic search
 */
export const useSearchResearch = (
    request: SearchRequest | null,
    options?: { enabled?: boolean }
) => {
    const isEnabled = options?.enabled !== false && !!request && !!request.query?.trim();
    
    // Normalize query key to use primitive values for consistent caching
    // JSON.stringify ensures object comparison works correctly across remounts
    const normalizedKey = request
        ? {
            query: request.query,
            page: request.page,
            per_page: request.per_page ?? 20,
            filters: JSON.stringify(request.filters || {}),
            sort: request.sort,
            mode: request.mode || 'advanced',
            refine_within: request.refine_within || null,
            // Must match server-side cache: same fields in any order → same key
            search_in: request.search_in?.length
                ? [...request.search_in].sort().join(',')
                : null,
        }
        : { empty: true };
    
    return useQuery<SearchResponse, Error>({
        queryKey: queryKeys.search.results(normalizedKey),
        queryFn: () => searchResearch(request!),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        gcTime: 1000 * 60 * 10,   // Keep in garbage collection for 10 minutes
        refetchOnMount: false,    // Don't refetch if we have cached data
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

/**
 * Hook for author-scoped semantic search
 * Searches within a specific author's papers using cosine similarity
 */
export const useAuthorScopedSearch = (
    request: AuthorScopedSearchRequest | null,
    options?: { enabled?: boolean }
) => {
    const isEnabled = options?.enabled !== false 
        && !!request 
        && !!request.query?.trim() 
        && !!request.author_id;
    
    return useQuery<AuthorScopedSearchResponse, Error>({
        queryKey: [
            ...queryKeys.search.authorScoped(
                request?.author_id || '',
                request?.query || '',
                request?.page || 1
            ),
            request?.mode || 'advanced',
            request?.refine_within || null,
            request?.per_page ?? 20,
            request?.search_in?.length
                ? [...request.search_in].sort().join(',')
                : null,
        ],
        queryFn: () => authorScopedSearch(request!),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnMount: false,
    });
};

/**
 * Hook for fetching all faculty matching a query.
 * Lazy: only fires when `enabled` is true (user clicks "Show All")
 */
export const useAllFacultyForQuery = (
    query: string,
    mode: string = 'advanced',
    options?: { enabled?: boolean }
) => {
    const isEnabled = options?.enabled === true && !!query.trim();
    
    return useQuery<AllFacultyForQueryResponse, Error>({
        // Include mode in queryKey so basic/advanced searches cache separately
        queryKey: [...queryKeys.search.facultyForQuery(query), mode],
        queryFn: () => getAllFacultyForQuery(query, mode),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 10,  // Cache for 10 minutes (heavy query)
        gcTime: 1000 * 60 * 15,
        refetchOnMount: false,
    });
};
