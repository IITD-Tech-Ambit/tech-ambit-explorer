import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getFaculties, getFacultyCoworking, getGroupedFaculties, searchFaculties } from '../services/directoryService';
import type { DirectoryResponse, FacultyCoworkingResponse, GroupedDepartmentsResponse, DirectorySearchResult } from '../types';

export const useDirectorySearch = (
    query: string,
    limit: number = 10,
    options?: Omit<UseQueryOptions<DirectorySearchResult, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DirectorySearchResult, Error> => {
    return useQuery<DirectorySearchResult, Error>({
        queryKey: queryKeys.directory.search(query),
        queryFn: () => searchFaculties(query, limit),
        enabled: query.length >= 2,
        staleTime: 30 * 1000, // 30 seconds
        ...options,
    });
};

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

export const useGroupedFaculties = (
    category: string = 'departments',
    options?: Omit<UseQueryOptions<GroupedDepartmentsResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<GroupedDepartmentsResponse, Error> => {
    return useQuery<GroupedDepartmentsResponse, Error>({
        queryKey: queryKeys.directory.grouped(category),
        queryFn: () => getGroupedFaculties(category),
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
