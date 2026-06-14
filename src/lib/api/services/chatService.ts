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
}

export interface ChatStreamCallbacks {
  onSources: (sources: ChatSource[]) => void;
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  /** Progress updates while the backend runs a tool, e.g. "Computing statistics..." */
  onStatus?: (text: string) => void;
}

/**
 * Stream a chat answer from the RAG endpoint (Server-Sent Events over fetch).
 * Events: sources, token, done, error.
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
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    callbacks.onError('Could not reach the chat service. Please try again.');
    return;
  }

  if (!response.ok || !response.body) {
    if (response.status === 429) {
      callbacks.onError('You are sending messages too quickly. Please wait a moment.');
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
        case 'status':
          callbacks.onStatus?.(parsed.text as string);
          break;
        case 'sources':
          callbacks.onSources(parsed as ChatSource[]);
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

      // SSE frames are separated by a blank line
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
