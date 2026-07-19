import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Search, UserCircle, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IPSuggestResponse, SuggestIPInventor, SuggestIPDocument, IPSuggestIntent } from "@/lib/api/types";

/**
 * IP/patent typeahead dropdown. Mirrors `SearchSuggestions.tsx` (Scopus explore) exactly in
 * styling, debounce, keyboard nav, and click behavior -- sourced from `ip_documents`
 * (inventors + documents) instead of authors_suggest/research_documents. There is no
 * "recent searches" fallback here (the IP explore page has no search-history feature yet):
 * short queries simply render nothing, same as an empty match set would.
 */
export interface IPSearchSuggestionsHandle {
  /** Returns true if the key was handled (Arrow/Enter/Esc on an item), so the input skips its default. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => boolean;
}

type FlatItem =
  | { kind: "inventor"; data: SuggestIPInventor }
  | { kind: "document"; data: SuggestIPDocument };

interface IPSearchSuggestionsProps {
  query: string;
  data?: IPSuggestResponse;
  isLoading: boolean;
  onSelectInventor: (inventor: SuggestIPInventor) => void;
  onSelectDocument: (document: SuggestIPDocument) => void;
  onClose: () => void;
  className?: string;
}

const INTENT_HINT: Record<IPSuggestIntent, string> = {
  inventor: "Looks like an inventor",
  document: "Looks like a document",
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

export const IPSearchSuggestions = forwardRef<IPSearchSuggestionsHandle, IPSearchSuggestionsProps>(
  function IPSearchSuggestions(
    { query, data, isLoading, onSelectInventor, onSelectDocument, onClose, className },
    ref
  ) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);

    const trimmed = query.trim();
    const tooShort = trimmed.length < 2;

    const inventors = useMemo(() => data?.groups.inventors ?? [], [data]);
    const documents = useMemo(() => data?.groups.documents ?? [], [data]);
    const intent: IPSuggestIntent = data?.intent ?? "mixed";
    const inventorsFirst = intent !== "document";

    const flat = useMemo<FlatItem[]>(() => {
      if (tooShort) return [];
      const inventorItems: FlatItem[] = inventors.map((a) => ({ kind: "inventor", data: a }));
      const documentItems: FlatItem[] = documents.map((p) => ({ kind: "document", data: p }));
      return inventorsFirst ? [...inventorItems, ...documentItems] : [...documentItems, ...inventorItems];
    }, [tooShort, inventors, documents, inventorsFirst]);

    useEffect(() => {
      setActiveIndex(-1);
    }, [trimmed, flat.length]);

    useEffect(() => {
      if (activeIndex < 0 || !listRef.current) return;
      const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const selectItem = (item: FlatItem) => {
      if (item.kind === "inventor") onSelectInventor(item.data);
      else onSelectDocument(item.data);
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

    if (tooShort) return null;

    const hasContent = inventors.length > 0 || documents.length > 0;
    if (!isLoading && !hasContent) {
      return (
        <div className={cn("rounded-xl border border-border bg-popover shadow-xl p-4 text-sm text-muted-foreground", className)}>
          No matches for “{trimmed}”. Press Enter to search anyway.
        </div>
      );
    }

    // Index offsets so inventors/documents map back into the flat keyboard list.
    const firstGroupLen = inventorsFirst ? inventors.length : documents.length;

    const renderInventorRow = (a: SuggestIPInventor, flatIdx: number) => (
      <button
        key={`inv-${a.id}-${flatIdx}`}
        type="button"
        data-idx={flatIdx}
        onMouseEnter={() => setActiveIndex(flatIdx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelectInventor(a)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
          activeIndex === flatIdx ? "bg-primary/10" : "hover:bg-muted"
        )}
      >
        <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <UserCircle className="h-5 w-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {highlightPrefix(a.name, trimmed)}
          </span>
          {a.is_faculty && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              IIT Delhi Faculty
            </span>
          )}
        </span>
      </button>
    );

    const renderDocumentRow = (p: SuggestIPDocument, flatIdx: number) => (
      <button
        key={`doc-${p.id}-${flatIdx}`}
        type="button"
        data-idx={flatIdx}
        onMouseEnter={() => setActiveIndex(flatIdx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelectDocument(p)}
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
            {[p.lead_inventor, p.year ? String(p.year) : ""].filter(Boolean).join(" · ")}
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

    const inventorsBlock = inventors.length > 0 && (
      <div>
        <GroupHeader label="Inventors" hint={intent === "inventor" ? INTENT_HINT.inventor : undefined} />
        {inventors.map((a, i) => renderInventorRow(a, inventorsFirst ? i : firstGroupLen + i))}
      </div>
    );
    const documentsBlock = documents.length > 0 && (
      <div>
        <GroupHeader label="Documents" hint={intent === "document" ? INTENT_HINT.document : undefined} />
        {documents.map((p, i) => renderDocumentRow(p, inventorsFirst ? inventors.length + i : i))}
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
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        )}
        {inventorsFirst ? (
          <>
            {inventorsBlock}
            {documentsBlock}
          </>
        ) : (
          <>
            {documentsBlock}
            {inventorsBlock}
          </>
        )}
        <div className="flex items-center gap-1.5 px-3 py-2 mt-1 border-t border-border text-[11px] text-muted-foreground">
          <Search className="h-3 w-3" />
          Press Enter to search “{trimmed}”
        </div>
      </div>
    );
  }
);
