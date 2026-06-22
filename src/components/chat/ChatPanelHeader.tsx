import { ChevronDown, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelHeaderProps {
  hasMessages: boolean;
  onClear: () => void;
  onClose: () => void;
  /** Show integrated drag handle (mobile bottom sheet). */
  showDragHandle?: boolean;
}

const iconBtn =
  "flex items-center justify-center rounded-xl transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export default function ChatPanelHeader({
  hasMessages,
  onClear,
  onClose,
  showDragHandle = false,
}: ChatPanelHeaderProps) {
  return (
    <header
      className={cn(
        "flex-shrink-0 sticky top-0 z-10 w-full",
        "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "border-b border-border/50",
      )}
    >
      {showDragHandle && (
        <div
          className="flex justify-center pt-2 pb-0.5 md:hidden"
          aria-hidden
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
      )}

      <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 md:py-3 min-w-0">
        {/* Brand icon */}
        <div
          className={cn(
            "flex items-center justify-center flex-shrink-0 rounded-xl",
            "bg-gradient-to-br from-indigo-600 to-violet-600",
            "shadow-[0_4px_14px_-3px_rgba(99,102,241,0.5)]",
            showDragHandle ? "w-9 h-9" : "w-8 h-8 md:w-9 md:h-9",
          )}
        >
          <Sparkles className={cn("text-white", showDragHandle ? "w-4 h-4" : "w-3.5 h-3.5")} />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2
              className={cn(
                "font-semibold text-foreground truncate leading-tight",
                showDragHandle ? "text-[15px] sm:text-base" : "text-[13px] md:text-sm",
              )}
            >
              Research Assistant
            </h2>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 leading-none">
              Beta
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="truncate">
              <span className="sm:hidden">IIT Delhi Research</span>
              <span className="hidden sm:inline">IIT Delhi · RAG-powered</span>
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {hasMessages && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear conversation"
              title="Clear"
              className={cn(
                iconBtn,
                "text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10",
                showDragHandle ? "w-10 h-10" : "w-8 h-8 md:w-9 md:h-9",
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className={cn(
              iconBtn,
              "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70",
              showDragHandle ? "w-10 h-10" : "w-8 h-8 md:w-9 md:h-9",
            )}
          >
            <X className="w-4 h-4 md:hidden" />
            <ChevronDown className="hidden md:block w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
