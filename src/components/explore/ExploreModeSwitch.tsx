import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Tab pair switching between Scopus papers and IP/Patents explore. */
export function ExploreModeSwitch({ active }: { active: "papers" | "ip" }) {
  return (
    <div
      role="tablist"
      aria-label="Explore mode"
      className="flex w-full max-w-none items-stretch gap-1 rounded-xl border border-primary/15 bg-muted/30 p-1 animate-fade-in"
    >
      <Link
        to="/explore"
        role="tab"
        aria-selected={active === "papers"}
        className={cn(
          "relative flex flex-1 min-w-0 items-center justify-center px-3 py-2 sm:py-2.5 rounded-lg",
          "text-sm sm:text-base font-semibold transition-all duration-200 text-center",
          "text-primary hover:bg-primary/10",
          active === "papers" && "bg-primary/10 shadow-sm",
        )}
      >
        Research Papers
        {active === "papers" && (
          <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full sm:left-6 sm:right-6" />
        )}
      </Link>
      <Link
        to="/explore/ip"
        role="tab"
        aria-selected={active === "ip"}
        className={cn(
          "relative flex flex-1 min-w-0 items-center justify-center gap-1.5 flex-wrap px-3 py-2 sm:py-2.5 rounded-lg",
          "text-sm sm:text-base font-semibold transition-all duration-200 text-center",
          "text-primary hover:bg-primary/10",
          active === "ip" && "bg-primary/10 shadow-sm",
        )}
      >
        Patents &amp; IP
        <span className="inline-flex items-center rounded-full bg-accent/20 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-accent leading-normal shrink-0">
          New
        </span>
        {active === "ip" && (
          <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full sm:left-6 sm:right-6" />
        )}
      </Link>
    </div>
  );
}
