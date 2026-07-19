import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Tab pair switching between Scopus papers and IP/Patents explore. */
export function ExploreModeSwitch({ active }: { active: "papers" | "ip" }) {
  return (
    <div role="tablist" aria-label="Explore mode" className="inline-flex items-center gap-1 animate-fade-in">
      <Link
        to="/explore"
        role="tab"
        aria-selected={active === "papers"}
        className={cn(
          "relative px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200",
          active === "papers"
            ? "text-primary bg-primary/8"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        )}
      >
        Research Papers
        {active === "papers" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
      </Link>
      <span className="text-border">/</span>
      <Link
        to="/explore/ip"
        role="tab"
        aria-selected={active === "ip"}
        className={cn(
          "relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200",
          active === "ip"
            ? "text-primary bg-primary/8"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        )}
      >
        Patents &amp; IP
        <span className="inline-flex items-center rounded-full bg-accent/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-accent leading-normal">
          New
        </span>
        {active === "ip" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
      </Link>
    </div>
  );
}
