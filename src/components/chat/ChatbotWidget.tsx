import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Send, Loader2,
  Sparkles, Brain, BookOpen,
  Users, TrendingUp, Building2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { streamChat, type ChatSource, type ChatChartEvent, type ThinkingStep } from "@/lib/api/services/chatService";
import ChatMessage, { type ChatMessageData } from "./ChatMessage";
import ChatPanelHeader from "./ChatPanelHeader";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "research-ambit-chat-v2";
const MAX_HISTORY_TURNS = 6;

const STARTER_QUESTIONS = [
  { q: "Which professors work on machine learning?", icon: Brain },
  { q: "Research trends in renewable energy?", icon: TrendingUp },
  { q: "Compare two faculty members", icon: Users },
  { q: "What departments does IIT Delhi have?", icon: Building2 },
];

const loadMessages = (): ChatMessageData[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessageData[]) : [];
  } catch {
    return [];
  }
};

// ── Thinking indicator ──────────────────────────────────────────────────────

const ThinkingBubble = ({ steps }: { steps: ThinkingStep[] }) => {
  const latest = steps[steps.length - 1];
  return (
    <div className="flex items-start gap-2.5 max-w-[90%]">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)/0.12), hsl(var(--accent)/0.08))",
          border: "1px solid hsl(var(--primary)/0.18)",
        }}
      >
        <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
      </div>
      <div className="flex flex-col gap-1 flex-1 py-0.5">
        {steps.slice(0, -1).map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 opacity-45">
            <Check className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground line-through">{s.step}</span>
          </div>
        ))}
        {latest && (
          <div className="flex items-center gap-2">
            <span className="flex gap-[3px]">
              {[0, 120, 240].map((d) => (
                <span
                  key={d}
                  className="w-[5px] h-[5px] rounded-full animate-bounce"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                    animationDelay: `${d}ms`,
                  }}
                />
              ))}
            </span>
            <span className="text-[11px] text-primary font-medium">{latest.step}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main widget ─────────────────────────────────────────────────────────────

const ChatbotWidget = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageData[]>(loadMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isStreaming) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch { /* storage full */ }
  }, [messages, isStreaming]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinkingSteps, open, expanded]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, expanded]);

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, isMobile]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "44px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
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
      if (textareaRef.current) textareaRef.current.style.height = "44px";
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
          onThinking: (step) => setThinkingSteps((prev) => [...prev, step]),
          onSources: (sources: ChatSource[]) => updateLast((m) => ({ ...m, sources })),
          onChart: (chart: ChatChartEvent) => updateLast((m) => ({ ...m, chart })),
          onToken: (token: string) => {
            setThinkingSteps([]);
            updateLast((m) => ({ ...m, content: m.content + token }));
          },
          onDone: () => { setThinkingSteps([]); setIsStreaming(false); },
          onError: (errMsg: string) => {
            updateLast((m) => ({ ...m, content: m.content || errMsg, error: !m.content }));
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

  const handleClose = useCallback(() => {
    setOpen(false);
    setExpanded(false);
  }, []);

  const handleToggleExpand = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setExpanded((e) => !e);
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitioning(false)));
    }, 140);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showThinking =
    isStreaming && thinkingSteps.length > 0 &&
    lastMessage?.role === "assistant" && !lastMessage.content;
  const showDots =
    isStreaming && thinkingSteps.length === 0 &&
    lastMessage?.role === "assistant" && !lastMessage.content;

  // ── Welcome / empty state ──────────────────────────────────────────────────

  const EmptyState = ({ isExp }: { isExp: boolean }) => (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full gap-6 px-5 py-8 text-center",
        isExp && "gap-8 py-12",
      )}
    >
      {/* Hero icon with rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer ambient ring */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            inset: "-22px",
            background:
              "radial-gradient(circle, hsl(var(--primary)/0.08) 0%, transparent 70%)",
          }}
        />
        {/* Mid ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: "-10px",
            border: "1px solid hsl(var(--primary)/0.1)",
          }}
        />
        {/* Icon container */}
        <div
          className={cn(
            "relative rounded-2xl flex items-center justify-center",
            isExp ? "w-16 h-16" : "w-14 h-14",
          )}
          style={{
            background:
              "linear-gradient(145deg, hsl(var(--primary)/0.12) 0%, hsl(var(--accent)/0.07) 100%)",
            border: "1px solid hsl(var(--primary)/0.18)",
            boxShadow: "0 8px 28px -8px hsl(var(--primary)/0.25)",
          }}
        >
          <BookOpen className={cn("text-primary", isExp ? "w-7 h-7" : "w-6 h-6")} />
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <h3
          className={cn(
            "font-bold text-foreground tracking-tight",
            isExp ? "text-[18px]" : "text-[15px]",
          )}
        >
          Explore IIT Delhi Research
        </h3>
        <p
          className={cn(
            "text-muted-foreground leading-relaxed",
            isExp ? "text-[13px] max-w-sm" : "text-[11px] max-w-[240px]",
          )}
        >
          Ask about faculty, publications, research trends, or departments — powered by the live research index.
        </p>
      </div>

      {/* Starter cards */}
      <div
        className={cn(
          "grid w-full",
          isExp ? "grid-cols-2 gap-2.5 max-w-lg" : "grid-cols-2 gap-2 max-w-[300px]",
        )}
      >
        {STARTER_QUESTIONS.map(({ q, icon: Icon }) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            className={cn(
              "group flex items-start text-left rounded-xl transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.97] touch-manipulation",
              isExp ? "gap-2.5 p-3.5" : "gap-2 p-2.5",
            )}
            style={{
              background: "hsl(var(--muted)/0.3)",
              border: "1px solid hsl(var(--border)/0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsl(var(--primary)/0.05)";
              e.currentTarget.style.borderColor = "hsl(var(--primary)/0.28)";
              e.currentTarget.style.boxShadow = "0 4px 16px -4px hsl(var(--primary)/0.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "hsl(var(--muted)/0.3)";
              e.currentTarget.style.borderColor = "hsl(var(--border)/0.6)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Icon box */}
            <div
              className={cn(
                "flex-shrink-0 rounded-lg flex items-center justify-center",
                isExp ? "w-7 h-7 mt-0.5" : "w-6 h-6 mt-0.5",
              )}
              style={{
                background: "hsl(var(--primary)/0.1)",
                border: "1px solid hsl(var(--primary)/0.15)",
              }}
            >
              <Icon
                className={cn(
                  "text-primary/70 group-hover:text-primary transition-colors",
                  isExp ? "w-3.5 h-3.5" : "w-3 h-3",
                )}
              />
            </div>
            <span
              className={cn(
                "text-foreground/65 group-hover:text-foreground/85 leading-snug transition-colors",
                isExp ? "text-[12px]" : "text-[11px]",
              )}
            >
              {q}
            </span>
          </button>
        ))}
      </div>

      {/* Footer badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          background: "hsl(var(--muted)/0.4)",
          border: "1px solid hsl(var(--border)/0.4)",
        }}
      >
        <Sparkles className="w-3 h-3 text-primary/50" />
        <span className={cn("text-muted-foreground/50", isExp ? "text-[10px]" : "text-[9px]")}>
          Powered by IIT Delhi research index
        </span>
      </div>
    </div>
  );

  // ── Shared panel contents ──────────────────────────────────────────────────

  const panelContents = (opts?: { showDragHandle?: boolean; isExpanded?: boolean }) => {
    const isExp = opts?.isExpanded ?? false;

    return (
      <>
        <ChatPanelHeader
          hasMessages={messages.length > 0}
          onClear={clearChat}
          onClose={handleClose}
          showDragHandle={opts?.showDragHandle}
          isExpanded={isExp}
          onToggleExpand={!opts?.showDragHandle ? handleToggleExpand : undefined}
        />

        {/* Messages / empty state */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{ WebkitOverflowScrolling: "touch" } as any}
        >
          {messages.length === 0 ? (
            <EmptyState isExp={isExp} />
          ) : (
            <div
              className={cn(
                "py-4 space-y-4 min-w-0 w-full max-w-full overflow-x-hidden",
                isExp
                  ? "px-6 py-5 space-y-5 max-w-[780px] mx-auto"
                  : "px-3 sm:px-4",
              )}
            >
              {messages.map((m, i) => {
                if (m.role === "assistant" && !m.content && !m.error && !m.chart) return null;
                const isLastMsg = i === messages.length - 1;
                const onEdit =
                  m.role === "user" && !isStreaming
                    ? (text: string) => {
                        setInput(text);
                        if (textareaRef.current) {
                          textareaRef.current.style.height = "44px";
                          textareaRef.current.style.height =
                            Math.min(textareaRef.current.scrollHeight, 120) + "px";
                          textareaRef.current.focus();
                        }
                      }
                    : undefined;
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

              {showThinking && <ThinkingBubble steps={thinkingSteps} />}

              {showDots && (
                <div
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-bl-sm w-fit"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border)/0.35)",
                    boxShadow: "0 1px 4px -1px rgba(0,0,0,0.06)",
                  }}
                >
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                        animationDelay: `${d}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className={cn("flex-shrink-0", isExp ? "px-5 pt-3" : "px-3 pt-2.5")}
          style={{
            borderTop: "1px solid hsl(var(--border)/0.35)",
            background: "hsl(var(--background)/0.6)",
            backdropFilter: "blur(12px)",
            paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div
            className={cn(
              "flex items-end gap-2 rounded-2xl px-3 py-2 transition-all duration-150",
              isExp && "max-w-[780px] mx-auto",
            )}
            style={{
              background: "hsl(var(--background))",
              border: "1.5px solid hsl(var(--border)/0.55)",
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary)/0.45)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 3px hsl(var(--primary)/0.07), 0 2px 8px -2px hsl(var(--primary)/0.1)";
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border)/0.55)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <textarea
              ref={(el) => {
                (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              }}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about research, faculty…"
              rows={1}
              maxLength={2000}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground/35 outline-none disabled:opacity-50 touch-manipulation py-1.5"
              style={{ fontSize: "16px", lineHeight: "1.5", minHeight: "36px", maxHeight: "120px" }}
              onFocus={() => {
                if (isMobile)
                  setTimeout(
                    () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
                    350,
                  );
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isStreaming || !input.trim()}
              aria-label="Send"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 active:scale-90 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
              style={{
                background:
                  input.trim() && !isStreaming
                    ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))"
                    : "hsl(var(--muted))",
                boxShadow:
                  input.trim() && !isStreaming
                    ? "0 4px 14px -3px hsl(var(--primary)/0.45)"
                    : "none",
                transition: "background 0.15s, box-shadow 0.15s, opacity 0.15s",
              }}
            >
              {isStreaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Send
                  className="w-3.5 h-3.5"
                  style={{ color: input.trim() ? "white" : "hsl(var(--muted-foreground))" }}
                />
              )}
            </button>
          </div>
          <p
            className={cn(
              "text-muted-foreground/30 mt-1.5 px-1 text-center",
              isExp ? "max-w-[780px] mx-auto text-[10px]" : "text-[9px]",
            )}
          >
            Answers may be incomplete · {!isMobile && "Enter to send · "}Shift+Enter for newline
          </p>
        </div>
      </>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="md:hidden fixed inset-0 z-[155] transition-opacity duration-250"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close research assistant" : "Open research assistant"}
        title={open ? "Close" : "Research Assistant"}
        className={`
          fixed z-[150] flex items-center justify-center text-white
          active:scale-90 touch-manipulation rounded-2xl
          w-14 h-14 right-4 transition-all duration-200
          bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]
          md:w-12 md:h-12 md:right-6 md:bottom-20
        `}
        style={{
          background: open
            ? "linear-gradient(135deg, hsl(var(--primary)/0.88) 0%, hsl(var(--accent)/0.88) 100%)"
            : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
          boxShadow: open
            ? "0 8px 24px -6px hsl(var(--primary)/0.45)"
            : "0 8px 32px -6px hsl(var(--primary)/0.55), 0 2px 8px -2px rgba(0,0,0,0.2)",
        }}
      >
        {/* Pulse ring — visible when closed and there are messages */}
        {!open && messages.length > 0 && (
          <span
            className="absolute inset-0 rounded-2xl animate-ping opacity-25 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          />
        )}
        <div
          style={{
            transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          {open ? (
            <X className="w-5 h-5 md:w-4 md:h-4" />
          ) : (
            <Sparkles className="w-5 h-5 md:w-4 md:h-4" />
          )}
        </div>
        {/* Unread dot (closed + has messages) */}
        {!open && messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-[1.5px] ring-white/70" />
        )}
      </button>

      {/* Mobile: full-height bottom sheet */}
      <div
        aria-hidden={!open}
        className="md:hidden fixed inset-x-0 bottom-0 z-[160] flex flex-col overflow-hidden"
        style={{
          height: "min(92dvh, 100dvh - env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
          borderRadius: "20px 20px 0 0",
          background: "hsl(var(--background))",
          borderTop: "1px solid hsl(var(--border)/0.5)",
          boxShadow: "0 -16px 56px -8px rgba(0,0,0,0.28)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Gradient accent strip at top of sheet */}
        <div
          className="h-[2px] w-full flex-shrink-0"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
          }}
        />
        {panelContents({ showDragHandle: true })}
      </div>

      {/* Desktop expanded backdrop */}
      <div
        aria-hidden="true"
        className="hidden md:block fixed inset-0 z-[158]"
        style={{
          background: "rgba(0,0,0,0.52)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          opacity: open && expanded && !transitioning ? 1 : 0,
          pointerEvents: open && expanded ? "auto" : "none",
          transition: "opacity 0.22s ease",
        }}
        onClick={() => handleToggleExpand()}
      />

      {/* Desktop panel — compact ↔ expanded */}
      {open && (
        <div
          className="hidden md:flex fixed flex-col overflow-hidden z-[160]"
          style={
            expanded
              ? {
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) scale(${transitioning ? 0.95 : 1})`,
                  width: "min(940px, calc(100vw - 48px))",
                  height: "min(86vh, 860px)",
                  borderRadius: "22px",
                  background:
                    "radial-gradient(ellipse at 35% 0%, hsl(var(--primary)/0.04) 0%, transparent 55%), hsl(var(--background))",
                  border: "1px solid hsl(var(--primary)/0.16)",
                  boxShadow: [
                    "0 0 0 1px hsl(var(--primary)/0.08)",
                    "0 48px 120px -20px rgba(0,0,0,0.44)",
                    "0 16px 48px -8px hsl(var(--primary)/0.14)",
                  ].join(", "),
                  opacity: transitioning ? 0 : 1,
                  transition:
                    "opacity 0.18s ease, transform 0.28s cubic-bezier(0.34,1.3,0.64,1)",
                }
              : {
                  bottom: "8.5rem",
                  right: "1.5rem",
                  transform: `scale(${transitioning ? 0.95 : 1}) translateY(${transitioning ? 8 : 0}px)`,
                  transformOrigin: "bottom right",
                  width: "min(calc(100vw - 2rem), 420px)",
                  height: "min(600px, calc(100vh - 8rem))",
                  borderRadius: "20px",
                  // Opaque hsl(var(--background)) base layer underneath the tint —
                  // without it, the gradient's near-transparent start color let the
                  // page behind the widget show through the header/greeting area.
                  background:
                    "linear-gradient(160deg, hsl(var(--primary)/0.06) 0%, transparent 40%), hsl(var(--background))",
                  border: "1px solid hsl(var(--border)/0.5)",
                  boxShadow: [
                    "0 32px 80px -12px rgba(0,0,0,0.28)",
                    "0 8px 24px -4px rgba(0,0,0,0.12)",
                    "0 4px 12px -2px hsl(var(--primary)/0.08)",
                    "0 0 0 1px rgba(255,255,255,0.03)",
                  ].join(", "),
                  opacity: transitioning ? 0 : 1,
                  transition: "opacity 0.18s ease, transform 0.18s ease",
                }
          }
        >
          {/* Gradient accent line — top of modal */}
          <div
            className="h-[2.5px] w-full flex-shrink-0"
            style={{
              background: expanded
                ? "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 60%, hsl(var(--primary)/0.5) 100%)"
                : "linear-gradient(90deg, hsl(var(--primary)/0.6) 0%, hsl(var(--accent)/0.6) 100%)",
            }}
          />
          {panelContents({ isExpanded: expanded })}
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
