import { Layers } from "lucide-react";

/** One-line hint that searches can be nested (each search narrows the previous results). */
export function NestedSearchHint({ currentTerm }: { currentTerm?: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
      <Layers className="h-4 w-4 text-primary shrink-0" />
      {currentTerm ? (
        <span>
          <span className="font-semibold text-primary">Nested search:</span> your next search will look only inside
          the results for <span className="font-semibold text-primary">"{currentTerm}"</span>.
        </span>
      ) : (
        <span>
          <span className="font-semibold text-primary">Nested search:</span> after you search, search again to narrow
          down within those results.
        </span>
      )}
    </p>
  );
}
