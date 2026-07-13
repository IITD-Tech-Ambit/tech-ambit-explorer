import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { searchResearch, getDocumentById, authorScopedSearch, getAllFacultyForQuery } from '../services/searchService';
import type { SearchRequest, SearchResponse, SearchDocument, AuthorScopedSearchRequest, AuthorScopedSearchResponse, AllFacultyForQueryResponse, SearchFilters } from '../types';

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
            refine_chain: request.refine_chain?.length ? request.refine_chain.join('\u0001') : null,
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

export const useSearchDocument = (id: string, options?: { enabled?: boolean }) => {
    return useQuery<SearchDocument, Error>({
        queryKey: queryKeys.search.document(id),
        queryFn: () => getDocumentById(id),
        enabled: options?.enabled !== false && !!id,
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    });
};

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
            request?.refine_chain?.length ? request.refine_chain.join('\u0001') : null,
            request?.per_page ?? 20,
            request?.search_in?.length
                ? [...request.search_in].sort().join(',')
                : null,
            // Filters participate in the key so a filtered drill-down isn't served a cached unfiltered result.
            request?.filters && Object.keys(request.filters).length > 0
                ? JSON.stringify(request.filters)
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
 * Fetches when `enabled` is true (Explore keeps this on whenever a search is active so counts align with main search).
 */
export const useAllFacultyForQuery = (
    query: string,
    mode: string = 'advanced',
    options?: { enabled?: boolean; search_in?: string[]; refine_within?: string | null; refine_chain?: string[] | null; filters?: SearchFilters }
) => {
    const isEnabled = options?.enabled === true && !!query.trim();
    const searchInKey = options?.search_in?.length
        ? [...options.search_in].sort().join(',')
        : '';
    const refineKey = options?.refine_within?.trim() || '';
    const refineChainKey = options?.refine_chain?.length ? options.refine_chain.join('\u0001') : '';
    // Filters participate in the cache key so a filtered request never reuses an
    // unfiltered (or differently-filtered) cached People sidebar result.
    const filtersKey = options?.filters && Object.keys(options.filters).length > 0
        ? JSON.stringify(options.filters)
        : '';

    return useQuery<AllFacultyForQueryResponse, Error>({
        queryKey: [
            ...queryKeys.search.facultyForQuery(query),
            mode,
            searchInKey,
            refineKey,
            refineChainKey,
            filtersKey,
        ],
        queryFn: () =>
            getAllFacultyForQuery(query, mode, {
                search_in: options?.search_in,
                refine_within: options?.refine_within,
                refine_chain: options?.refine_chain,
                filters: options?.filters,
            }),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 10,  // Cache for 10 minutes (heavy query)
        gcTime: 1000 * 60 * 15,
        refetchOnMount: false,
    });
};
