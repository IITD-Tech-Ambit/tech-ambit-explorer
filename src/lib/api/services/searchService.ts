import type { SearchRequest, SearchResponse, SearchDocument, AuthorScopedSearchRequest, AuthorScopedSearchResponse, AllFacultyForQueryResponse } from '../types';

const SEARCH_API_BASE_URL = import.meta.env.VITE_SEARCH_API_URL || 'http://localhost:3001/api/v1';

/** 
 * Perform a hybrid search using BM25 + SPECTER2 semantic embeddings
 */
export async function searchResearch(request: SearchRequest): Promise<SearchResponse> {
  const response = await fetch(`${SEARCH_API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Author-scoped search: semantic similarity within one author's papers
 */
export async function authorScopedSearch(request: AuthorScopedSearchRequest): Promise<AuthorScopedSearchResponse> {
  const response = await fetch(`${SEARCH_API_BASE_URL}/search/author-scope`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Author-scoped search failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a single research document by ID
 */
export async function getDocumentById(id: string): Promise<SearchDocument> {
  const response = await fetch(`${SEARCH_API_BASE_URL}/document/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  const data = await response.json();
  return data.document;
}

/**
 * Get documents by author (Scopus Author ID)
 */
export async function getDocumentsByAuthor(
  authorId: string,
  page: number = 1,
  perPage: number = 20
): Promise<SearchResponse> {
  const response = await fetch(
    `${SEARCH_API_BASE_URL}/documents/by-author/${authorId}?page=${page}&per_page=${perPage}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch author documents: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check search service health
 */
export async function checkSearchHealth(): Promise<{
  status: string;
  services: {
    opensearch: string;
    embedding: string;
    redis: string;
  };
}> {
  const response = await fetch(`${SEARCH_API_BASE_URL}/search/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all faculty matching a query (OpenSearch aggregation, no documents).
 * Pass the same search_in / refine_within as POST /search so the People sidebar matches the main search.
 */
export async function getAllFacultyForQuery(
  query: string,
  mode: string = 'advanced',
  options?: { search_in?: string[]; refine_within?: string | null }
): Promise<AllFacultyForQueryResponse> {
  const params = new URLSearchParams();
  params.set('query', query);
  params.set('mode', mode);
  if (options?.search_in?.length) {
    params.set('search_in', options.search_in.join(','));
  }
  if (options?.refine_within?.trim()) {
    params.set('refine_within', options.refine_within.trim());
  }

  const response = await fetch(`${SEARCH_API_BASE_URL}/search/faculty-for-query?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Faculty for query failed: ${response.statusText}`);
  }

  return response.json();
}
