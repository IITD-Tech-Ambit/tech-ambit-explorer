import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getFaculties, getFacultyById, getFacultyByKerberos, getFacultyResearchSummary, getFacultyYearPublications, getGroupedFaculties, getDepartmentGroupsSummary, getDepartmentGroupFaculties, searchFaculties } from '../services/directoryService';
import type { DirectoryFaculty, DirectoryResponse, FacultyResearchSummary, YearPublicationsResponse, GroupedDepartmentsResponse, DepartmentGroupFacultiesResponse, DirectorySearchResult } from '../types';

export const useDirectorySearch = (
    query: string,
    limit: number = 10,
    options?: Omit<UseQueryOptions<DirectorySearchResult, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DirectorySearchResult, Error> => {
    return useQuery<DirectorySearchResult, Error>({
        queryKey: queryKeys.directory.search(query),
        queryFn: () => searchFaculties(query, limit),
        enabled: query.length >= 2,
        staleTime: 30 * 1000,
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

export const useDepartmentGroupsSummary = (
    category: string = 'departments',
    options?: Omit<UseQueryOptions<GroupedDepartmentsResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<GroupedDepartmentsResponse, Error> => {
    return useQuery<GroupedDepartmentsResponse, Error>({
        queryKey: queryKeys.directory.groupSummary(category),
        queryFn: () => getDepartmentGroupsSummary(category),
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useDepartmentGroupFaculties = (
    category: string,
    departmentId: string,
    options?: Omit<UseQueryOptions<DepartmentGroupFacultiesResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DepartmentGroupFacultiesResponse, Error> => {
    return useQuery<DepartmentGroupFacultiesResponse, Error>({
        queryKey: queryKeys.directory.groupFaculties(category, departmentId),
        queryFn: () => getDepartmentGroupFaculties(category, departmentId),
        enabled: !!category && !!departmentId,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useFacultyById = (
    id: string,
    options?: Omit<UseQueryOptions<DirectoryFaculty, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DirectoryFaculty, Error> => {
    return useQuery<DirectoryFaculty, Error>({
        queryKey: queryKeys.directory.detail(id),
        queryFn: () => getFacultyById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useFacultyByKerberos = (
    kerberos: string,
    options?: Omit<UseQueryOptions<DirectoryFaculty, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<DirectoryFaculty, Error> => {
    return useQuery<DirectoryFaculty, Error>({
        queryKey: queryKeys.directory.byKerberos(kerberos),
        queryFn: () => getFacultyByKerberos(kerberos),
        enabled: !!kerberos,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useFacultyResearchSummary = (
    kerberos: string,
    options?: Omit<UseQueryOptions<FacultyResearchSummary, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<FacultyResearchSummary, Error> => {
    return useQuery<FacultyResearchSummary, Error>({
        queryKey: queryKeys.directory.researchSummary(kerberos),
        queryFn: () => getFacultyResearchSummary(kerberos),
        enabled: !!kerberos,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

export const useFacultyYearPublications = (
    kerberos: string,
    year: number,
    options?: Omit<UseQueryOptions<YearPublicationsResponse, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<YearPublicationsResponse, Error> => {
    return useQuery<YearPublicationsResponse, Error>({
        queryKey: queryKeys.directory.yearPublications(kerberos, year),
        queryFn: () => getFacultyYearPublications(kerberos, year, 3),
        enabled: false,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};
