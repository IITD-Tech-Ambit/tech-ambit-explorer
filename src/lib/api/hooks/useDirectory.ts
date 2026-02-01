import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getFaculties, getFacultyCoworking } from '../services/directoryService';
import type { DirectoryResponse, FacultyCoworkingResponse } from '../types';

export const useFaculties = (
    page: number = 1,
    limit: number = 9,
    sortBy: string = 'hIndex',
    order: string = 'desc',
    options?: Omit<UseQueryOptions<DirectoryResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DirectoryResponse, Error> => {
    return useQuery<DirectoryResponse, Error>({
        queryKey: queryKeys.directory.list({ page, limit, sortBy, order }),
        queryFn: () => getFaculties(page, limit, sortBy, order),
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useFacultyCoworking = (
    id: string,
    options?: Omit<UseQueryOptions<FacultyCoworkingResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<FacultyCoworkingResponse, Error> => {
    return useQuery<FacultyCoworkingResponse, Error>({
        queryKey: queryKeys.directory.coworking(id),
        queryFn: () => getFacultyCoworking(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
