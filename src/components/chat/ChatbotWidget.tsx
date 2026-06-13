import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Trash2, Sparkles } from "lucide-react";
import { streamChat, type ChatSource } from "@/lib/api/services/chatService";
import ChatMessage, { type ChatMessageData } from "./ChatMessage";

const STORAGE_KEY = "research-ambit-chat";
const MAX_HISTORY_TURNS = 6;

const STARTER_QUESTIONS = [
    "Which professors work on machine learning and how can I contact them?",
    "How many papers has the Civil Engineering department published?",
    "What research is being done on renewable energy at IIT Delhi?",
];

const loadMessages = (): ChatMessageData[] => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ChatMessageData[]) : [];
    } catch {
        return [];
    }
};

const ChatbotWidget = () => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessageData[]>(loadMessages);
    const [isStreaming, setIsStreaming] = useState(false);
    const [statusText, setStatusText] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Persist conversation across route changes (skip mid-stream writes)
    useEffect(() => {
        if (isStreaming) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
        } catch {
            /* storage full or unavailable */
        }
    }, [messages, isStreaming]);

    // Auto-scroll to the latest message
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messages, open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // Abort any in-flight stream on unmount
    useEffect(() => () => abortRef.current?.abort(), []);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isStreaming) return;

            // History for the backend: prior turns only, capped
            const history = messages
                .filter((m) => !m.error)
                .slice(-MAX_HISTORY_TURNS)
                .map((m) => ({ role: m.role, content: m.content }));

            setInput("");
            setIsStreaming(true);
            setMessages((prev) => [
                ...prev,
                { role: "user", content: trimmed },
                { role: "assistant", content: "" },
            ]);

            const updateLast = (updater: (m: ChatMessageData) => ChatMessageData) => {
                setMessages((prev) => {
                    const next = [...prev];
                    next[next.length - 1] = updater(next[next.length - 1]);
                    return next;
                });
            };

            const controller = new AbortController();
            abortRef.current = controller;

            await streamChat(
                trimmed,
                history,
                {
                    onStatus: (text: string) => setStatusText(text),
                    onSources: (sources: ChatSource[]) =>
                        updateLast((m) => ({ ...m, sources })),
                    onToken: (token: string) => {
                        setStatusText(null);
                        updateLast((m) => ({ ...m, content: m.content + token }));
                    },
                    onDone: () => {
                        setStatusText(null);
                        setIsStreaming(false);
                    },
                    onError: (message: string) => {
                        updateLast((m) => ({
                            ...m,
                            content: m.content || message,
                            error: !m.content,
                        }));
                        setStatusText(null);
                        setIsStreaming(false);
                    },
                },
                controller.signal
            );

            setIsStreaming(false);
            setStatusText(null);
        },
        [messages, isStreaming]
    );

    const clearChat = () => {
        abortRef.current?.abort();
        setIsStreaming(false);
        setStatusText(null);
        setMessages([]);
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const lastMessage = messages[messages.length - 1];
    const showTypingDots =
        isStreaming && lastMessage?.role === "assistant" && !lastMessage.content;

    return (
        <>
            {/* ── Launcher FAB ── */}
            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close research assistant" : "Open research assistant"}
                className="fixed bottom-6 right-6 z-[150] group flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all duration-200"
                style={{ boxShadow: "0 8px 32px -8px hsl(222 78% 48% / 0.45)" }}
            >
                {open ? <X className="w-4 h-4 flex-shrink-0" /> : <MessageCircle className="w-4 h-4 flex-shrink-0" />}
                <span className="text-sm font-semibold whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out">
                    Research Assistant
                </span>
            </button>

            {/* ── Chat panel ── */}
            {open && (
                <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[160] w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-8rem))] flex flex-col bg-background rounded-2xl shadow-2xl border border-border/60 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/10 to-accent/5 border-b border-border/50 flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground leading-tight">Research Assistant</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Ask about IIT Delhi research & publications
                            </p>
                        </div>
                        {messages.length > 0 && (
                            <button
                                onClick={clearChat}
                                aria-label="Clear conversation"
                                title="Clear conversation"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted/60 transition-colors flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-2">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <MessageCircle className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground mb-1">
                                        Hi! I'm the Research Assistant
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
                                        I answer questions using IIT Delhi's indexed research publications, with sources.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 w-full mt-1">
                                    {STARTER_QUESTIONS.map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => sendMessage(q)}
                                            className="text-left text-xs px-3 py-2.5 rounded-xl border border-border/60 bg-muted/30 text-foreground/80 hover:border-primary/40 hover:bg-primary/5 transition-colors leading-snug"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((m, i) =>
                                    // Hide the empty assistant placeholder while waiting for first token
                                    m.role === "assistant" && !m.content && !m.error ? null : (
                                        <ChatMessage key={i} message={m} />
                                    )
                                )}
                                {showTypingDots && (
                                    <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl rounded-bl-md bg-muted/60 w-fit">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                                        </span>
                                        {statusText && (
                                            <span className="text-[11px] text-muted-foreground">{statusText}</span>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-border/50 bg-muted/20 flex-shrink-0">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about research at IIT Delhi…"
                                rows={1}
                                maxLength={2000}
                                disabled={isStreaming}
                                className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-border/70 bg-background text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-60 max-h-28 transition-colors"
                                style={{ minHeight: "42px" }}
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={isStreaming || !input.trim()}
                                aria-label="Send message"
                                className="w-[42px] h-[42px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex-shrink-0"
                            >
                                {isStreaming ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-1.5 px-1">
                            Answers are generated from indexed publications and may be imperfect.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatbotWidget;
