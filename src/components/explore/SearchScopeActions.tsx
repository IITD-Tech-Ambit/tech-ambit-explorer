import { Layers, Search } from "lucide-react";
import { HoverSlideText } from "@/components/explore/HoverSlideText";
import { cn } from "@/lib/utils";

interface SearchScopeActionsProps {
  query: string;
  currentTerm: string;
  resultCount?: number;
  withinByDefault: boolean;
  allLabel: string;
  onSearchAll: () => void;
  onSearchWithin: () => void;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function SearchScopeActions({
  query,
  currentTerm,
  resultCount,
  withinByDefault,
  allLabel,
  onSearchAll,
  onSearchWithin,
}: SearchScopeActionsProps) {
  const rowClass =
    "group/slide w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-lg transition-colors hover:bg-muted";
  return (
    <div className="sticky -bottom-1 mt-1 border-t border-border bg-popover p-1">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSearchAll}
        className={cn(rowClass, !withinByDefault && "bg-muted/60")}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <HoverSlideText text={`Search ${allLabel} for “${query}”`} className="flex-1">
          Search {allLabel} for <span className="font-semibold">“{query}”</span>
        </HoverSlideText>
        <Kbd>{withinByDefault ? "⇧ Enter" : "Enter"}</Kbd>
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSearchWithin}
        className={cn(rowClass, withinByDefault && "bg-primary/10")}
      >
        <Layers className="h-4 w-4 shrink-0 text-primary" />
        <HoverSlideText
          text={`Search “${query}” within “${currentTerm}”${resultCount ? ` · ${resultCount.toLocaleString()} results` : ""}`}
          className="flex-1"
        >
          Search <span className="font-semibold">“{query}”</span> within{" "}
          <span className="font-semibold text-primary">“{currentTerm}”</span>
          {resultCount ? (
            <span className="text-muted-foreground"> · {resultCount.toLocaleString()} results</span>
          ) : null}
        </HoverSlideText>
        <Kbd>{withinByDefault ? "Enter" : "⇧ Enter"}</Kbd>
      </button>
    </div>
  );
}
