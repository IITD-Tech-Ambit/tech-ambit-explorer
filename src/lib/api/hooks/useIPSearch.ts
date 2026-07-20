import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { searchIP, getIPDocumentById } from '../services/ipSearchService';
import type { IPSearchRequest, IPSearchResponse, IPDocument } from '../types';

export const useIPSearch = (
    request: IPSearchRequest | null,
    options?: { enabled?: boolean; staleTime?: number; gcTime?: number }
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
        staleTime: options?.staleTime ?? 1000 * 60 * 5,
        gcTime: options?.gcTime ?? 1000 * 60 * 10,
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

// Directory profiles compose `name` as "{title} {firstName} {lastName}" (e.g. "Prof Bhim Singh"),
// but the IP pipeline doesn't consistently carry that title into inventors[].name. Stripping it
// keeps every query term one the stored inventor name is guaranteed to contain.
const FACULTY_TITLE_PREFIX = /^(prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i;

/** Shared by `useFacultyPatents` (page 1) and `PatentTimeline`'s "load more" (subsequent pages). */
export const buildFacultyPatentsQuery = (facultyName: string): string =>
    (facultyName || '').replace(FACULTY_TITLE_PREFIX, '').trim();

/**
 * Page size for the faculty-profile Patents timeline. Kept modest (rather than fetching the
 * backend's full per_page max of 100 up front) so the timeline paginates via "Load more patents"
 * the same way `PublicationTimeline` paginates via "Load older years" — most faculty have well
 * under this many patents, so the button rarely even appears, but it keeps the initial card small
 * and future-proofs against faculty with large patent portfolios.
 */
export const FACULTY_PATENTS_PAGE_SIZE = 20;

/**
 * Faculty profile "Patents" section: there's no dedicated author-scoped IP endpoint, so this
 * scopes the shared IP search by `filters.kerberos` (a strict OpenSearch filter, independent of
 * text scoring) and drives the query text with the faculty's own name (title stripped) restricted
 * to the `inventor` field. Because the kerberos filter already narrows to this person's own
 * filings, and their own name is always present in their `inventors.name` entry, this reliably
 * returns full recall rather than a relevance-ranked subset. `sort: 'date'` orders the timeline
 * newest-first, matching Publications.
 *
 * Cached longer than a typical topic search (15min stale / 30min gc vs. the 5min/10min default,
 * matching `useFacultyResearchSummary`'s 5min ballpark but intentionally more generous) since a
 * given inventor's own filings are effectively static between backend re-crawls.
 */
export const useFacultyPatents = (
    kerberos: string,
    facultyName: string,
    options?: { enabled?: boolean }
) => {
    const query = buildFacultyPatentsQuery(facultyName);
    const canSearch = !!kerberos?.trim() && !!query;
    const request: IPSearchRequest | null = canSearch
        ? {
            query,
            search_in: ['inventor'],
            filters: { kerberos },
            mode: 'basic',
            sort: 'date',
            page: 1,
            per_page: FACULTY_PATENTS_PAGE_SIZE,
        }
        : null;

    return useIPSearch(request, {
        enabled: options?.enabled !== false && canSearch,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 30,
    });
};
