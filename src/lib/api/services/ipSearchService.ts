import { ipSearchApiClient } from '../apiClient';
import { ENDPOINTS } from '../endpoints';
import type { IPSearchRequest, IPSearchResponse, IPDocument, IPDocumentResponse, IPSearchHealthResponse, IPSuggestResponse } from '../types';

const EMPTY_IP_SUGGEST: IPSuggestResponse = {
  intent: 'mixed',
  confidence: 0,
  groups: { inventors: [], documents: [] },
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
