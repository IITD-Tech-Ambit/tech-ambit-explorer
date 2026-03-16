import apiClient from '../apiClient';
import { ENDPOINTS, buildUrl } from '../endpoints';
import type { 
    Magazine, 
    PaginatedMagazinesResponse, 
    ApiResponse 
} from '../types';

/**
 * Magazine Service
 * Handles all magazine/content-related API calls
 */

// Fetch paginated magazines
export const getPaginatedMagazines = async (
    page: number = 1,
    limit: number = 9,
    status?: 'online' | 'pending' | 'archived'
): Promise<PaginatedMagazinesResponse> => {
    const params: Record<string, string | number> = {
        page,
        limit,
    };
    
    if (status) {
        params.status = status;
    }
    
    const url = buildUrl(ENDPOINTS.content.getPaginated, params);
    const response = await apiClient.get<ApiResponse<PaginatedMagazinesResponse>>(url);
    return response.data.data;
};

// Fetch single magazine by ID
export const getMagazineById = async (id: string): Promise<Magazine> => {
    const response = await apiClient.get<ApiResponse<Magazine>>(ENDPOINTS.content.getById(id));
    return response.data.data;
};
