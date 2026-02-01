import type { DirectoryResponse, DirectoryFaculty, FacultyCoworkingResponse } from '../types';

const API_BASE_URL = 'http://localhost:3002/api/directory';

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

export const getFacultyById = async (id: string): Promise<DirectoryFaculty> => {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch faculty');
    return data.data;
};

export const getFacultyCoworking = async (id: string): Promise<FacultyCoworkingResponse> => {
    const response = await fetch(`${API_BASE_URL}/coworkers/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch faculty coworking data');
    return data.data;
};
