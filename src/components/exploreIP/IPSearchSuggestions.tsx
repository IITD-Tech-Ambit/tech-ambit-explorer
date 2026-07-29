import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Search, UserCircle, Award, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IPSuggestResponse, SuggestIPInventor, SuggestIPDocument, SuggestIPDepartment, IPSuggestIntent } from "@/lib/api/types";

export interface IPSearchSuggestionsHandle {
  /** Returns true if the key was handled (Arrow/Enter/Esc on an item), so the input skips its default. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => boolean;
}

type FlatItem =
  | { kind: "inventor"; data: SuggestIPInventor }
  | { kind: "document"; data: SuggestIPDocument }
  | { kind: "department"; data: SuggestIPDepartment };

interface IPSearchSuggestionsProps {
  query: string;
  data?: IPSuggestResponse;
  isLoading: boolean;
  onSelectInventor: (inventor: SuggestIPInventor) => void;
  onSelectDocument: (document: SuggestIPDocument) => void;
  onSelectDepartment: (department: SuggestIPDepartment) => void;
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
    { query, data, isLoading, onSelectInventor, onSelectDocument, onSelectDepartment, onClose, className },
    ref
  ) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);

    const trimmed = query.trim();
    const tooShort = trimmed.length < 2;

    const inventors = useMemo(() => data?.groups?.inventors ?? [], [data]);
    const documents = useMemo(() => data?.groups?.documents ?? [], [data]);
    const departments = useMemo(() => data?.groups?.departments ?? [], [data]);
    const intent: IPSuggestIntent = data?.intent ?? "mixed";
    const inventorsFirst = intent !== "document";

    // Departments are a fast "browse" shortcut, not part of the inventor/document intent
    // ranking, so they always lead when present.
    const flat = useMemo<FlatItem[]>(() => {
      if (tooShort) return [];
      const departmentItems: FlatItem[] = departments.map((d) => ({ kind: "department", data: d }));
      const inventorItems: FlatItem[] = inventors.map((a) => ({ kind: "inventor", data: a }));
      const documentItems: FlatItem[] = documents.map((p) => ({ kind: "document", data: p }));
      return inventorsFirst
        ? [...departmentItems, ...inventorItems, ...documentItems]
        : [...departmentItems, ...documentItems, ...inventorItems];
    }, [tooShort, departments, inventors, documents, inventorsFirst]);

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
      else if (item.kind === "document") onSelectDocument(item.data);
      else onSelectDepartment(item.data);
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
              return false;
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

    const hasContent = inventors.length > 0 || documents.length > 0 || departments.length > 0;
    if (!isLoading && !hasContent) {
      return (
        <div className={cn("rounded-xl border border-border bg-popover shadow-xl p-4 text-sm text-muted-foreground", className)}>
          No matches for “{trimmed}”. Press Enter to search anyway.
        </div>
      );
    }

    // Index offsets so departments/inventors/documents map back into the flat keyboard list.
    // Departments always lead (see `flat` above).
    const inventorsOffset = departments.length + (inventorsFirst ? 0 : documents.length);
    const documentsOffset = departments.length + (inventorsFirst ? inventors.length : 0);

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
          {a.is_faculty && a.department && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Award className="h-3 w-3 shrink-0" />
              <span className="truncate">{a.department}</span>
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

    const renderDepartmentRow = (d: SuggestIPDepartment, flatIdx: number) => (
      <button
        key={`dept-${d.name}-${flatIdx}`}
        type="button"
        data-idx={flatIdx}
        onMouseEnter={() => setActiveIndex(flatIdx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelectDepartment(d)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
          activeIndex === flatIdx ? "bg-primary/10" : "hover:bg-muted"
        )}
      >
        <span className="h-8 w-8 rounded-full bg-accent/40 flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-accent-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {highlightPrefix(d.name, trimmed)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Browse {d.count.toLocaleString()} patent{d.count === 1 ? "" : "s"}
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

    const departmentsBlock = departments.length > 0 && (
      <div>
        <GroupHeader label="Departments" />
        {departments.map((d, i) => renderDepartmentRow(d, i))}
      </div>
    );
    const inventorsBlock = inventors.length > 0 && (
      <div>
        <GroupHeader label="Inventors" hint={intent === "inventor" ? INTENT_HINT.inventor : undefined} />
        {inventors.map((a, i) => renderInventorRow(a, inventorsOffset + i))}
      </div>
    );
    const documentsBlock = documents.length > 0 && (
      <div>
        <GroupHeader label="Documents" hint={intent === "document" ? INTENT_HINT.document : undefined} />
        {documents.map((p, i) => renderDocumentRow(p, documentsOffset + i))}
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
        {departmentsBlock}
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
