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

// Search API Types
export interface SearchAuthor {
    author_name?: string;
    name?: string;
    author_affiliation?: string;
    affiliation?: string;
    author_email?: string;
    author_id?: string;
    matched_profile?: string | null;
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
    reference_count?: number;
    subject_area?: string[];
    link?: string;
    document_scopus_id?: string;
    document_eid?: string;
    open_search_id?: string;
    rerank_score?: number;
}

export interface SearchFacets {
    years?: Array<{ value: number; count: number }>;
    document_types?: Array<{ value: string; count: number }>;
    fields?: Array<{ value: string; count: number }>;
}

export interface SearchPagination {
    page: number;
    per_page: number;
    // True full count of matching papers (track_total_hits) — the headline figure.
    total: number;
    // Number of top candidates cross-encoder reranked (transparency only). Pages within this
    // window are reranked; deeper pages are paginated in raw hybrid-score order. This does NOT
    // bound navigation.
    ranked_window?: number;
    // Derived from the true `total` (so the page count agrees with the headline), clamped only
    // to the deepest page servable within OpenSearch's max_result_window.
    total_pages: number;
}

export interface RelatedFaculty {
    _id: string;
    name: string;
    email: string;
    expert_id?: string;
    department: {
        _id: string;
        name: string;
    } | null;
    paperCount: number;
}

export interface SearchResponse {
    results: SearchDocument[];
    related_faculty?: RelatedFaculty[];
    suggestions?: string[];
    facets: SearchFacets;
    pagination: SearchPagination;
    mode?: 'basic' | 'advanced';
    meta?: {
        took_ms: number;
        cache_hit: boolean;
    };
    message?: string;
    fuzzy_fallback?: boolean;
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
    mode?: 'basic' | 'advanced';
    /** Legacy single-step refinement. Prefer refine_chain for multi-step narrowing. */
    refine_within?: string;
    /** Ordered prior queries (oldest first); each narrows the result set as a strict lexical filter. */
    refine_chain?: string[];
}

// Suggest / Typeahead Types
export interface SuggestAuthor {
    id: string;
    scopus_id: string;
    name: string;
    department: string;
    image_url: string;
    score: number;
}

export interface SuggestPaper {
    id: string;
    title: string;
    year: number;
    lead_author: string;
    score: number;
}

export type SuggestIntent = 'author' | 'paper' | 'mixed';

export interface SuggestResponse {
    intent: SuggestIntent;
    confidence: number;
    groups: {
        authors: SuggestAuthor[];
        papers: SuggestPaper[];
    };
    meta?: {
        took_ms: number;
        cache_hit: boolean;
    };
}

// Directory/Faculty Types
export interface DirectoryDepartment {
    _id: string;
    name: string;
    code: string;
    category?: string;
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
    googleScholarId?: string;
    department: DirectoryDepartment | null;
    tags?: string[];
    profileImageUrl?: string | null;
    designation?: string | null;
    workingFromYear?: number | null;
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

// Directory search response
export interface DirectorySearchResult {
    faculties: DirectoryFaculty[];
    departments: DirectoryDepartment[];
    total: number;
}

// Grouped departments response
export interface GroupedDepartmentFaculty {
    _id: string;
    name: string;
    email: string;
    citationCount: number;
    hIndex: number;
    research_areas: string[];
    orcId?: string;
    scopusId?: string;
    googleScholarId?: string;
    profileImageUrl?: string | null;
    designation?: string | null;
    workingFromYear?: number | null;
}

export interface GroupedDepartment {
    _id: string;
    department: DirectoryDepartment;
    faculties?: GroupedDepartmentFaculty[];
    stats: {
        totalFaculty: number;
        avgHIndex?: number;
    };
}

export interface GroupedDepartmentsResponse {
    departments: GroupedDepartment[];
    totalDepartments: number;
    totalFaculty: number;
}

export interface DepartmentGroupFacultiesResponse {
    faculties: GroupedDepartmentFaculty[];
}

// Research Summary types (lean kerberos-keyed APIs)

export interface TimelinePaperAuthor {
    name: string;
    author_id: string;
    matched_profile: string | null;
}

export interface TimelinePaper {
    title: string;
    type: string;
    citations: number;
    link: string | null;
    document_scopus_id: string | null;
    authors: TimelinePaperAuthor[];
}

export interface TimelineYear {
    year: number;
    count: number;
    papers: TimelinePaper[];
}

export interface FacultyResearchSummary {
    faculty: {
        name: string;
        _id: string;
    };
    source: 'scopus' | 'scholar';
    hIndex: number;
    citationCount: number;
    scopusId?: string;
    stats: { totalPapers: number; totalYears: number };
    timeline: TimelineYear[];
    yearOffset: number;
    yearLimit: number;
}

export interface YearPublicationsResponse {
    year: number;
    total: number;
    papers: TimelinePaper[];
    skip: number;
    limit: number;
}

// Author-Scoped Search Types
export interface AuthorScopedSearchRequest {
    query: string;
    author_id: string;
    page?: number;
    per_page?: number;
    mode?: 'basic' | 'advanced';
    /** Legacy single-step refinement. Prefer refine_chain for multi-step narrowing. */
    refine_within?: string;
    /** Ordered prior queries (oldest first); each narrows within this author's papers. */
    refine_chain?: string[];
    /** Same as main search: restrict matching to these fields (e.g. author = author names only). */
    search_in?: Array<'title' | 'abstract' | 'author' | 'subject_area' | 'field'>;
    /** Same facet filters as POST /search so the drill-down count matches the sidebar per-faculty count. */
    filters?: SearchFilters;
}

export interface AuthorScopedSearchResponse {
    results: (SearchDocument & { similarity_score?: number })[];
    author: {
        name: string;
        author_id: string;
        total_papers: number;
    };
    pagination: SearchPagination;
    cacheHit?: boolean;
}

export interface FacultyForQueryDepartment {
    name: string;
    faculty: {
        name: string;
        author_id: string;
        paper_count: number;
    }[];
    total_paper_count: number;
}

export interface AllFacultyForQueryResponse {
    departments: FacultyForQueryDepartment[];
    total_faculty: number;
    total_matching_papers: number;
    cacheHit?: boolean;
    meta?: {
        took_ms: number;
        cache_hit: boolean;
    };
}
