import axios from 'axios';

// API base URL - change this to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types for content/magazines
export interface Magazine {
    _id: string;
    title: string;
    subtitle: string;
    image_url: string;
    body: string;
    est_read_time: number;
    status: 'pending' | 'online' | 'archived';
    created_by: string;
    createdAt: string;
    updatedAt: string;
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

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

// NEW: Pagination types for server-side pagination
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

// Fetch all magazines/content
export const fetchAllMagazines = async (): Promise<Magazine[]> => {
    const response = await api.get<ApiResponse<Magazine[]>>('/content');
    return response.data.data;
};

// Fetch only online magazines (filtered client-side)
export const fetchOnlineMagazines = async (): Promise<Magazine[]> => {
    const allMagazines = await fetchAllMagazines();
    return allMagazines.filter(magazine => magazine.status === 'online');
};

// NEW: Fetch paginated magazines from server (loads only required magazines)
export const fetchPaginatedMagazines = async (
    page: number = 1,
    limit: number = 9,
    status?: 'online' | 'pending' | 'archived'
): Promise<PaginatedMagazinesResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) {
        params.append('status', status);
    }
    const response = await api.get<ApiResponse<PaginatedMagazinesResponse>>(`/content/paginated?${params.toString()}`);
    return response.data.data;
};

// Fetch single magazine by ID
export const fetchMagazineById = async (id: string): Promise<Magazine> => {
    const response = await api.get<ApiResponse<Magazine>>(`/content/${id}`);
    return response.data.data;
};

// Like a magazine/content (POST /api/content/like)
export const likeMagazine = async (contentId: string): Promise<Analytics> => {
    const response = await api.post<ApiResponse<Analytics>>('/content/like', { contentId });
    return response.data.data;
};

// Unlike/Dislike a magazine/content (POST /api/content/dislike)
export const dislikeMagazine = async (contentId: string): Promise<Analytics> => {
    const response = await api.post<ApiResponse<Analytics>>('/content/dislike', { contentId });
    return response.data.data;
};

// Add comment on a magazine/content (POST /api/content/comment)
export const addComment = async (contentId: string, body: string): Promise<Comment> => {
    const response = await api.post<ApiResponse<Comment>>('/content/comment', { contentId, body });
    return response.data.data;
};

// Delete comment from a magazine/content (POST /api/content/uncomment)
export const deleteComment = async (contentId: string, commentId: string): Promise<void> => {
    await api.post('/content/uncomment', { contentId, commentId });
};

export default api;

