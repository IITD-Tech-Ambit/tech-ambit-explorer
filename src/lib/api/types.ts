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
