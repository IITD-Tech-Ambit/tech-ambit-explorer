import { ChevronDown, ChevronLeft, ChevronRight, Loader2, UserCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Header ──────────────────────────────────────────────────────────────────

export function PeopleSectionHeader({
  count,
  isOpen,
  onToggle,
}: {
  count: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const toggleBtn = (
    <button
      type="button"
      onClick={onToggle}
      title={isOpen ? "Collapse People Sidebar" : "Expand People Sidebar"}
      aria-label={isOpen ? "Collapse People Sidebar" : "Expand People Sidebar"}
      className={cn(
        "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors touch-manipulation",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        !isOpen && "xl:bg-transparent bg-muted/50",
      )}
    >
      <ChevronDown
        className={cn(
          "h-5 w-5 text-muted-foreground transition-transform duration-200 xl:hidden",
          isOpen && "rotate-180",
        )}
      />
      {isOpen ? (
        <ChevronLeft className="hidden xl:block h-5 w-5 text-muted-foreground" />
      ) : (
        <ChevronRight className="hidden xl:block h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );

  const titleBlock = (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
      <div
        className={cn(
          "flex items-center justify-center shrink-0 rounded-xl bg-primary/10",
          isOpen ? "w-8 h-8" : "w-10 h-10",
        )}
      >
        <Users className={cn("text-primary", isOpen ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className={cn("font-bold text-foreground truncate", isOpen ? "text-xl" : "text-base sm:text-lg")}>
            People
          </h2>
          {count > 0 && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] sm:text-xs font-semibold tabular-nums">
              {count}
            </span>
          )}
        </div>
        {!isOpen && count > 0 && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
            Tap to browse · {count} matched
          </p>
        )}
      </div>
    </div>
  );

  if (!isOpen) {
    return (
      <div className="shrink-0 space-y-3 mb-1 xl:mb-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "xl:hidden w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3",
            "border-border/60 bg-card/80 shadow-sm hover:border-primary/25 hover:bg-card",
            "transition-all duration-200 touch-manipulation text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
          aria-expanded={false}
        >
          {titleBlock}
          {toggleBtn}
        </button>
        <div className="hidden xl:flex justify-center pb-2">{toggleBtn}</div>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 mb-2 border-b border-border pb-4 pr-4">
      <div className="flex items-center gap-2 min-w-0 flex-1">{titleBlock}</div>
      {toggleBtn}
    </div>
  );
}

// ── Faculty row — classic bullet list (no avatars) ──────────────────────────

export function PeopleFacultyRow({
  name,
  paperCount,
  isSelected,
  onSelect,
  onViewProfile,
}: {
  name: string;
  paperCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onViewProfile: () => void;
}) {
  return (
    <li className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "text-sm text-left flex flex-1 min-w-0 items-start justify-between transition-colors rounded-md px-1 -mx-1 touch-manipulation",
          isSelected ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary",
        )}
      >
        <div className="flex items-start min-w-0">
          <span className="shrink-0 mr-2 mt-[2px]">•</span>
          <span className="truncate">{name}</span>
        </div>
        <span
          className={cn(
            "text-xs ml-2 shrink-0 rounded-full px-2 py-0.5 tabular-nums",
            isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {paperCount}
        </span>
      </button>
      <button
        type="button"
        title="View profile"
        aria-label={`View profile for ${name}`}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
        onClick={onViewProfile}
      >
        <UserCircle className="h-4 w-4" />
      </button>
    </li>
  );
}

export function PeopleDepartmentBlock({
  department,
  count,
  children,
}: {
  department: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          {department}{" "}
          <span className="text-xs font-normal text-muted-foreground ml-1">({count})</span>
        </h3>
      </div>
      <ul className="space-y-2 pl-4">{children}</ul>
    </div>
  );
}

export function PeopleListContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex-1 min-h-0 space-y-4 pr-1 scrollbar-thin overflow-y-auto",
        "max-h-[min(460px,55vh)] sm:max-h-[min(520px,60vh)] xl:max-h-none",
      )}
    >
      {children}
    </div>
  );
}

export function PeopleLoadingState({ label = "Loading all faculty..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function PeopleEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-10 bg-accent-light border border-accent rounded-lg px-4">
      <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function PeopleLoadMoreSentinel({
  sentinelRef,
  isLoading,
}: {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
}) {
  return (
    <div ref={sentinelRef} className="flex items-center justify-center py-4 h-12">
      {isLoading && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs text-muted-foreground">Loading more...</span>
        </>
      )}
    </div>
  );
}
