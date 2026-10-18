import { forwardRef, type KeyboardEvent } from "react";
import { Layers, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverSlideText } from "@/components/explore/HoverSlideText";
import { cn } from "@/lib/utils";

interface ExploreSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  placeholder: string;
  isLoading: boolean;
  expanded: boolean;
  /** Term whose results the next search narrows; null searches everything. */
  scopeTerm: string | null;
  onClearScope: () => void;
}

export const ExploreSearchField = forwardRef<HTMLInputElement, ExploreSearchFieldProps>(function ExploreSearchField(
  { value, onChange, onFocus, onKeyDown, onSubmit, placeholder, isLoading, expanded, scopeTerm, onClearScope },
  ref,
) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && scopeTerm && !value && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      onClearScope();
      return;
    }
    onKeyDown(e);
  };

  return (
    <div
      className={cn(
        "group/slide flex items-center gap-2 h-14 w-full rounded-xl border-2 bg-background pl-4 pr-2 transition-colors focus-within:border-primary",
        scopeTerm ? "border-primary/50" : "border-input",
      )}
    >
      {scopeTerm ? (
        <span className="inline-flex items-center gap-1.5 min-w-0 max-w-[50%] shrink-0 rounded-lg bg-primary/10 border border-primary/20 pl-2 pr-1 py-1 text-sm font-medium text-primary animate-fade-in group/slide">
          <Layers className="h-4 w-4 shrink-0" />
          <HoverSlideText text={`in “${scopeTerm}”`} />
          <button
            type="button"
            onClick={onClearScope}
            title="Search all instead"
            aria-label={`Stop searching within "${scopeTerm}"`}
            className="shrink-0 rounded-md p-0.5 hover:bg-primary/15 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <Search className="h-5 w-5 shrink-0 text-foreground/60" />
      )}
      <div className="relative flex-1 min-w-0 h-full">
        <input
          ref={ref}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={expanded}
          className="w-full h-full bg-transparent text-base text-foreground placeholder:text-transparent motion-reduce:placeholder:text-muted-foreground focus:outline-none"
        />
        {!value && (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden motion-reduce:hidden">
            <HoverSlideText text={placeholder} className="w-full text-base text-muted-foreground" />
          </span>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Clear input"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <Button
        onClick={onSubmit}
        disabled={isLoading}
        size="icon"
        className="shrink-0"
        aria-label={scopeTerm ? `Search within "${scopeTerm}"` : "Search"}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      </Button>
    </div>
  );
});
