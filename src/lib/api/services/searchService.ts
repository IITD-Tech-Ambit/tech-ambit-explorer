import { searchApiClient } from '../apiClient';
import type { SearchRequest, SearchResponse, SearchDocument, AuthorScopedSearchRequest, AuthorScopedSearchResponse, AllFacultyForQueryResponse, SuggestResponse, SearchFilters } from '../types';

const EMPTY_SUGGEST: SuggestResponse = {
  intent: 'mixed',
  confidence: 0,
  groups: { authors: [], papers: [] },
};

/**
 * Blended, intent-aware typeahead: returns Author + Paper suggestion groups plus a
 * predicted intent. AbortController-aware so stale keystrokes can be cancelled.
 */
export async function getSuggestions(
  q: string,
  limit: number = 8,
  signal?: AbortSignal
): Promise<SuggestResponse> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return EMPTY_SUGGEST;

  const { data } = await searchApiClient.get<SuggestResponse>('/suggest', {
    params: { q: trimmed, limit },
    signal,
  });
  return data;
}

export async function searchResearch(request: SearchRequest): Promise<SearchResponse> {
  const { data } = await searchApiClient.post<SearchResponse>('/search', request);
  return data;
}

export async function authorScopedSearch(request: AuthorScopedSearchRequest): Promise<AuthorScopedSearchResponse> {
  const { data } = await searchApiClient.post<AuthorScopedSearchResponse>('/search/author-scope', request);
  return data;
}

export async function getDocumentById(id: string): Promise<SearchDocument> {
  const { data } = await searchApiClient.get<{ document: SearchDocument }>(`/document/${id}`);
  return data.document;
}

export async function getDocumentsByAuthor(
  authorId: string,
  page: number = 1,
  perPage: number = 20
): Promise<SearchResponse> {
  const { data } = await searchApiClient.get<SearchResponse>(`/documents/by-author/${authorId}`, {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function checkSearchHealth(): Promise<{
  status: string;
  services: {
    opensearch: string;
    embedding: string;
    redis: string;
  };
}> {
  const { data } = await searchApiClient.get('/search/health');
  return data;
}

/**
 * Get all faculty matching a query (OpenSearch aggregation, no documents).
 * Pass the same search_in / refine_within as POST /search so the People sidebar matches the main search.
 */
export async function getAllFacultyForQuery(
  query: string,
  mode: string = 'advanced',
  options?: { search_in?: string[]; refine_within?: string | null; refine_chain?: string[] | null; filters?: SearchFilters }
): Promise<AllFacultyForQueryResponse> {
  const params: Record<string, string> = { query, mode };
  if (options?.search_in?.length) {
    params.search_in = options.search_in.join(',');
  }
  if (options?.refine_within?.trim()) {
    params.refine_within = options.refine_within.trim();
  }
  // refine_chain is JSON-encoded (same pattern as filters) so the People sidebar narrows
  // through the IDENTICAL chain as POST /search.
  if (options?.refine_chain?.length) {
    params.refine_chain = JSON.stringify(options.refine_chain);
  }
  // Send the SAME facet filters as POST /search (JSON-encoded) so the People sidebar
  // describes the identical filtered corpus and its totals match the papers list.
  if (options?.filters && Object.keys(options.filters).length > 0) {
    params.filters = JSON.stringify(options.filters);
  }

  const { data } = await searchApiClient.get<AllFacultyForQueryResponse>('/search/faculty-for-query', { params });
  return data;
}
