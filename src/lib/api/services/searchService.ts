import type { SearchRequest, SearchResponse, SearchDocument } from '../types';

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

  const data = await response.json();

  // DEBUG: Log raw API response to check department data
  console.log('Raw API response related_faculty:', JSON.stringify(data.related_faculty?.slice(0, 2), null, 2));

  return data;
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
