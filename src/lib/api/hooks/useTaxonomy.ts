import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  getTaxonomyDepartments,
  getTaxonomyThemes,
  getTaxonomyDomains,
  getTaxonomySubdomains,
  getTaxonomyCounts,
  getTaxonomyFaculty,
  getTaxonomyFacultyPapers,
  type TaxonomyBrowseFilters,
} from '../services/taxonomyService';
import { resolveFacultiesByKerberos } from '../services/directoryService';

/**
 * Taxonomy browse hooks. The backend serves precomputed, Redis-cached rollups,
 * so these can cache aggressively client-side too (staleTime 10 min).
 */

const TAXONOMY_STALE_TIME = 10 * 60 * 1000;

export function useTaxonomyDepartments() {
  return useQuery({
    queryKey: queryKeys.taxonomy.departments(),
    queryFn: getTaxonomyDepartments,
    staleTime: TAXONOMY_STALE_TIME,
  });
}

export function useTaxonomyThemes(department?: string) {
  return useQuery({
    queryKey: queryKeys.taxonomy.themes(department),
    queryFn: () => getTaxonomyThemes({ department }),
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useTaxonomyDomains(theme?: string, department?: string) {
  return useQuery({
    queryKey: queryKeys.taxonomy.domains(theme, department),
    queryFn: () => getTaxonomyDomains({ theme, department }),
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useTaxonomySubdomains(domain: string | undefined, theme?: string, department?: string) {
  return useQuery({
    queryKey: queryKeys.taxonomy.subdomains(domain ?? '', theme, department),
    queryFn: () => getTaxonomySubdomains(domain!, { theme, department }),
    enabled: !!domain,
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useTaxonomyCounts(filters: TaxonomyBrowseFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.taxonomy.counts({ ...filters }),
    queryFn: () => getTaxonomyCounts(filters),
    enabled,
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useTaxonomyFaculty(filters: TaxonomyBrowseFilters, page: number, perPage: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.taxonomy.faculty({ ...filters }, page, perPage),
    queryFn: () => getTaxonomyFaculty(filters, page, perPage),
    enabled,
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/**
 * Resolves one page of kerberos ids to full DirectoryFaculty profiles in a
 * single batch round trip. Keyed by the id list so pages/configs are cached
 * independently and revisits are instant.
 */
export function useTaxonomyFacultyCards(kerberosIds: string[]) {
  return useQuery({
    queryKey: queryKeys.taxonomy.facultyCards(kerberosIds),
    queryFn: () => resolveFacultiesByKerberos(kerberosIds),
    enabled: kerberosIds.length > 0,
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/** First page of papers for one faculty under the current browse filters. */
export function useTaxonomyFacultyPapers(
  kerberos: string | undefined,
  filters: Pick<TaxonomyBrowseFilters, 'theme' | 'domain' | 'subdomain'>,
  page = 1,
  perPage = 2,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.taxonomy.facultyPapers(kerberos ?? '', { ...filters }, page, perPage),
    queryFn: () => getTaxonomyFacultyPapers(kerberos!, filters, page, perPage),
    enabled: enabled && !!kerberos,
    staleTime: TAXONOMY_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}
