/**
 * Taxonomy Browse API (opensearch backend, /api/v1/taxonomy/*).
 *
 * Browse state is a freely combinable filter set: theme / domain / subdomain
 * (slugs) and department (code). The faculty endpoint returns ONLY kerberos
 * IDs — cards are resolved through the directory API (resolveFacultiesByKerberos).
 */

import { searchApiClient } from '../apiClient';

export interface TaxonomyMeta {
  took_ms: number;
  cache_hit: boolean;
}

export interface TaxonomyNode {
  id: string;
  name: string;
  slug: string;
  paper_count: number;
  faculty_count: number;
  subdomain_count?: number;
}

export interface TaxonomyDepartment {
  id: string;
  name: string;
  code: string;
}

/** Ranked greatest-to-least by paper_count, ties broken by faculty_count — the
 * consistent ordering for every taxonomy node list in the browse UI. */
export function rankByPaperCount<T extends TaxonomyNode>(nodes: T[] | undefined): T[] | undefined {
  if (!nodes) return nodes;
  return [...nodes].sort((a, b) => b.paper_count - a.paper_count || b.faculty_count - a.faculty_count);
}

export interface TaxonomyBrowseFilters {
  theme?: string;
  domain?: string;
  subdomain?: string;
  department?: string;
}

export interface TaxonomyPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface TaxonomyFacultyResponse {
  kerberos_list: string[];
  faculty_total: number;
  pagination: TaxonomyPagination;
  meta: TaxonomyMeta;
}

export interface TaxonomyCountsResponse {
  paper_count: number;
  faculty_count: number;
  meta: TaxonomyMeta;
}

function buildParams(filters: TaxonomyBrowseFilters, extra: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params;
}

async function getJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const { data } = await searchApiClient.get<T>(path, { params });
  return data;
}

export const getTaxonomyDepartments = () =>
  getJson<{ departments: TaxonomyDepartment[]; meta: TaxonomyMeta }>('/taxonomy/departments');

export const getTaxonomyThemes = (filters: Pick<TaxonomyBrowseFilters, 'department'>) =>
  getJson<{ themes: TaxonomyNode[]; meta: TaxonomyMeta }>('/taxonomy/themes', buildParams(filters));

export const getTaxonomyDomains = (filters: Pick<TaxonomyBrowseFilters, 'theme' | 'department'>) =>
  getJson<{ domains: TaxonomyNode[]; meta: TaxonomyMeta }>('/taxonomy/domains', buildParams(filters));

export const getTaxonomySubdomains = (
  domainSlug: string,
  filters: Pick<TaxonomyBrowseFilters, 'theme' | 'department'>
) =>
  getJson<{ domain: { id: string; name: string; slug: string }; subdomains: TaxonomyNode[]; meta: TaxonomyMeta }>(
    `/taxonomy/domains/${encodeURIComponent(domainSlug)}/subdomains`,
    buildParams(filters)
  );

export const getTaxonomyCounts = (filters: TaxonomyBrowseFilters) =>
  getJson<TaxonomyCountsResponse>('/taxonomy/counts', buildParams(filters));

export const getTaxonomyFaculty = (filters: TaxonomyBrowseFilters, page: number, perPage: number) =>
  getJson<TaxonomyFacultyResponse>(
    '/taxonomy/faculty',
    buildParams(filters, { page, per_page: perPage })
  );
