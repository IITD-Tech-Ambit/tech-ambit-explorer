// The chatbot is a separate microservice. Defaults to the local dev port; in
// production it is served behind nginx at /chat-api/api/v1.
const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3003/api/v1';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  index: number;
  id: string;
  title: string;
  authors: string[];
  publication_year: number | null;
  document_type: string | null;
  field_associated: string | null;
  citation_count: number;
  link: string | null;
  document_scopus_id: string | null;
  document_eid: string | null;
  kerberos: string | null;
  faculty_name: string | null;
}

export interface DataPoint { x: string | number; y: number }
export interface ChartSeries { label: string; data: DataPoint[] }

export interface LineChartData {
  chart_type: 'line';
  title: string;
  x_label: string;
  y_label: string;
  series: ChartSeries[];
}
export interface BarChartData {
  chart_type: 'bar';
  title: string;
  x_label: string;
  y_label: string;
  layout?: 'horizontal' | 'vertical';
  categories: string[];
  series: { label: string; data: number[] }[];
}
export interface PieChartData {
  chart_type: 'pie';
  title: string;
  slices: { label: string; value: number }[];
}
export type ChartPayload = LineChartData | BarChartData | PieChartData;

export interface ChatChartEvent {
  tool_name: string;
  chart: ChartPayload;
}

export interface ThinkingStep {
  step: string;
  detail: string | null;
}

export interface ChatStreamCallbacks {
  onSources: (sources: ChatSource[]) => void;
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  /** Thinking insight while the backend processes — do NOT expose tool names */
  onThinking?: (step: ThinkingStep) => void;
  onChart?: (chart: ChatChartEvent) => void;
  /** Session missing/expired (gateway 401) — caller should show the login prompt */
  onUnauthorized?: () => void;
  /** Daily message quota exhausted (429) */
  onQuotaExceeded?: (message: string) => void;
}

export interface ChatQuota {
  limit: number;
  used: number;
  remaining: number;
}

/** Per-user daily quota state; null when unavailable (e.g. not logged in). */
export async function fetchChatQuota(): Promise<ChatQuota | null> {
  try {
    const res = await fetch(`${CHAT_API_BASE_URL}/quota`, { credentials: 'include' });
    if (!res.ok) return null;
    return (await res.json()) as ChatQuota;
  } catch {
    return null;
  }
}

/**
 * Stream a chat answer from the RAG endpoint (Server-Sent Events over fetch).
 * Events: thinking | sources | chart | token | done | error.
 */
export async function streamChat(
  message: string,
  history: ChatHistoryMessage[],
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${CHAT_API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    callbacks.onError('Could not reach the chat service. Please try again.');
    return;
  }

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      callbacks.onUnauthorized?.();
      callbacks.onError('Please log in with your IITD account to use the chat assistant.');
    } else if (response.status === 429) {
      let message = 'You have used all your chat messages for today. Your quota resets at midnight IST.';
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch { /* keep default message */ }
      callbacks.onQuotaExceeded?.(message);
      callbacks.onError(message);
    } else if (response.status === 503) {
      callbacks.onError('The chat service is currently unavailable.');
    } else {
      callbacks.onError('The chat service returned an error. Please try again.');
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleEvent = (eventName: string, data: string) => {
    try {
      const parsed = JSON.parse(data);
      switch (eventName) {
        case 'thinking':
          callbacks.onThinking?.(parsed as ThinkingStep);
          break;
        case 'status':
          // Legacy — map to thinking for backward compat
          callbacks.onThinking?.({ step: parsed.text as string, detail: null });
          break;
        case 'sources':
          callbacks.onSources(parsed as ChatSource[]);
          break;
        case 'chart':
          callbacks.onChart?.(parsed as ChatChartEvent);
          break;
        case 'token':
          callbacks.onToken(parsed.text as string);
          break;
        case 'done':
          callbacks.onDone();
          break;
        case 'error':
          callbacks.onError(parsed.message as string);
          break;
      }
    } catch {
      // Ignore malformed frames
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        let eventName = 'message';
        const dataLines: string[] = [];
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length) handleEvent(eventName, dataLines.join('\n'));
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError('The connection was interrupted. Please try again.');
    }
  }
}
