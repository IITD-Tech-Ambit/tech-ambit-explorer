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

export const useLikeMagazine = (
    options?: Omit<UseMutationOptions<Analytics, Error, string>, 'mutationFn'>
): UseMutationResult<Analytics, Error, string> => {
    const queryClient = useQueryClient();

    return useMutation<Analytics, Error, string>({
        mutationFn: likeMagazine,
        onSuccess: (data, contentId) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(contentId)
            });
        },
        ...options,
    });
};

export const useDislikeMagazine = (
    options?: Omit<UseMutationOptions<Analytics, Error, string>, 'mutationFn'>
): UseMutationResult<Analytics, Error, string> => {
    const queryClient = useQueryClient();

    return useMutation<Analytics, Error, string>({
        mutationFn: dislikeMagazine,
        onSuccess: (data, contentId) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(contentId)
            });
        },
        ...options,
    });
};

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
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(variables.contentId)
            });
        },
        ...options,
    });
};

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
            queryClient.invalidateQueries({
                queryKey: queryKeys.magazines.detail(variables.contentId)
            });
        },
        ...options,
    });
};
