import apiClient from '../apiClient';
import type { DirectoryResponse, DirectoryFaculty, FacultyResearchSummary, YearPublicationsResponse, GroupedDepartmentsResponse, DepartmentGroupFacultiesResponse, DirectorySearchResult } from '../types';

interface ApiEnvelope<T> {
    success: boolean;
    message?: string;
    data: T;
}

/** Unwrap the { success, data, message } envelope every endpoint here returns. */
async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>, fallbackError: string): Promise<T> {
    const { data } = await request;
    if (!data.success) throw new Error(data.message || fallbackError);
    return data.data;
}

export const searchFaculties = (query: string, limit: number = 10): Promise<DirectorySearchResult> =>
    unwrap(apiClient.get('/directory/search', { params: { q: query, limit } }), 'Search failed');

export const getFaculties = (
    page: number = 1,
    limit: number = 9,
    sortBy: string = 'hIndex',
    order: string = 'desc'
): Promise<DirectoryResponse> =>
    unwrap(apiClient.get('/directory', { params: { page, limit, sortBy, order } }), 'Failed to fetch faculties');

export const getGroupedFaculties = (category: string = 'departments'): Promise<GroupedDepartmentsResponse> =>
    unwrap(apiClient.get('/directory/grouped', { params: { category } }), 'Failed to fetch grouped faculties');

export const getDepartmentGroupsSummary = (category: string = 'departments'): Promise<GroupedDepartmentsResponse> =>
    unwrap(apiClient.get('/directory/grouped', { params: { category, summaryOnly: 'true' } }), 'Failed to fetch department groups');

export const getDepartmentGroupFaculties = (
    category: string,
    departmentId: string
): Promise<DepartmentGroupFacultiesResponse> =>
    unwrap(apiClient.get(`/directory/grouped/${departmentId}/faculties`, { params: { category } }), 'Failed to fetch department faculties');

export const getFacultyById = (id: string): Promise<DirectoryFaculty> =>
    unwrap(apiClient.get(`/directory/${id}`), 'Failed to fetch faculty');

export const getFacultyByKerberos = (kerberos: string): Promise<DirectoryFaculty> =>
    unwrap(apiClient.get(`/directory/faculty/${encodeURIComponent(kerberos)}/profile`), 'Failed to fetch faculty');

/** Resolve directory profile by Scopus author id (paper authors[].author_id). */
export const getFacultyByScopusId = (scopusId: string): Promise<DirectoryFaculty> =>
    unwrap(apiClient.get(`/directory/by-scopus/${encodeURIComponent(scopusId)}`), 'Failed to fetch faculty');

/**
 * Batch-resolve Scopus author ids → IITD Faculty. Only ids matching an IITD
 * Faculty profile are present in the returned map; missing ids indicate a
 * non-IITD (external) author.
 */
export const resolveFacultiesByScopusIds = async (
    scopusIds: string[]
): Promise<Record<string, DirectoryFaculty>> => {
    const ids = [...new Set((scopusIds || []).filter((id) => typeof id === 'string' && id.trim().length > 0))];
    if (ids.length === 0) return {};
    const result = await unwrap<{ matches?: Record<string, DirectoryFaculty> }>(
        apiClient.post('/directory/by-scopus/batch', { scopusIds: ids }),
        'Failed to resolve IITD faculty'
    );
    return result?.matches || {};
};

/**
 * Batch-resolve kerberos ids → IITD Faculty profiles (one round trip for a
 * page of faculty cards, e.g. taxonomy browse results).
 */
export const resolveFacultiesByKerberos = async (
    kerberosIds: string[]
): Promise<Record<string, DirectoryFaculty>> => {
    const ids = [...new Set((kerberosIds || []).filter((id) => typeof id === 'string' && id.trim().length > 0))];
    if (ids.length === 0) return {};
    const result = await unwrap<{ matches?: Record<string, DirectoryFaculty> }>(
        apiClient.post('/directory/by-kerberos/batch', { kerberosIds: ids }),
        'Failed to resolve IITD faculty'
    );
    return result?.matches || {};
};

export const getFacultyResearchSummary = (
    kerberos: string,
    yearOffset: number = 0,
    yearLimit: number = 5
): Promise<FacultyResearchSummary> =>
    unwrap(
        apiClient.get(`/directory/faculty/${encodeURIComponent(kerberos)}/research-summary`, { params: { yearOffset, yearLimit } }),
        'Failed to fetch research summary'
    );

export const getFacultyYearPublications = (
    kerberos: string,
    year: number,
    skip: number = 0,
    limit: number = 20
): Promise<YearPublicationsResponse> =>
    unwrap(
        apiClient.get(`/directory/faculty/${encodeURIComponent(kerberos)}/publications`, { params: { year, skip, limit } }),
        'Failed to fetch year publications'
    );
