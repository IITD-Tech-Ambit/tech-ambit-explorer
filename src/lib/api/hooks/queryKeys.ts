
export const queryKeys = {
    magazines: {
        all: ['magazines'] as const,
        lists: () => [...queryKeys.magazines.all, 'list'] as const,
        list: (filters?: { page?: number; limit?: number; status?: string }) => 
            [...queryKeys.magazines.lists(), filters || {}] as const,
        details: () => [...queryKeys.magazines.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.magazines.details(), id] as const,
    },
    
    analytics: {
        all: ['analytics'] as const,
        byContent: (contentId: string) => [...queryKeys.analytics.all, contentId] as const,
    },

    directory: {
        all: ['directory'] as const,
        lists: () => [...queryKeys.directory.all, 'list'] as const,
        list: (filters?: { page?: number; limit?: number; sortBy?: string; order?: string }) =>
            [...queryKeys.directory.lists(), filters || {}] as const,
        details: () => [...queryKeys.directory.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.directory.details(), id] as const,
        byKerberos: (kerberos: string) => [...queryKeys.directory.all, 'kerberos', kerberos] as const,
        researchSummary: (kerberos: string) => [...queryKeys.directory.all, 'researchSummary', kerberos] as const,
        yearPublications: (kerberos: string, year: number) => [...queryKeys.directory.all, 'yearPubs', kerberos, year] as const,
        search: (query: string) => [...queryKeys.directory.all, 'search', query] as const,
        grouped: (category: string) => [...queryKeys.directory.all, 'grouped', category] as const,
        groupSummary: (category: string) => [...queryKeys.directory.all, 'groupSummary', category] as const,
        groupFaculties: (category: string, departmentId: string) =>
            [...queryKeys.directory.all, 'groupFaculties', category, departmentId] as const,
    },

    taxonomy: {
        all: ['taxonomy'] as const,
        departments: () => [...queryKeys.taxonomy.all, 'departments'] as const,
        themes: (department?: string) => [...queryKeys.taxonomy.all, 'themes', department ?? ''] as const,
        domains: (theme?: string, department?: string) =>
            [...queryKeys.taxonomy.all, 'domains', theme ?? '', department ?? ''] as const,
        subdomains: (domain: string, theme?: string, department?: string) =>
            [...queryKeys.taxonomy.all, 'subdomains', domain, theme ?? '', department ?? ''] as const,
        counts: (filters: Record<string, string | undefined>) =>
            [...queryKeys.taxonomy.all, 'counts', filters] as const,
        faculty: (filters: Record<string, string | undefined>, page: number, perPage: number) =>
            [...queryKeys.taxonomy.all, 'faculty', filters, page, perPage] as const,
        facultyCards: (kerberosIds: string[]) =>
            [...queryKeys.taxonomy.all, 'facultyCards', kerberosIds.join(',')] as const,
    },

    search: {
        all: ['search'] as const,
        results: (request: Record<string, unknown>) => [...queryKeys.search.all, 'results', request] as const,
        document: (id: string) => [...queryKeys.search.all, 'document', id] as const,
        authorScoped: (authorId: string, query: string, page: number) => 
            [...queryKeys.search.all, 'authorScoped', authorId, query, page] as const,
        facultyForQuery: (query: string) =>
            [...queryKeys.search.all, 'facultyForQuery', query] as const,
    },
} as const;
