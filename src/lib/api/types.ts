export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

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

export interface Comment {
    _id: string;
    body: string;
    created_by: string | null;
    ip_address: string;
    createdAt: string;
    updatedAt: string;
}

export interface Like {
    user: string | null;
    ip_address: string;
}

export interface Analytics {
    _id: string;
    content: string;
    likes: Like[];
    comments: Comment[];
    createdAt: string;
    updatedAt: string;
}

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

export interface DirectorySearchResult {
    faculties: DirectoryFaculty[];
    departments: DirectoryDepartment[];
    total: number;
}

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

// IP / Patents — ground truth: SEO-Backend-iitd/src/schemas/ipSearch.js

export interface IPInventor {
    name: string;
    is_faculty: boolean;
    kerberos: string | null;
    faculty_ref: string | null;
    raw_name?: string;
    address?: string;
}

export interface IPDocument {
    _id: string;
    application_number: string;
    title: string;
    abstract?: string;
    type_of_ip: string;
    field_of_invention?: string;
    classification?: string[];
    inventors: IPInventor[];
    applicants: string[];
    country?: string;
    department?: string | null;
    application_status?: string | null;
    publication_year?: number;
    filing_date?: string;
    publication_date?: string;
    open_search_id?: string;
    rerank_score?: number;
    fused_score?: number;
}

export interface IPFacetValue {
    value: string | number;
    count: number;
}

export interface IPSearchFacets {
    years?: IPFacetValue[];
    type_of_ip?: IPFacetValue[];
    field_of_invention?: IPFacetValue[];
    country?: IPFacetValue[];
    classification?: IPFacetValue[];
}

export interface IPRelatedFaculty {
    _id: string;
    name: string;
    email?: string;
    expert_id?: string;
    kerberos?: string | null;
    department: {
        _id: string;
        name: string;
    } | null;
    ipCount: number;
}

export interface IPSearchPagination {
    page: number;
    per_page: number;
    total: number;
    ranked_window?: number;
    total_pages: number;
}

export interface IPSearchResponse {
    results: IPDocument[];
    related_faculty?: IPRelatedFaculty[];
    facets: IPSearchFacets;
    pagination: IPSearchPagination;
    mode?: 'basic' | 'advanced';
    match_tier?: 'phrase' | 'terms';
    suggestions?: string[];
    fuzzy_fallback?: boolean;
    message?: string;
    meta?: {
        took_ms: number;
        cache_hit: boolean;
    };
}

export interface IPSearchFilters {
    year_from?: number;
    year_to?: number;
    type_of_ip?: string;
    type_of_ip_list?: string[];
    field_of_invention?: string;
    classification?: string[];
    department?: string;
    country?: string;
    kerberos?: string;
    primary_inventor_only?: boolean;
}

export type IPSearchInField = 'title' | 'abstract' | 'inventor' | 'field_of_invention' | 'classification';

export interface IPSearchRequest {
    query: string;
    page?: number;
    per_page?: number;
    sort?: 'relevance' | 'date' | 'normalized';
    filters?: IPSearchFilters;
    search_in?: IPSearchInField[];
    mode?: 'basic' | 'advanced';
    refine_within?: string;
    refine_chain?: string[];
    rerank?: boolean;
}

export interface IPDocumentResponse {
    document: IPDocument;
}

export interface IPSearchHealthResponse {
    status: string;
    checks: {
        opensearch: boolean;
        embedding: boolean;
        redis: boolean;
    };
    timestamp: string;
}

// IP typeahead (ip_documents)
export interface SuggestIPInventor {
    id: string;
    name: string;
    is_faculty: boolean;
    kerberos: string;
    score: number;
}

export interface SuggestIPDocument {
    id: string;
    title: string;
    year: number;
    type_of_ip: string;
    lead_inventor: string;
    score: number;
}

export type IPSuggestIntent = 'inventor' | 'document' | 'mixed';

export interface IPSuggestResponse {
    intent: IPSuggestIntent;
    confidence: number;
    groups: {
        inventors: SuggestIPInventor[];
        documents: SuggestIPDocument[];
    };
    meta?: {
        took_ms: number;
        cache_hit: boolean;
    };
}
