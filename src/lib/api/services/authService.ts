// IITD OAuth session API (served by auth-service behind the api-gateway).
// Uses raw fetch with cookie credentials — the session lives in an httpOnly
// cookie, never in JS-accessible storage.
import { BASE_URL } from '../endpoints';

export interface AuthUser {
    sub: string;
    user_id: string;
    email: string;
    name: string;
    kerberos: string;
    department: string;
    category: string;
}

const AUTH_BASE = `${BASE_URL}/auth`;

/** Current session, or null when not logged in. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
    try {
        const res = await fetch(`${AUTH_BASE}/me`, { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return (data.user as AuthUser) ?? null;
    } catch {
        return null;
    }
}

/** Full-page redirect into the IITD OAuth flow. */
export function redirectToLogin(): void {
    window.location.href = `${AUTH_BASE}/login`;
}

export async function logout(): Promise<void> {
    try {
        await fetch(`${AUTH_BASE}/logout`, { method: 'POST', credentials: 'include' });
    } catch {
        // Cookie clearing failed server-side; the client state resets regardless.
    }
}
