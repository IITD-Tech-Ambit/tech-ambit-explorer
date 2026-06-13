const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/suggestions`;

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

    // Do NOT set Content-Type header — browser sets it automatically with multipart boundary
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!data.success) {
        const detail = data.errors?.[0]?.message || data.message || 'Submission failed.';
        throw new Error(detail);
    }
};
