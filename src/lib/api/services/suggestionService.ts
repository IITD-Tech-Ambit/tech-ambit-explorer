import apiClient from '../apiClient';

export interface SuggestionPayload {
    name?: string;
    email?: string;
    category: string;
    message: string;
}

export const SUGGESTION_CATEGORIES = [
    'Website Feedback',
    'Feature Request',
    'Missing Research Information',
    'Bug Report',
    'Other',
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const submitSuggestion = async (
    payload: SuggestionPayload,
    screenshot?: File | null
): Promise<void> => {
    const formData = new FormData();
    if (payload.name) formData.append('name', payload.name);
    if (payload.email) formData.append('email', payload.email);
    formData.append('category', payload.category);
    formData.append('message', payload.message);
    if (screenshot) formData.append('screenshot', screenshot);

    try {
        // Do NOT set Content-Type header — axios/browser sets it automatically
        // with the multipart boundary for FormData bodies.
        const { data } = await apiClient.post('/suggestions', formData);
        if (!data.success) {
            throw new Error(data.errors?.[0]?.message || data.message || 'Submission failed.');
        }
    } catch (err: any) {
        if (err?.response) {
            const data = err.response.data;
            throw new Error(data?.errors?.[0]?.message || data?.message || 'Submission failed.');
        }
        throw err;
    }
};
