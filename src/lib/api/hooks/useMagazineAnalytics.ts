import { useMutation, useQueryClient, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { 
    likeMagazine, 
    dislikeMagazine, 
    addComment, 
    deleteComment 
} from '../services/analyticsService';
import type { Analytics, Comment } from '../types';

/**
 * Custom React Query mutation hooks for analytics operations
 */

// Hook to like a magazine
export const useLikeMagazine = (
    options?: Omit<UseMutationOptions<Analytics, Error, string>, 'mutationFn'>
): UseMutationResult<Analytics, Error, string> => {
    const queryClient = useQueryClient();
    
    return useMutation<Analytics, Error, string>({
        mutationFn: likeMagazine,
        onSuccess: (data, contentId) => {
            // Invalidate magazine detail query to refetch with updated likes
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(contentId)
            });
        },
        ...options,
    });
};

// Hook to dislike/unlike a magazine
export const useDislikeMagazine = (
    options?: Omit<UseMutationOptions<Analytics, Error, string>, 'mutationFn'>
): UseMutationResult<Analytics, Error, string> => {
    const queryClient = useQueryClient();
    
    return useMutation<Analytics, Error, string>({
        mutationFn: dislikeMagazine,
        onSuccess: (data, contentId) => {
            // Invalidate magazine detail query to refetch with updated likes
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(contentId)
            });
        },
        ...options,
    });
};

// Hook to add a comment
interface AddCommentVariables {
    contentId: string;
    body: string;
}

export const useAddComment = (
    options?: Omit<UseMutationOptions<Comment, Error, AddCommentVariables>, 'mutationFn'>
): UseMutationResult<Comment, Error, AddCommentVariables> => {
    const queryClient = useQueryClient();
    
    return useMutation<Comment, Error, AddCommentVariables>({
        mutationFn: ({ contentId, body }) => addComment(contentId, body),
        onSuccess: (data, variables) => {
            // Invalidate magazine detail query to refetch with updated comments
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(variables.contentId)
            });
        },
        ...options,
    });
};

// Hook to delete a comment
interface DeleteCommentVariables {
    contentId: string;
    commentId: string;
}

export const useDeleteComment = (
    options?: Omit<UseMutationOptions<void, Error, DeleteCommentVariables>, 'mutationFn'>
): UseMutationResult<void, Error, DeleteCommentVariables> => {
    const queryClient = useQueryClient();
    
    return useMutation<void, Error, DeleteCommentVariables>({
        mutationFn: ({ contentId, commentId }) => deleteComment(contentId, commentId),
        onSuccess: (data, variables) => {
            // Invalidate magazine detail query to refetch with updated comments
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(variables.contentId)
            });
        },
        ...options,
    });
};
