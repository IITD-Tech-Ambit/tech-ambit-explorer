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
    collection_id: string;
    department_name: string;
    handle: string;
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

export interface SearchResponse {
    results: SearchDocument[];
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
