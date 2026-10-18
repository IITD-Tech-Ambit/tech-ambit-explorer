import { Layers, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchWithinButtonProps {
  onClick: () => void;
  hint: boolean;
  onDismissHint: () => void;
}

export function SearchWithinButton({ onClick, hint, onDismissHint }: SearchWithinButtonProps) {
  return (
    <div className="relative shrink-0">
      <Button
        variant="outline"
        size="sm"
        className={cn("h-8 gap-1.5", hint && "border-primary/60 text-primary ring-2 ring-primary/20")}
        onClick={onClick}
      >
        <Layers className="h-3.5 w-3.5" />
        Search within results
      </Button>
      {hint && (
        <div
          role="status"
          className="absolute right-0 top-full mt-2.5 z-30 w-60 rounded-lg border border-primary/20 bg-card px-3 py-2.5 shadow-lg animate-fade-in"
        >
          <span className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t border-primary/20 bg-card" />
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="flex-1 text-xs text-foreground">Too many results? Search within them to narrow down.</p>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label="Dismiss tip"
              className="-mr-1 -mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
