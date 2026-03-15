import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';
import type { 
    Analytics, 
    Comment, 
    ApiResponse,
    LikeRequest,
    CommentRequest,
    DeleteCommentRequest
} from '../types';

/**
 * Analytics Service
 * Handles all analytics-related API calls (likes, comments)
 */

// Like a magazine/content
export const likeMagazine = async (contentId: string): Promise<Analytics> => {
    const payload: LikeRequest = { contentId };
    const response = await apiClient.post<ApiResponse<Analytics>>(
        ENDPOINTS.analytics.like,
        payload
    );
    return response.data.data;
};

// Dislike/Unlike a magazine/content
export const dislikeMagazine = async (contentId: string): Promise<Analytics> => {
    const payload: LikeRequest = { contentId };
    const response = await apiClient.post<ApiResponse<Analytics>>(
        ENDPOINTS.analytics.dislike,
        payload
    );
    return response.data.data;
};

// Add a comment to a magazine/content
export const addComment = async (contentId: string, body: string): Promise<Comment> => {
    const payload: CommentRequest = { contentId, body };
    const response = await apiClient.post<ApiResponse<Comment>>(
        ENDPOINTS.analytics.comment,
        payload
    );
    return response.data.data;
};

// Delete a comment from a magazine/content
export const deleteComment = async (contentId: string, commentId: string): Promise<void> => {
    const payload: DeleteCommentRequest = { contentId, commentId };
    await apiClient.post(ENDPOINTS.analytics.deleteComment, payload);
};
