// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

// Magazine/Content Types
export interface Magazine {
    _id: string;
    title: string;
    subtitle: string;
    image_url: string;
    body: string;
    est_read_time: number;
    status: 'pending' | 'online' | 'archived';
    created_by: {
        _id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
    // Analytics data (included in detail view)
    comments?: Comment[];
    likesCount?: number;
    commentsCount?: number;
}

// Comment Types
export interface Comment {
    _id: string;
    body: string;
    created_by: string | null;
    ip_address: string;
    createdAt: string;
    updatedAt: string;
}

// Like Types
export interface Like {
    user: string | null;
    ip_address: string;
}

// Analytics Types
export interface Analytics {
    _id: string;
    content: string;
    likes: Like[];
    comments: Comment[];
    createdAt: string;
    updatedAt: string;
}

// Pagination Types
export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface PaginatedMagazinesResponse {
    magazines: Magazine[];
    pagination: Pagination;
}

// Request Types
export interface LikeRequest {
    contentId: string;
}

export interface CommentRequest {
    contentId: string;
    body: string;
}

export interface DeleteCommentRequest {
    contentId: string;
    commentId: string;
}

// Thesis/Mind Map Types
export interface DepartmentCollection {
    _id: string;
    name: string;
}

export interface Faculty {
    _id: string;
    name: string;
}

export interface PhdThesisData {
    _id: string;
    title: string;
    contributor: {
        advisor: {
            matched_profile: string | null;
            name: string;
        };
        author: string;
    };
    department_code: string;
    department_name: string;
    document_id: string;
    document_type: string;
    field_associated: string;
    link: string;
    open_search_id: string;
    publication_year: number | null;
    subject_area: string[];
}

export interface ResearchData {
    _id: string;
    title: string;
    abstract: string;
    authors: Array<{
        _id: string;
        author_affiliation: string;
        author_avaialable_names: string[];
        author_eid: string;
        author_email: string;
        author_id: string;
        author_name: string;
        author_orcid: string;
        author_position: string;
        matched_profile?: string;
    }>;
    citation_count: number;
    document_eid: string;
    document_scopus_id: string;
    document_type: string;
    field_associated: string;
    link: string;
    open_search_id: string;
    publication_year: number;
    reference_count: number;
    subject_area: string[];
}

export interface OpenPathResponse {
    project_type: 'PHD Thesis' | 'Research';
    faculty_id: string;
    department_id: string;
    category: 'Departments' | 'Schools' | 'Centres';
    doc_id: string | null;
}

export interface ThesisData {
    id: number;
    collection: string;
    dc_contributor_advisor: string;
    dc_contributor_author: string;
    dc_title: string;
    dc_date_issued: string;
    dc_subject: string;
    dc_type: string;
    dc_identifier_uri?: string;
    dc_publisher?: string;
    dc_language_iso?: string;
}

// Search API Types
export interface SearchAuthor {
    author_name?: string;
    name?: string;
    author_affiliation?: string;
    affiliation?: string;
    author_email?: string;
    author_id?: string;
}

export interface SearchDocument {
    _id: string;
    title: string;
    abstract?: string;
    authors: SearchAuthor[];
    publication_year: number;
    document_type: string;
    field_associated?: string;
    citation_count?: number;
    subject_area?: string[];
    link?: string;
}

export interface SearchFacets {
    years?: Array<{ value: number; count: number }>;
    document_types?: Array<{ value: string; count: number }>;
    fields?: Array<{ value: string; count: number }>;
}

export interface SearchPagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

export interface RelatedFaculty {
    _id: string;
    name: string;
    email: string;
    department: {
        _id: string;
        name: string;
    } | null;
    paperCount: number;
}

export interface SearchResponse {
    results: SearchDocument[];
    related_faculty?: RelatedFaculty[];
    facets: SearchFacets;
    pagination: SearchPagination;
    cacheHit?: boolean;
}

export interface SearchFilters {
    year_from?: number;
    year_to?: number;
    field_associated?: string;
    document_type?: string;
    subject_area?: string[];
    author_id?: string;
    affiliation?: string;
    first_author_only?: boolean;
    interdisciplinary?: boolean;
}

export interface SearchRequest {
    query: string;
    page?: number;
    per_page?: number;
    sort?: 'relevance' | 'date' | 'citations' | 'impact' | 'normalized';
    filters?: SearchFilters;
    search_in?: Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'>;
}

// Directory/Faculty Types
export interface DirectoryDepartment {
    _id: string;
    name: string;
    code: string;
}

export interface DirectoryFaculty {
    _id: string;
    name: string;
    email: string;
    citationCount: number;
    hIndex: number;
    research_areas: string[];
    orcId?: string;
    scopusId?: string;
    department: DirectoryDepartment;
}

export interface DirectoryPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface DirectoryResponse {
    data: DirectoryFaculty[];
    pagination: DirectoryPagination;
}

export interface Coworker {
    title: string;
    publication_year: number;
    document_type: string;
    subject_area: string[];
    name: string;
    affiliation: string;
    author_id: string;
    matched_profile: string | null;
}

export interface SupervisedStudent {
    name: string;
    affiliation: string;
    thesis_title: string;
    year: number;
}

export interface FacultyCoworkingStats {
    totalPapers: number;
    uniqueCoauthors: number;
    totalStudentsSupervised: number;
}

export interface FacultyCoworkingResponse {
    faculty: {
        name: string;
        _id: string;
    };
    hIndex: number;
    citationCount: number;
    scopusId?: string;
    coworkersFromPapers: Coworker[];
    studentsSupervised: SupervisedStudent[];
    stats: FacultyCoworkingStats;
}
