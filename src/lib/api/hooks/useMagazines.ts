import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { 
    getPaginatedMagazines, 
    getMagazineById 
} from '../services/magazineService';
import type { Magazine, PaginatedMagazinesResponse } from '../types';

/**
 * Custom React Query hooks for magazine operations
 */

// Hook to fetch paginated magazines
export const usePaginatedMagazines = (
    page: number = 1,
    limit: number = 9,
    status?: 'online' | 'pending' | 'archived',
    options?: Omit<UseQueryOptions<PaginatedMagazinesResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedMagazinesResponse, Error> => {
    return useQuery<PaginatedMagazinesResponse, Error>({
        queryKey: queryKeys.magazines.list({ page, limit, status }),
        queryFn: () => getPaginatedMagazines(page, limit, status),
        staleTime: 3 * 60 * 1000, // 3 minutes
        ...options,
    });
};

// Hook to fetch a single magazine by ID
export const useMagazine = (
    id: string,
    options?: Omit<UseQueryOptions<Magazine, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Magazine, Error> => {
    return useQuery<Magazine, Error>({
        queryKey: queryKeys.magazines.detail(id),
        queryFn: () => getMagazineById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};
