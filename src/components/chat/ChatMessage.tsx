import ReactMarkdown from "react-markdown";
import { ExternalLink, FileText } from "lucide-react";
import type { ChatSource } from "@/lib/api/services/chatService";

export interface ChatMessageData {
    role: "user" | "assistant";
    content: string;
    sources?: ChatSource[];
    error?: boolean;
}

const SourceItem = ({ source }: { source: ChatSource }) => {
    const authors = source.authors.slice(0, 3).join(", ") + (source.authors.length > 3 ? " et al." : "");
    const meta = [source.publication_year, authors].filter(Boolean).join(" · ");

    const content = (
        <>
            <span className="flex-shrink-0 w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                {source.index}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-xs font-medium text-foreground/90 leading-snug line-clamp-2">
                    {source.title}
                </span>
                {meta && (
                    <span className="block text-[10px] text-muted-foreground truncate mt-0.5">
                        {meta}
                    </span>
                )}
            </span>
            {source.link && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />}
        </>
    );

    const cls = "flex items-start gap-2 px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors";

    return source.link ? (
        <a href={source.link} target="_blank" rel="noopener noreferrer" className={cls}>
            {content}
        </a>
    ) : (
        <div className={cls}>{content}</div>
    );
};

const ChatMessage = ({ message }: { message: ChatMessageData }) => {
    if (message.role === "user") {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div
                className={`max-w-[95%] px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed break-words ${
                    message.error
                        ? "bg-destructive/10 text-destructive border border-destructive/30"
                        : "bg-muted/60 text-foreground"
                }`}
            >
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm prose-strong:text-foreground">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
            </div>

            {message.sources && message.sources.length > 0 && (
                <div className="max-w-[95%]">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">
                        <FileText className="w-3 h-3" />
                        Sources
                    </p>
                    <div className="flex flex-col gap-1">
                        {message.sources.map((s) => (
                            <SourceItem key={s.id} source={s} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
