import { isAxiosError } from "axios";

export type ErrorKind = "offline" | "unreachable" | "timeout" | "server" | "notFound" | "forbidden" | "unknown";

export interface FriendlyError {
  kind: ErrorKind;
  title: string;
  message: string;
  retryable: boolean;
}

export function classifyError(error: unknown): ErrorKind {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "timeout";
    const status = error.response?.status;
    if (!status) return "unreachable";
    if (status === 404) return "notFound";
    if (status === 401 || status === 403) return "forbidden";
    if (status >= 500) return "server";
    return "unknown";
  }
  if (error instanceof Error && /network|failed to fetch|load failed/i.test(error.message)) {
    return "unreachable";
  }
  return "unknown";
}

const COPY: Record<ErrorKind, Omit<FriendlyError, "kind">> = {
  offline: {
    title: "You're offline",
    message: "Check your internet connection, then try again.",
    retryable: true,
  },
  unreachable: {
    title: "Can't reach Research Ambit",
    message: "Our servers aren't responding right now. Please try again in a moment.",
    retryable: true,
  },
  timeout: {
    title: "This is taking too long",
    message: "The server took too long to respond. Please try again.",
    retryable: true,
  },
  server: {
    title: "Something went wrong on our end",
    message: "The server ran into a problem. We're on it — please try again shortly.",
    retryable: true,
  },
  notFound: {
    title: "Not found",
    message: "We couldn't find what you were looking for. It may have been moved or removed.",
    retryable: false,
  },
  forbidden: {
    title: "Sign in required",
    message: "You don't have access to this right now. Try signing in again.",
    retryable: false,
  },
  unknown: {
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    retryable: true,
  },
};

export function describeError(error: unknown): FriendlyError {
  const kind = classifyError(error);
  return { kind, ...COPY[kind] };
}

/** Prefer the server's own explanation (e.g. "already liked"); otherwise a friendly message. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof serverMessage === "string" && serverMessage.trim()) return serverMessage;
    if (!error.response) return describeError(error).message;
  }
  return fallback;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  }
  return failureCount < 2;
}
