import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Loader2, Trash2,
  Sparkles, Brain, ChevronDown, BookOpen,
} from "lucide-react";
import { streamChat, type ChatSource, type ChatChartEvent, type ThinkingStep } from "@/lib/api/services/chatService";
import ChatMessage, { type ChatMessageData } from "./ChatMessage";

const STORAGE_KEY = "research-ambit-chat-v2";
const MAX_HISTORY_TURNS = 6;

const STARTER_QUESTIONS = [
  "Which professors work on machine learning?",
  "What is the research trend in renewable energy at IIT Delhi?",
  "Compare Prof. Subhashis Banerjee and Prof. Amitabha Mukherjee",
  "What departments does IIT Delhi have?",
];

const loadMessages = (): ChatMessageData[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessageData[]) : [];
  } catch {
    return [];
  }
};

// ── Thinking indicator ──
const ThinkingBubble = ({ steps }: { steps: ThinkingStep[] }) => {
  const latest = steps[steps.length - 1];
  return (
    <div className="flex items-start gap-2.5 max-w-[90%]">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Brain className="w-3 h-3 text-primary animate-pulse" />
      </div>
      <div className="flex flex-col gap-1 flex-1">
        {/* Completed steps */}
        {steps.slice(0, -1).map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground/60 line-through">{s.step}</span>
          </div>
        ))}
        {/* Active step */}
        {latest && (
          <div className="flex items-center gap-2">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:120ms]" />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:240ms]" />
            </span>
            <span className="text-[11px] text-primary font-medium">{latest.step}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageData[]>(loadMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist conversation
  useEffect(() => {
    if (isStreaming) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch { /* storage full */ }
  }, [messages, isStreaming]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinkingSteps, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "42px";
    el.style.height = Math.min(el.scrollHeight, 112) + "px";
  };

  const updateLast = useCallback((updater: (m: ChatMessageData) => ChatMessageData) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const history = messages
        .filter((m) => !m.error)
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));

      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "42px";
      setIsStreaming(true);
      setThinkingSteps([]);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "" },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        trimmed,
        history,
        {
          onThinking: (step) => {
            setThinkingSteps((prev) => [...prev, step]);
          },
          onSources: (sources: ChatSource[]) => {
            updateLast((m) => ({ ...m, sources }));
          },
          onChart: (chart: ChatChartEvent) => {
            updateLast((m) => ({ ...m, chart }));
          },
          onToken: (token: string) => {
            setThinkingSteps([]);
            updateLast((m) => ({ ...m, content: m.content + token }));
          },
          onDone: () => {
            setThinkingSteps([]);
            setIsStreaming(false);
          },
          onError: (errMsg: string) => {
            updateLast((m) => ({
              ...m,
              content: m.content || errMsg,
              error: !m.content,
            }));
            setThinkingSteps([]);
            setIsStreaming(false);
          },
        },
        controller.signal
      );

      setIsStreaming(false);
      setThinkingSteps([]);
    },
    [messages, isStreaming, updateLast]
  );

  const clearChat = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setThinkingSteps([]);
    setMessages([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showThinking = isStreaming && thinkingSteps.length > 0 && lastMessage?.role === "assistant" && !lastMessage.content;
  const showDots = isStreaming && thinkingSteps.length === 0 && lastMessage?.role === "assistant" && !lastMessage.content;

  return (
    <>
      {/* ── Launcher FAB ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close research assistant" : "Open research assistant"}
        title={open ? "Close research assistant" : "Research Assistant"}
        className="fixed bottom-20 right-6 z-[150] flex items-center justify-center w-12 h-12 rounded-2xl text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          boxShadow: "0 8px 30px -6px rgba(99, 102, 241, 0.55)",
        }}
      >
        <div className="relative">
          {open ? (
            <X className="w-4 h-4" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white/50" />
              )}
            </>
          )}
        </div>
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-[8.5rem] right-4 sm:right-6 z-[160] flex flex-col overflow-hidden"
          style={{
            width: "min(calc(100vw - 2rem), 440px)",
            height: "min(640px, calc(100vh - 7rem))",
            borderRadius: "20px",
            boxShadow: "0 24px 64px -12px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.05)",
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border) / 0.5)",
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--accent) / 0.06) 100%)",
              borderBottom: "1px solid hsl(var(--border) / 0.4)",
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 12px -2px rgba(99,102,241,0.4)" }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-none">Research Assistant</p>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                IIT Delhi Research Portal
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* ── Messages ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
            {messages.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.1))" }}
                >
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[14px] font-bold text-foreground">Research Assistant</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[260px]">
                    Ask me anything about IIT Delhi's research — faculty, publications, departments, and trends.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-[12px] px-3.5 py-2.5 rounded-xl text-foreground/80 leading-snug transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        border: "1px solid hsl(var(--border) / 0.7)",
                        background: "hsl(var(--muted) / 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.4)";
                        (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.7)";
                        (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.3)";
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => {
                  if (m.role === "assistant" && !m.content && !m.error && !m.chart) return null;
                  const isLastMsg = i === messages.length - 1;
                  // For user messages, allow edit only when not streaming
                  const onEdit =
                    m.role === "user" && !isStreaming
                      ? (text: string) => {
                          setInput(text);
                          if (textareaRef.current) {
                            textareaRef.current.style.height = "42px";
                            textareaRef.current.style.height =
                              Math.min(textareaRef.current.scrollHeight, 112) + "px";
                            textareaRef.current.focus();
                          }
                        }
                      : undefined;
                  // For assistant messages, allow retry on last message
                  const onRetry =
                    m.role === "assistant" && isLastMsg && !isStreaming
                      ? () => {
                          const lastUser = [...messages].reverse().find((x) => x.role === "user");
                          if (lastUser) sendMessage(lastUser.content);
                        }
                      : undefined;
                  return (
                    <ChatMessage
                      key={i}
                      message={m}
                      onEdit={onEdit}
                      onRetry={onRetry}
                      isLast={isLastMsg}
                    />
                  );
                })}

                {/* ── Thinking steps ── */}
                {showThinking && <ThinkingBubble steps={thinkingSteps} />}

                {/* ── Initial dots (before first thinking step) ── */}
                {showDots && (
                  <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted/40 w-fit border border-border/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Input area ── */}
          <div
            className="px-3 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid hsl(var(--border) / 0.4)", background: "hsl(var(--muted) / 0.15)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={(el) => {
                  (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                  (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                }}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about research, faculty, departments…"
                rows={1}
                maxLength={2000}
                disabled={isStreaming}
                className="flex-1 resize-none px-3.5 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all disabled:opacity-50"
                style={{
                  minHeight: "42px",
                  maxHeight: "112px",
                  background: "hsl(var(--background))",
                  border: "1.5px solid hsl(var(--border) / 0.7)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--border) / 0.7)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isStreaming || !input.trim()}
                aria-label="Send"
                className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white flex-shrink-0 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !isStreaming
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : "hsl(var(--muted))",
                  boxShadow: input.trim() && !isStreaming ? "0 4px 12px -2px rgba(99,102,241,0.4)" : "none",
                }}
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Send className="w-4 h-4" style={{ color: input.trim() ? "white" : "hsl(var(--muted-foreground))" }} />
                )}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground/50 mt-1.5 px-1">
              Powered by IIT Delhi research index · Answers may be incomplete
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
