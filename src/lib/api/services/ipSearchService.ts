import { ipSearchApiClient } from '../apiClient';
import { ENDPOINTS } from '../endpoints';
import type { IPSearchRequest, IPSearchResponse, IPDocument, IPDocumentResponse, IPSearchHealthResponse, IPSuggestResponse, IPAllFacultyForQueryResponse, IPSearchFilters } from '../types';

const EMPTY_IP_SUGGEST: IPSuggestResponse = {
  intent: 'mixed',
  confidence: 0,
  groups: { inventors: [], documents: [], departments: [] },
};

/**
 * Blended IP typeahead: Inventor + Document groups plus predicted intent.
 * AbortController-aware so stale keystrokes can be cancelled.
 */
export async function getIPSuggestions(
  q: string,
  limit: number = 8,
  signal?: AbortSignal
): Promise<IPSuggestResponse> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return EMPTY_IP_SUGGEST;

  const { data } = await ipSearchApiClient.get<IPSuggestResponse>(ENDPOINTS.ip.suggest, {
    params: { q: trimmed, limit },
    signal,
  });
  return data;
}

export async function searchIP(request: IPSearchRequest): Promise<IPSearchResponse> {
  const { data } = await ipSearchApiClient.post<IPSearchResponse>(ENDPOINTS.ip.search, request);
  return data;
}

export async function getIPDocumentById(id: string): Promise<IPDocument> {
  const { data } = await ipSearchApiClient.get<IPDocumentResponse>(ENDPOINTS.ip.document(id));
  return data.document;
}

export async function checkIPSearchHealth(): Promise<IPSearchHealthResponse> {
  const { data } = await ipSearchApiClient.get<IPSearchHealthResponse>(ENDPOINTS.ip.health);
  return data;
}

/**
 * Get all faculty inventors matching a query (OpenSearch aggregation, no documents).
 * Pass the same search_in / refine_chain / filters as POST /ip/search so the People
 * sidebar's total_faculty agrees with the patents list.
 */
export async function getAllIPFacultyForQuery(
  query: string,
  mode: string = 'advanced',
  options?: { search_in?: string[]; refine_chain?: string[] | null; filters?: IPSearchFilters }
): Promise<IPAllFacultyForQueryResponse> {
  const params: Record<string, string> = { query, mode };
  if (options?.search_in?.length) {
    params.search_in = options.search_in.join(',');
  }
  if (options?.refine_chain?.length) {
    params.refine_chain = JSON.stringify(options.refine_chain);
  }
  if (options?.filters && Object.keys(options.filters).length > 0) {
    params.filters = JSON.stringify(options.filters);
  }

  const { data } = await ipSearchApiClient.get<IPAllFacultyForQueryResponse>(ENDPOINTS.ip.facultyForQuery, { params });
  return data;
}
