import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { searchIP, getIPDocumentById } from '../services/ipSearchService';
import type { IPSearchRequest, IPSearchResponse, IPDocument } from '../types';

export const useIPSearch = (
    request: IPSearchRequest | null,
    options?: { enabled?: boolean }
) => {
    const isEnabled = options?.enabled !== false && !!request && !!request.query?.trim();

    // Normalize query key to primitive/stable values so remounts and reorderings
    // of filters/search_in don't bust the cache (mirrors useSearchResearch).
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
            search_in: request.search_in?.length
                ? [...request.search_in].sort().join(',')
                : null,
        }
        : { empty: true };

    return useQuery<IPSearchResponse, Error>({
        queryKey: queryKeys.ipSearch.results(normalizedKey),
        queryFn: () => searchIP(request!),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnMount: false,
    });
};

export const useIPDocument = (id: string, options?: { enabled?: boolean }) => {
    return useQuery<IPDocument, Error>({
        queryKey: queryKeys.ipSearch.document(id),
        queryFn: () => getIPDocumentById(id),
        enabled: options?.enabled !== false && !!id,
        staleTime: 1000 * 60 * 10,
    });
};
