import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Search, UserCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuggestResponse, SuggestAuthor, SuggestPaper, SuggestIntent } from "@/lib/api/types";

export interface SearchSuggestionsHandle {
  /** Returns true if the key was handled (Arrow/Enter/Esc on an item), so the input skips its default. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => boolean;
}

type FlatItem =
  | { kind: "author"; data: SuggestAuthor }
  | { kind: "paper"; data: SuggestPaper }
  | { kind: "recent"; data: string };

interface SearchSuggestionsProps {
  query: string;
  data?: SuggestResponse;
  isLoading: boolean;
  recent?: string[];
  onSelectAuthor: (author: SuggestAuthor) => void;
  onSelectPaper: (paper: SuggestPaper) => void;
  onSelectRecent: (query: string) => void;
  onClose: () => void;
  className?: string;
}

const INTENT_HINT: Record<SuggestIntent, string> = {
  author: "Looks like an author",
  paper: "Looks like a paper",
  mixed: "",
};

/** Highlight the matched query tokens (prefix-anchored) inside a label. */
function highlightPrefix(text: string, query: string) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (tokens.length === 0 || !text) return text;

  // Match each token where it appears at a word boundary (prefix of a word).
  const re = new RegExp(`(\\b(?:${tokens.join("|")}))`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) && i % 2 === 1 ? (
      <mark key={i} className="bg-transparent font-semibold text-primary">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export const SearchSuggestions = forwardRef<SearchSuggestionsHandle, SearchSuggestionsProps>(
  function SearchSuggestions(
    { query, data, isLoading, recent = [], onSelectAuthor, onSelectPaper, onSelectRecent, onClose, className },
    ref
  ) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);

    const trimmed = query.trim();
    const showRecent = trimmed.length < 2;

    const authors = useMemo(() => data?.groups.authors ?? [], [data]);
    const papers = useMemo(() => data?.groups.papers ?? [], [data]);
    const intent: SuggestIntent = data?.intent ?? "mixed";
    const authorsFirst = intent !== "paper";

    // Flattened, order-aware list used for keyboard navigation.
    const flat = useMemo<FlatItem[]>(() => {
      if (showRecent) {
        return recent.slice(0, 6).map((q) => ({ kind: "recent" as const, data: q }));
      }
      const authorItems: FlatItem[] = authors.map((a) => ({ kind: "author", data: a }));
      const paperItems: FlatItem[] = papers.map((p) => ({ kind: "paper", data: p }));
      return authorsFirst ? [...authorItems, ...paperItems] : [...paperItems, ...authorItems];
    }, [showRecent, recent, authors, papers, authorsFirst]);

    // Reset highlight whenever the option set changes.
    useEffect(() => {
      setActiveIndex(-1);
    }, [trimmed, flat.length]);

    // Keep the active row visible.
    useEffect(() => {
      if (activeIndex < 0 || !listRef.current) return;
      const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const selectItem = (item: FlatItem) => {
      if (item.kind === "author") onSelectAuthor(item.data);
      else if (item.kind === "paper") onSelectPaper(item.data);
      else onSelectRecent(item.data);
    };

    useImperativeHandle(ref, () => ({
      handleKeyDown(e) {
        if (flat.length === 0) {
          if (e.key === "Escape") {
            onClose();
            return true;
          }
          return false;
        }
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % flat.length);
            return true;
          case "ArrowUp":
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
            return true;
          case "Enter":
            if (activeIndex >= 0 && activeIndex < flat.length) {
              e.preventDefault();
              selectItem(flat[activeIndex]);
              return true;
            }
            return false; // let the parent run a normal search
          case "Escape":
            e.preventDefault();
            onClose();
            return true;
          default:
            return false;
        }
      },
    }));

    const hasContent = showRecent ? flat.length > 0 : authors.length > 0 || papers.length > 0;
    if (!showRecent && !isLoading && !hasContent) {
      return (
        <div className={cn("rounded-xl border border-border bg-popover shadow-xl p-4 text-sm text-muted-foreground", className)}>
          No matches for “{trimmed}”. Press Enter to search anyway.
        </div>
      );
    }
    if (showRecent && flat.length === 0) {
      return null;
    }

    // Index offsets so authors/papers map back into the flat keyboard list.
    const firstGroupLen = authorsFirst ? authors.length : papers.length;

    const renderAuthorRow = (a: SuggestAuthor, flatIdx: number) => (
      <button
        key={`a-${a.id}-${flatIdx}`}
        type="button"
        data-idx={flatIdx}
        onMouseEnter={() => setActiveIndex(flatIdx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelectAuthor(a)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
          activeIndex === flatIdx ? "bg-primary/10" : "hover:bg-muted"
        )}
      >
        {a.image_url ? (
          <img src={a.image_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
        ) : (
          <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserCircle className="h-5 w-5 text-primary" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {highlightPrefix(a.name, trimmed)}
          </span>
          {a.department && (
            <span className="block truncate text-xs text-muted-foreground">{a.department}</span>
          )}
        </span>
      </button>
    );

    const renderPaperRow = (p: SuggestPaper, flatIdx: number) => (
      <button
        key={`p-${p.id}-${flatIdx}`}
        type="button"
        data-idx={flatIdx}
        onMouseEnter={() => setActiveIndex(flatIdx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelectPaper(p)}
        className={cn(
          "w-full flex items-start gap-3 px-3 py-2 text-left rounded-lg transition-colors",
          activeIndex === flatIdx ? "bg-primary/10" : "hover:bg-muted"
        )}
      >
        <span className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {highlightPrefix(p.title, trimmed)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {[p.lead_author, p.year ? String(p.year) : ""].filter(Boolean).join(" · ")}
          </span>
        </span>
      </button>
    );

    const GroupHeader = ({ label, hint }: { label: string; hint?: string }) => (
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {hint && <span className="text-[11px] font-medium text-primary/80">{hint}</span>}
      </div>
    );

    const authorsBlock = authors.length > 0 && (
      <div>
        <GroupHeader label="Authors" hint={intent === "author" ? INTENT_HINT.author : undefined} />
        {authors.map((a, i) => renderAuthorRow(a, authorsFirst ? i : firstGroupLen + i))}
      </div>
    );
    const papersBlock = papers.length > 0 && (
      <div>
        <GroupHeader label="Papers" hint={intent === "paper" ? INTENT_HINT.paper : undefined} />
        {papers.map((p, i) => renderPaperRow(p, authorsFirst ? authors.length + i : i))}
      </div>
    );

    return (
      <div
        ref={listRef}
        className={cn(
          "rounded-xl border border-border bg-popover shadow-xl overflow-hidden max-h-[420px] overflow-y-auto py-1",
          className
        )}
        role="listbox"
      >
        {showRecent ? (
          <div>
            <GroupHeader label="Recent searches" />
            {flat.map((item, idx) =>
              item.kind === "recent" ? (
                <button
                  key={`r-${item.data}-${idx}`}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectRecent(item.data)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
                    activeIndex === idx ? "bg-primary/10" : "hover:bg-muted"
                  )}
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm text-foreground">{item.data}</span>
                </button>
              ) : null
            )}
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            )}
            {authorsFirst ? (
              <>
                {authorsBlock}
                {papersBlock}
              </>
            ) : (
              <>
                {papersBlock}
                {authorsBlock}
              </>
            )}
            <div className="flex items-center gap-1.5 px-3 py-2 mt-1 border-t border-border text-[11px] text-muted-foreground">
              <Search className="h-3 w-3" />
              Press Enter to search “{trimmed}”
            </div>
          </>
        )}
      </div>
    );
  }
);
