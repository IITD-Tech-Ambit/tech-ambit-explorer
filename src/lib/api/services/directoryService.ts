import type { DirectoryResponse, DirectoryFaculty, FacultyCoworkingResponse, GroupedDepartmentsResponse, DirectorySearchResult } from '../types';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/directory`;

export const searchFaculties = async (
    query: string,
    limit: number = 10
): Promise<DirectorySearchResult> => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    const data = await response.json();
    if (!data.success) throw new Error('Search failed');
    return data.data;
};

export const getFaculties = async (
    page: number = 1,
    limit: number = 9,
    sortBy: string = 'hIndex',
    order: string = 'desc'
): Promise<DirectoryResponse> => {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        order
    });
    const response = await fetch(`${API_BASE_URL}?${params}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch faculties');
    return data.data;
};

export const getGroupedFaculties = async (
    category: string = 'departments'
): Promise<GroupedDepartmentsResponse> => {
    const params = new URLSearchParams({ category });
    const response = await fetch(`${API_BASE_URL}/grouped?${params}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch grouped faculties');
    return data.data;
};

export const getFacultyById = async (id: string): Promise<DirectoryFaculty> => {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch faculty');
    return data.data;
};

/** Resolve directory profile by Scopus author id (paper authors[].author_id). */
export const getFacultyByScopusId = async (scopusId: string): Promise<DirectoryFaculty> => {
    const response = await fetch(`${API_BASE_URL}/by-scopus/${encodeURIComponent(scopusId)}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch faculty');
    return data.data;
};

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
    const response = await fetch(`${API_BASE_URL}/by-scopus/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopusIds: ids }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to resolve IITD faculty');
    return (data.data?.matches || {}) as Record<string, DirectoryFaculty>;
};

export const getFacultyCoworking = async (id: string): Promise<FacultyCoworkingResponse> => {
    const response = await fetch(`${API_BASE_URL}/coworkers/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch faculty coworking data');
    return data.data;
};
